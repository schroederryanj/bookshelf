import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  mockPrismaClient,
  resetPrismaMocks,
  createMockBook,
} from '../mocks/prisma';
import { createMockTwilioMessage } from '../mocks/twilio';

// Mock Prisma before importing
vi.mock('@/lib/prisma', () => ({
  prisma: mockPrismaClient,
}));

// Import functions after mocking
import { GET } from '@/app/api/sms/webhook/route';
import {
  processMessage,
  processTwilioWebhook,
  formatTwiMLResponse,
  clearContext,
} from '@/lib/sms/orchestrator';

describe('SMS Webhook Integration', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('processTwilioWebhook', () => {
    it('should return TwiML response for help message', async () => {
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

    it('should handle progress update message', async () => {
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

      const webhookData = createMockTwilioMessage({
        Body: 'page 150',
        From: '+15551234567',
      });

      const result = await processTwilioWebhook(webhookData);

      expect(result).toContain('Test Book');
      expect(result).toContain('150');
    });

    it('should handle start book message', async () => {
      const mockBook = createMockBook({ id: 1, title: 'New Book', pages: 200 });

      mockPrismaClient.book.findFirst.mockResolvedValue(mockBook);
      mockPrismaClient.readingProgress.findFirst.mockResolvedValue(null);
      mockPrismaClient.readingProgress.upsert.mockResolvedValue({
        id: 1,
        bookId: 1,
        status: 'READING',
      });

      const webhookData = createMockTwilioMessage({
        Body: 'start New Book',
        From: '+15551234567',
      });

      const result = await processTwilioWebhook(webhookData);

      expect(result).toContain('Started reading');
    });

    it('should handle unknown messages gracefully', async () => {
      const webhookData = createMockTwilioMessage({
        Body: 'xyzabc123 qwerty',
        From: '+15551234567',
      });

      const result = await processTwilioWebhook(webhookData);

      // TwiML escapes apostrophes as &apos;
      expect(result).toContain('understand');
      expect(result).toContain('help');
    });

    it('should handle database errors', async () => {
      mockPrismaClient.readingProgress.findFirst.mockRejectedValue(
        new Error('Database connection failed')
      );

      const webhookData = createMockTwilioMessage({
        Body: 'page 100',
        From: '+15551234567',
      });

      const result = await processTwilioWebhook(webhookData);

      expect(result).toContain('error');
    });
  });

  describe('formatTwiMLResponse', () => {
    it('should escape XML special characters in response', () => {
      const result = formatTwiMLResponse('Book <With> "Special" & Chars');

      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).toContain('&amp;');
      expect(result).toContain('&quot;');
    });
  });

  describe('GET /api/sms/webhook', () => {
    it('should return health check response', async () => {
      const response = await GET();

      expect(response.status).toBe(200);

      const body = await response.text();
      expect(body).toContain('active');
    });
  });

  describe('End-to-End Reading Flow', () => {
    it('should handle complete reading journey', async () => {
      const phoneNumber = '+15559999999';
      const mockBook = createMockBook({ id: 1, title: 'E2E Test Book', pages: 100 });

      // Clear any previous context
      clearContext(phoneNumber);

      // Step 1: User asks for help
      let result = await processMessage('help', phoneNumber);
      expect(result.message).toContain('Bookshelf SMS Commands');

      // Step 2: User starts a book
      mockPrismaClient.book.findFirst.mockResolvedValue(mockBook);
      mockPrismaClient.readingProgress.findFirst.mockResolvedValue(null);
      mockPrismaClient.readingProgress.upsert.mockResolvedValue({
        id: 1,
        bookId: 1,
        status: 'READING',
        currentPage: 0,
        progressPercent: 0,
      });

      result = await processMessage('start E2E Test Book', phoneNumber);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Started reading');
      expect(result.message).toContain('E2E Test Book');

      // Step 3: User updates progress to 50%
      const progressAt50 = {
        id: 1,
        bookId: 1,
        currentPage: 0,
        progressPercent: 0,
        totalPages: 100,
        status: 'READING',
        book: mockBook,
      };

      mockPrismaClient.readingProgress.findFirst.mockResolvedValue(progressAt50);
      mockPrismaClient.readingProgress.update.mockResolvedValue({
        ...progressAt50,
        currentPage: 50,
        progressPercent: 50,
      });

      result = await processMessage('page 50', phoneNumber);
      expect(result.success).toBe(true);
      expect(result.message).toContain('50');

      // Step 4: User checks status
      mockPrismaClient.readingProgress.findFirst.mockResolvedValue({
        ...progressAt50,
        currentPage: 50,
        progressPercent: 50,
      });

      result = await processMessage('status', phoneNumber);
      expect(result.success).toBe(true);
      expect(result.message).toContain('E2E Test Book');
      expect(result.message).toContain('50%');

      // Step 5: User finishes book
      mockPrismaClient.readingProgress.findFirst.mockResolvedValue({
        ...progressAt50,
        currentPage: 50,
        progressPercent: 50,
      });
      mockPrismaClient.readingProgress.update.mockResolvedValue({
        ...progressAt50,
        status: 'COMPLETED',
        progressPercent: 100,
        currentPage: 100,
      });

      result = await processMessage('finished', phoneNumber);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Congratulations');

      // Step 6: User checks stats - help message is stateless
      result = await processMessage('help', phoneNumber);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Bookshelf SMS Commands');
    });

    it('should process messages from different phone numbers independently', async () => {
      const user1 = '+15551111111';
      const user2 = '+15552222222';
      const mockBook1 = createMockBook({ id: 1, title: 'Book One', pages: 100 });
      const mockBook2 = createMockBook({ id: 2, title: 'Book Two', pages: 200 });

      // Clear contexts
      clearContext(user1);
      clearContext(user2);

      // User 1 starts Book One
      mockPrismaClient.book.findFirst.mockResolvedValueOnce(mockBook1);
      mockPrismaClient.readingProgress.findFirst.mockResolvedValueOnce(null);
      mockPrismaClient.readingProgress.upsert.mockResolvedValueOnce({
        id: 1,
        bookId: 1,
        status: 'READING',
      });

      const result1 = await processMessage('start Book One', user1);
      expect(result1.success).toBe(true);
      expect(result1.message).toContain('Book One');

      // User 2 starts Book Two
      mockPrismaClient.book.findFirst.mockResolvedValueOnce(mockBook2);
      mockPrismaClient.readingProgress.findFirst.mockResolvedValueOnce(null);
      mockPrismaClient.readingProgress.upsert.mockResolvedValueOnce({
        id: 2,
        bookId: 2,
        status: 'READING',
      });

      const result2 = await processMessage('start Book Two', user2);
      expect(result2.success).toBe(true);
      expect(result2.message).toContain('Book Two');
    });
  });

  describe('Security', () => {
    it('should not expose internal errors to users', async () => {
      mockPrismaClient.readingProgress.findFirst.mockRejectedValue(
        new Error('SENSITIVE: Database credentials exposed')
      );

      const result = await processMessage('page 100', '+15551234567');

      expect(result.message).not.toContain('SENSITIVE');
      expect(result.message).not.toContain('credentials');
      expect(result.message).toContain('error');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle rapid sequential requests', async () => {
      const phoneNumber = '+15551234567';

      // Send 10 help requests rapidly
      const promises = Array.from({ length: 10 }, () =>
        processMessage('help', phoneNumber)
      );

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((result) => {
        expect(result.success).toBe(true);
        expect(result.message).toContain('Bookshelf SMS Commands');
      });
    });
  });
});
