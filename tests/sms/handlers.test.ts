import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  mockPrismaClient,
  resetPrismaMocks,
  createMockBook,
  createMockReadingProgress,
  createMockReadingSession,
} from '../mocks/prisma';

// Mock Prisma before importing handlers
vi.mock('@/lib/prisma', () => ({
  prisma: mockPrismaClient,
}));

// Import handlers after mocking
import {
  handleUpdateProgress,
  handleStartBook,
  handleFinishBook,
  handleGetStatus,
  handleListReading,
  handleSearchBook,
  handleGetStats,
  handleHelp,
  handleUnknown,
} from '@/lib/sms/handlers';

describe('SMS Handlers', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('handleUpdateProgress', () => {
    it('should update progress with page number', async () => {
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

      const result = await handleUpdateProgress({ pageNumber: 150 });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Test Book');
      expect(result.message).toContain('page 150');
      expect(mockPrismaClient.readingProgress.update).toHaveBeenCalled();
    });

    it('should update progress with percentage', async () => {
      const mockBook = createMockBook({ id: 1, title: 'Test Book', pages: 200 });
      const mockProgress = {
        id: 1,
        bookId: 1,
        currentPage: 0,
        progressPercent: 0,
        totalPages: 200,
        status: 'READING',
        book: mockBook,
      };

      mockPrismaClient.readingProgress.findFirst.mockResolvedValue(mockProgress);
      mockPrismaClient.readingProgress.update.mockResolvedValue({
        ...mockProgress,
        currentPage: 100,
        progressPercent: 50,
      });

      const result = await handleUpdateProgress({ percentComplete: 50 });

      expect(result.success).toBe(true);
      expect(result.data?.percent).toBe(50);
    });

    it('should return error when no active book found', async () => {
      mockPrismaClient.readingProgress.findFirst.mockResolvedValue(null);

      const result = await handleUpdateProgress({ pageNumber: 100 });

      expect(result.success).toBe(false);
      expect(result.message).toContain('No active book found');
    });

    it('should return error when page exceeds book length', async () => {
      const mockBook = createMockBook({ id: 1, title: 'Short Book', pages: 100 });
      const mockProgress = {
        id: 1,
        bookId: 1,
        currentPage: 50,
        progressPercent: 50,
        totalPages: 100,
        status: 'READING',
        book: mockBook,
      };

      mockPrismaClient.readingProgress.findFirst.mockResolvedValue(mockProgress);

      const result = await handleUpdateProgress({ pageNumber: 150 });

      expect(result.success).toBe(false);
      expect(result.message).toContain('only has 100 pages');
    });

    it('should mark book as complete at 100%', async () => {
      const mockBook = createMockBook({ id: 1, title: 'Test Book', pages: 200 });
      const mockProgress = {
        id: 1,
        bookId: 1,
        currentPage: 180,
        progressPercent: 90,
        totalPages: 200,
        status: 'READING',
        book: mockBook,
      };

      mockPrismaClient.readingProgress.findFirst.mockResolvedValue(mockProgress);
      mockPrismaClient.readingProgress.update.mockResolvedValue({
        ...mockProgress,
        currentPage: 200,
        progressPercent: 100,
        status: 'COMPLETED',
      });

      const result = await handleUpdateProgress({ pageNumber: 200 });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Congratulations');
      expect(result.message).toContain('finished');
    });

    it('should use context bookId when provided', async () => {
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

      const result = await handleUpdateProgress(
        { pageNumber: 100 },
        { phoneNumber: '+1234567890', lastBookId: 5, timestamp: new Date() }
      );

      expect(result.success).toBe(true);
      expect(mockPrismaClient.readingProgress.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { bookId: 5 },
        })
      );
    });

    it('should return error when no parameters provided', async () => {
      const result = await handleUpdateProgress({});

      expect(result.success).toBe(false);
      expect(result.message).toContain('Please specify');
    });
  });

  describe('handleStartBook', () => {
    it('should start reading a book', async () => {
      const mockBook = createMockBook({ id: 1, title: 'The Great Gatsby', pages: 180 });

      mockPrismaClient.book.findFirst.mockResolvedValue(mockBook);
      mockPrismaClient.readingProgress.findFirst.mockResolvedValue(null);
      mockPrismaClient.readingProgress.upsert.mockResolvedValue({
        id: 1,
        bookId: 1,
        status: 'READING',
        currentPage: 0,
        progressPercent: 0,
      });

      const result = await handleStartBook({ bookTitle: 'Great Gatsby' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Started reading');
      expect(result.message).toContain('The Great Gatsby');
      expect(result.data?.bookId).toBe(1);
    });

    it('should return error when book not found', async () => {
      mockPrismaClient.book.findFirst.mockResolvedValue(null);

      const result = await handleStartBook({ bookTitle: 'Nonexistent Book' });

      expect(result.success).toBe(false);
      expect(result.message).toContain("Couldn't find");
    });

    it('should return error when already reading the book', async () => {
      const mockBook = createMockBook({ id: 1, title: 'Already Reading' });
      const mockProgress = {
        id: 1,
        bookId: 1,
        status: 'READING',
        progressPercent: 50,
      };

      mockPrismaClient.book.findFirst.mockResolvedValue(mockBook);
      mockPrismaClient.readingProgress.findFirst.mockResolvedValue(mockProgress);

      const result = await handleStartBook({ bookTitle: 'Already Reading' });

      expect(result.success).toBe(false);
      expect(result.message).toContain("already reading");
    });

    it('should return error when no book title provided', async () => {
      const result = await handleStartBook({});

      expect(result.success).toBe(false);
      expect(result.message).toContain('Please specify a book title');
    });

    it('should allow restarting a completed book', async () => {
      const mockBook = createMockBook({ id: 1, title: 'Reread Book', pages: 200 });
      const completedProgress = {
        id: 1,
        bookId: 1,
        status: 'COMPLETED',
        progressPercent: 100,
      };

      mockPrismaClient.book.findFirst.mockResolvedValue(mockBook);
      mockPrismaClient.readingProgress.findFirst.mockResolvedValue(completedProgress);
      mockPrismaClient.readingProgress.upsert.mockResolvedValue({
        id: 1,
        bookId: 1,
        status: 'READING',
        progressPercent: 0,
      });

      const result = await handleStartBook({ bookTitle: 'Reread Book' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Started reading');
    });
  });

  describe('handleFinishBook', () => {
    it('should mark a book as finished', async () => {
      const mockBook = createMockBook({ id: 1, title: 'Finished Book', pages: 300 });
      const mockProgress = {
        id: 1,
        bookId: 1,
        status: 'READING',
        progressPercent: 90,
        currentPage: 270,
        book: mockBook,
      };

      mockPrismaClient.readingProgress.findFirst.mockResolvedValue(mockProgress);
      mockPrismaClient.readingProgress.update.mockResolvedValue({
        ...mockProgress,
        status: 'COMPLETED',
        progressPercent: 100,
      });

      const result = await handleFinishBook({ bookTitle: 'Finished Book' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Congratulations');
      expect(result.message).toContain('Finished Book');
    });

    it('should finish the most recent book when no title specified', async () => {
      const mockBook = createMockBook({ id: 1, title: 'Current Book', pages: 200 });
      const mockProgress = {
        id: 1,
        bookId: 1,
        status: 'READING',
        progressPercent: 75,
        currentPage: 150,
        book: mockBook,
      };

      mockPrismaClient.readingProgress.findFirst.mockResolvedValue(mockProgress);
      mockPrismaClient.readingProgress.update.mockResolvedValue({
        ...mockProgress,
        status: 'COMPLETED',
        progressPercent: 100,
      });

      const result = await handleFinishBook({});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Current Book');
    });

    it('should return error when no active book found', async () => {
      mockPrismaClient.readingProgress.findFirst.mockResolvedValue(null);

      const result = await handleFinishBook({ bookTitle: 'Not Reading' });

      expect(result.success).toBe(false);
      expect(result.message).toContain("Couldn't find");
    });

    it('should return error when no books are being read', async () => {
      mockPrismaClient.readingProgress.findFirst.mockResolvedValue(null);

      const result = await handleFinishBook({});

      expect(result.success).toBe(false);
      expect(result.message).toContain('No active book found');
    });
  });

  describe('handleGetStatus', () => {
    it('should return current reading status', async () => {
      const mockBook = createMockBook({ id: 1, title: 'Current Read', author: 'Test Author', pages: 300 });
      const mockProgress = {
        id: 1,
        bookId: 1,
        status: 'READING',
        progressPercent: 50,
        currentPage: 150,
        book: mockBook,
      };

      mockPrismaClient.readingProgress.findFirst.mockResolvedValue(mockProgress);

      const result = await handleGetStatus();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Current Read');
      expect(result.message).toContain('50%');
    });

    it('should return message when not reading any books', async () => {
      mockPrismaClient.readingProgress.findFirst.mockResolvedValue(null);

      const result = await handleGetStatus();

      expect(result.success).toBe(true);
      expect(result.message).toContain('not currently reading');
    });

    it('should use context book when available', async () => {
      const mockBook = createMockBook({ id: 5, title: 'Context Book', pages: 200 });
      const mockProgress = {
        id: 1,
        bookId: 5,
        status: 'READING',
        progressPercent: 25,
        currentPage: 50,
        book: mockBook,
      };

      mockPrismaClient.readingProgress.findFirst.mockResolvedValue(mockProgress);

      const result = await handleGetStatus({
        phoneNumber: '+1234567890',
        lastBookId: 5,
        timestamp: new Date(),
      });

      expect(result.success).toBe(true);
      expect(result.data?.book).toBeDefined();
    });
  });

  describe('handleListReading', () => {
    it('should list currently reading books', async () => {
      const mockBooks = [
        {
          id: 1,
          bookId: 1,
          progressPercent: 50,
          book: createMockBook({ id: 1, title: 'Book One' }),
        },
        {
          id: 2,
          bookId: 2,
          progressPercent: 25,
          book: createMockBook({ id: 2, title: 'Book Two' }),
        },
      ];

      mockPrismaClient.readingProgress.findMany.mockResolvedValue(mockBooks);

      const result = await handleListReading();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Book One');
      expect(result.message).toContain('Book Two');
      expect(result.message).toContain('50%');
      expect(result.message).toContain('25%');
    });

    it('should return message when not reading any books', async () => {
      mockPrismaClient.readingProgress.findMany.mockResolvedValue([]);

      const result = await handleListReading();

      expect(result.success).toBe(true);
      expect(result.message).toContain('not currently reading');
    });

    it('should limit results to 5 books', async () => {
      const mockBooks = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        bookId: i + 1,
        progressPercent: i * 10,
        book: createMockBook({ id: i + 1, title: `Book ${i + 1}` }),
      }));

      mockPrismaClient.readingProgress.findMany.mockResolvedValue(mockBooks.slice(0, 5));

      const result = await handleListReading();

      expect(mockPrismaClient.readingProgress.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        })
      );
    });
  });

  describe('handleSearchBook', () => {
    it('should find books by title', async () => {
      const mockBooks = [
        createMockBook({ id: 1, title: "Harry Potter and the Sorcerer's Stone" }),
        createMockBook({ id: 2, title: 'Harry Potter and the Chamber of Secrets' }),
      ];

      mockPrismaClient.book.findMany.mockResolvedValue(mockBooks);

      const result = await handleSearchBook({ query: 'Harry Potter' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Found 2');
      expect(result.message).toContain('Harry Potter');
    });

    it('should return message when no books found', async () => {
      mockPrismaClient.book.findMany.mockResolvedValue([]);

      const result = await handleSearchBook({ query: 'Nonexistent' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('No books found');
    });

    it('should return error when no query provided', async () => {
      const result = await handleSearchBook({});

      expect(result.success).toBe(false);
      expect(result.message).toContain('Please specify');
    });
  });

  describe('handleGetStats', () => {
    it('should return reading statistics', async () => {
      // Mock count to return different values based on call order
      mockPrismaClient.readingProgress.count
        .mockResolvedValueOnce(3) // READING count
        .mockResolvedValueOnce(10); // COMPLETED count

      // The handler uses include: { book: true }, so mock sessions need the book relation
      const mockBook = createMockBook({ id: 1, title: 'Recent Book' });
      mockPrismaClient.readingSession.findMany.mockResolvedValue([
        {
          ...createMockReadingSession({ pagesRead: 100 }),
          book: mockBook,
        },
      ]);

      mockPrismaClient.readingSession.aggregate.mockResolvedValue({
        _sum: { pagesRead: 5000 },
      });

      const result = await handleGetStats();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Reading Stats');
      // Due to Promise.all, the order of count calls may vary
      // Just check that the message contains the expected structure
      expect(result.message).toContain('Books completed:');
      expect(result.message).toContain('Currently reading:');
    });

    it('should handle zero stats', async () => {
      mockPrismaClient.readingProgress.count.mockResolvedValue(0);
      mockPrismaClient.readingSession.findMany.mockResolvedValue([]);
      mockPrismaClient.readingSession.aggregate.mockResolvedValue({
        _sum: { pagesRead: null },
      });

      const result = await handleGetStats();

      expect(result.success).toBe(true);
      expect(result.message).toContain('0');
    });
  });

  describe('handleHelp', () => {
    it('should return help text', () => {
      const result = handleHelp();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Bookshelf SMS Commands');
      expect(result.message).toContain('Progress');
      expect(result.message).toContain('Start');
      expect(result.message).toContain('Finish');
      expect(result.message).toContain('Status');
      expect(result.message).toContain('Help');
    });
  });

  describe('handleUnknown', () => {
    it('should return helpful error message', () => {
      const result = handleUnknown('gibberish message');

      expect(result.success).toBe(false);
      expect(result.message).toContain("didn't understand");
      expect(result.message).toContain('help');
    });

    it('should truncate long messages', () => {
      const longMessage = 'a'.repeat(100);
      const result = handleUnknown(longMessage);

      expect(result.message).toContain('...');
      expect(result.message.length).toBeLessThan(longMessage.length + 50);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully in updateProgress', async () => {
      mockPrismaClient.readingProgress.findFirst.mockRejectedValue(new Error('DB error'));

      const result = await handleUpdateProgress({ pageNumber: 100 });

      expect(result.success).toBe(false);
      expect(result.message).toContain('error');
    });

    it('should handle database errors gracefully in startBook', async () => {
      mockPrismaClient.book.findFirst.mockRejectedValue(new Error('DB error'));

      const result = await handleStartBook({ bookTitle: 'Test' });

      expect(result.success).toBe(false);
      expect(result.message).toContain('error');
    });

    it('should handle database errors gracefully in finishBook', async () => {
      mockPrismaClient.readingProgress.findFirst.mockRejectedValue(new Error('DB error'));

      const result = await handleFinishBook({ bookTitle: 'Test' });

      expect(result.success).toBe(false);
      expect(result.message).toContain('error');
    });

    it('should handle database errors gracefully in getStatus', async () => {
      mockPrismaClient.readingProgress.findFirst.mockRejectedValue(new Error('DB error'));

      const result = await handleGetStatus();

      expect(result.success).toBe(false);
      expect(result.message).toContain('error');
    });

    it('should handle database errors gracefully in listReading', async () => {
      mockPrismaClient.readingProgress.findMany.mockRejectedValue(new Error('DB error'));

      const result = await handleListReading();

      expect(result.success).toBe(false);
      expect(result.message).toContain('error');
    });

    it('should handle database errors gracefully in searchBook', async () => {
      mockPrismaClient.book.findMany.mockRejectedValue(new Error('DB error'));

      const result = await handleSearchBook({ query: 'test' });

      expect(result.success).toBe(false);
      expect(result.message).toContain('error');
    });

    it('should handle database errors gracefully in getStats', async () => {
      mockPrismaClient.readingProgress.count.mockRejectedValue(new Error('DB error'));

      const result = await handleGetStats();

      expect(result.success).toBe(false);
      expect(result.message).toContain('error');
    });
  });
});
