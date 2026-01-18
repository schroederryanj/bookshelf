import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  mockPrismaClient,
  resetPrismaMocks,
  createMockBook,
} from '../mocks/prisma';

// Mock Prisma before importing orchestrator
vi.mock('@/lib/prisma', () => ({
  prisma: mockPrismaClient,
}));

// Import orchestrator after mocking
import {
  processMessage,
  processTwilioWebhook,
  formatTwiMLResponse,
  validateTwilioSignature,
  getContext,
  updateContext,
  clearContext,
  __testing__,
} from '@/lib/sms/orchestrator';
import { createMockTwilioMessage } from '../mocks/twilio';

describe('SMS Orchestrator', () => {
  beforeEach(() => {
    resetPrismaMocks();
    // Clear context store between tests
    __testing__.contextStore.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('processMessage', () => {
    it('should process a valid update progress message', async () => {
      const mockBook = createMockBook({ id: 1, title: 'Test Book', pages: 300 });
      const mockProgress = {
        id: 1,
        bookId: 1,
        currentPage: 50,
        progressPercent: 16.67,
        totalPages: 300,
        status: 'READING',
        book: mockBook,
      };

      mockPrismaClient.readingProgress.findFirst.mockResolvedValue(mockProgress);
      mockPrismaClient.readingProgress.update.mockResolvedValue({
        ...mockProgress,
        currentPage: 150,
        progressPercent: 50,
      });

      const result = await processMessage('page 150', '+15551234567');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Test Book');
    });

    it('should process a help message', async () => {
      const result = await processMessage('help', '+15551234567');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Bookshelf SMS Commands');
    });

    it('should handle unknown messages', async () => {
      const result = await processMessage('xyzabc123 qwerty', '+15551234567');

      expect(result.success).toBe(false);
      expect(result.message).toContain("didn't understand");
    });

    it('should update context after successful operation', async () => {
      const mockBook = createMockBook({ id: 1, title: 'Context Book', pages: 200 });
      mockPrismaClient.book.findFirst.mockResolvedValue(mockBook);
      mockPrismaClient.readingProgress.findFirst.mockResolvedValue(null);
      mockPrismaClient.readingProgress.upsert.mockResolvedValue({
        id: 1,
        bookId: 1,
        status: 'READING',
      });

      await processMessage('start Context Book', '+15551234567');

      const context = getContext('+15551234567');
      expect(context).toBeDefined();
      expect(context?.lastIntent).toBe('start_book');
      expect(context?.lastBookId).toBe(1);
    });

    it('should use context for subsequent messages', async () => {
      // First, set up context
      updateContext('+15551234567', {
        lastBookId: 5,
        lastIntent: 'start_book',
      });

      const mockBook = createMockBook({ id: 5, title: 'Context Book', pages: 300 });
      const mockProgress = {
        id: 1,
        bookId: 5,
        currentPage: 0,
        progressPercent: 0,
        totalPages: 300,
        status: 'READING',
        book: mockBook,
      };

      mockPrismaClient.readingProgress.findFirst.mockResolvedValue(mockProgress);
      mockPrismaClient.readingProgress.update.mockResolvedValue({
        ...mockProgress,
        currentPage: 100,
        progressPercent: 33.33,
      });

      await processMessage('page 100', '+15551234567');

      expect(mockPrismaClient.readingProgress.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { bookId: 5 },
        })
      );
    });

    it('should handle confirmation flow with yes', async () => {
      // Set up context awaiting confirmation
      updateContext('+15551234567', {
        lastBookId: 1,
        awaitingConfirmation: true,
        confirmationType: 'finish_book',
      });

      const mockBook = createMockBook({ id: 1, title: 'Finish Me', pages: 200 });
      const mockProgress = {
        id: 1,
        bookId: 1,
        status: 'READING',
        progressPercent: 90,
        currentPage: 180,
        book: mockBook,
      };

      mockPrismaClient.readingProgress.findFirst.mockResolvedValue(mockProgress);
      mockPrismaClient.readingProgress.update.mockResolvedValue({
        ...mockProgress,
        status: 'COMPLETED',
        progressPercent: 100,
      });

      const result = await processMessage('yes', '+15551234567');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Congratulations');
    });

    it('should handle confirmation flow with no', async () => {
      updateContext('+15551234567', {
        lastBookId: 1,
        awaitingConfirmation: true,
        confirmationType: 'finish_book',
      });

      const result = await processMessage('no', '+15551234567');

      expect(result.success).toBe(true);
      expect(result.message).toContain('cancelled');

      // Context should be cleared
      const context = getContext('+15551234567');
      expect(context).toBeUndefined();
    });
  });

  describe('processTwilioWebhook', () => {
    it('should process Twilio webhook and return TwiML', async () => {
      const webhookData = createMockTwilioMessage({
        Body: 'help',
        From: '+15551234567',
      });

      const result = await processTwilioWebhook(webhookData);

      expect(result).toContain('<?xml version="1.0"');
      expect(result).toContain('<Response>');
      expect(result).toContain('<Message>');
      expect(result).toContain('Bookshelf SMS Commands');
    });

    it('should handle errors gracefully', async () => {
      const webhookData = createMockTwilioMessage({
        Body: 'page 100',
        From: '+15551234567',
      });

      mockPrismaClient.readingProgress.findFirst.mockRejectedValue(new Error('DB error'));

      const result = await processTwilioWebhook(webhookData);

      expect(result).toContain('<?xml version="1.0"');
      // Handler returns its own error message, not the generic one
      expect(result).toContain('error');
    });
  });

  describe('formatTwiMLResponse', () => {
    it('should format message as valid TwiML', () => {
      const result = formatTwiMLResponse('Hello, World!');

      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain('<Response>');
      expect(result).toContain('<Message>Hello, World!</Message>');
      expect(result).toContain('</Response>');
    });

    it('should escape XML special characters', () => {
      const result = formatTwiMLResponse('Test <script> & "quotes"');

      expect(result).toContain('&lt;script&gt;');
      expect(result).toContain('&amp;');
      expect(result).toContain('&quot;quotes&quot;');
    });

    it('should handle multiline messages', () => {
      const result = formatTwiMLResponse('Line 1\nLine 2\nLine 3');

      expect(result).toContain('Line 1\nLine 2\nLine 3');
    });

    it('should handle empty message', () => {
      const result = formatTwiMLResponse('');

      expect(result).toContain('<Message></Message>');
    });
  });

  describe('Context Management', () => {
    describe('getContext', () => {
      it('should return undefined for new phone number', () => {
        const context = getContext('+15551234567');
        expect(context).toBeUndefined();
      });

      it('should return stored context', () => {
        updateContext('+15551234567', { lastBookId: 1 });

        const context = getContext('+15551234567');
        expect(context).toBeDefined();
        expect(context?.lastBookId).toBe(1);
      });

      it('should expire old context', () => {
        // Manually add expired context
        const expiredTimestamp = new Date(Date.now() - __testing__.CONTEXT_TIMEOUT - 1000);
        __testing__.contextStore.set('+15551234567', {
          phoneNumber: '+15551234567',
          lastBookId: 1,
          timestamp: expiredTimestamp,
        });

        const context = getContext('+15551234567');
        expect(context).toBeUndefined();
      });
    });

    describe('updateContext', () => {
      it('should create new context', () => {
        updateContext('+15551234567', { lastBookId: 1 });

        const context = getContext('+15551234567');
        expect(context?.lastBookId).toBe(1);
        expect(context?.phoneNumber).toBe('+15551234567');
      });

      it('should update existing context', () => {
        updateContext('+15551234567', { lastBookId: 1 });
        updateContext('+15551234567', { lastIntent: 'update_progress' });

        const context = getContext('+15551234567');
        expect(context?.lastBookId).toBe(1);
        expect(context?.lastIntent).toBe('update_progress');
      });

      it('should update timestamp on each update', async () => {
        updateContext('+15551234567', { lastBookId: 1 });
        const firstTimestamp = getContext('+15551234567')?.timestamp;

        // Wait a tiny bit
        await new Promise((r) => setTimeout(r, 10));

        updateContext('+15551234567', { lastBookId: 2 });
        const secondTimestamp = getContext('+15551234567')?.timestamp;

        expect(secondTimestamp?.getTime()).toBeGreaterThanOrEqual(firstTimestamp?.getTime() || 0);
      });
    });

    describe('clearContext', () => {
      it('should remove context for phone number', () => {
        updateContext('+15551234567', { lastBookId: 1 });
        expect(getContext('+15551234567')).toBeDefined();

        clearContext('+15551234567');
        expect(getContext('+15551234567')).toBeUndefined();
      });

      it('should not affect other phone numbers', () => {
        updateContext('+15551234567', { lastBookId: 1 });
        updateContext('+15559876543', { lastBookId: 2 });

        clearContext('+15551234567');

        expect(getContext('+15551234567')).toBeUndefined();
        expect(getContext('+15559876543')).toBeDefined();
      });
    });
  });

  describe('validateTwilioSignature', () => {
    it('should return false for missing signature', () => {
      const result = validateTwilioSignature('', 'http://example.com', {}, 'token');
      expect(result).toBe(false);
    });

    it('should return false for missing auth token', () => {
      const result = validateTwilioSignature('signature', 'http://example.com', {}, '');
      expect(result).toBe(false);
    });

    it('should return true when signature and token are present', () => {
      // Note: This is a placeholder test - in production, actual signature validation would be tested
      const result = validateTwilioSignature(
        'valid-signature',
        'http://example.com/webhook',
        { Body: 'test', From: '+1234567890' },
        'auth-token'
      );
      expect(result).toBe(true);
    });
  });

  describe('Full Message Flow', () => {
    it('should handle complete reading session flow', async () => {
      const phoneNumber = '+15551234567';
      const mockBook = createMockBook({ id: 1, title: 'Journey Book', pages: 300 });

      // Step 1: Start a book
      mockPrismaClient.book.findFirst.mockResolvedValue(mockBook);
      mockPrismaClient.readingProgress.findFirst.mockResolvedValue(null);
      mockPrismaClient.readingProgress.upsert.mockResolvedValue({
        id: 1,
        bookId: 1,
        status: 'READING',
        currentPage: 0,
        progressPercent: 0,
      });

      const startResult = await processMessage('start Journey Book', phoneNumber);
      expect(startResult.success).toBe(true);
      expect(startResult.message).toContain('Started reading');

      // Step 2: Update progress
      const mockProgress = {
        id: 1,
        bookId: 1,
        currentPage: 0,
        progressPercent: 0,
        totalPages: 300,
        status: 'READING',
        book: mockBook,
      };

      mockPrismaClient.readingProgress.findFirst.mockResolvedValue(mockProgress);
      mockPrismaClient.readingProgress.update.mockResolvedValue({
        ...mockProgress,
        currentPage: 150,
        progressPercent: 50,
      });

      const progressResult = await processMessage('page 150', phoneNumber);
      expect(progressResult.success).toBe(true);
      expect(progressResult.message).toContain('150');

      // Step 3: Check status
      mockPrismaClient.readingProgress.findFirst.mockResolvedValue({
        ...mockProgress,
        currentPage: 150,
        progressPercent: 50,
      });

      const statusResult = await processMessage('status', phoneNumber);
      expect(statusResult.success).toBe(true);
      expect(statusResult.message).toContain('50%');

      // Step 4: Finish book
      mockPrismaClient.readingProgress.findFirst.mockResolvedValue({
        ...mockProgress,
        currentPage: 150,
        progressPercent: 50,
      });
      mockPrismaClient.readingProgress.update.mockResolvedValue({
        ...mockProgress,
        status: 'COMPLETED',
        progressPercent: 100,
        currentPage: 300,
      });

      const finishResult = await processMessage('finished', phoneNumber);
      expect(finishResult.success).toBe(true);
      expect(finishResult.message).toContain('Congratulations');
    });

    it('should handle multiple users independently', async () => {
      const user1 = '+15551111111';
      const user2 = '+15552222222';

      // Set different contexts for each user
      updateContext(user1, { lastBookId: 1, lastBookTitle: 'Book One' });
      updateContext(user2, { lastBookId: 2, lastBookTitle: 'Book Two' });

      const context1 = getContext(user1);
      const context2 = getContext(user2);

      expect(context1?.lastBookId).toBe(1);
      expect(context2?.lastBookId).toBe(2);
      expect(context1?.lastBookTitle).toBe('Book One');
      expect(context2?.lastBookTitle).toBe('Book Two');
    });
  });

  describe('Error Recovery', () => {
    it('should continue working after database error', async () => {
      // First request fails
      mockPrismaClient.readingProgress.findFirst.mockRejectedValueOnce(new Error('DB error'));

      const errorResult = await processMessage('page 100', '+15551234567');
      expect(errorResult.success).toBe(false);

      // Second request should work (help doesn't need DB)
      const helpResult = await processMessage('help', '+15551234567');
      expect(helpResult.success).toBe(true);
    });

    it('should handle malformed messages gracefully', async () => {
      const testCases = [
        '',
        '   ',
        '\n\n\n',
        'a'.repeat(10000),
        '\u0000\u0001\u0002',
      ];

      for (const message of testCases) {
        const result = await processMessage(message, '+15551234567');
        expect(result).toBeDefined();
        expect(typeof result.message).toBe('string');
      }
    });
  });
});
