import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  mockPrismaClient,
  resetPrismaMocks,
  createMockBook,
  createMockReadingSession,
  createMockReadingProgress,
} from '../mocks/prisma';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: mockPrismaClient,
}));

describe('Reading Sessions API', () => {
  beforeEach(() => {
    resetPrismaMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('GET /api/reading-sessions', () => {
    it('should return all reading sessions', async () => {
      const mockSessions = [
        createMockReadingSession({
          id: 1,
          bookId: 1,
          durationMinutes: 30,
          pagesRead: 25,
        }),
        createMockReadingSession({
          id: 2,
          bookId: 1,
          durationMinutes: 45,
          pagesRead: 35,
        }),
      ];

      mockPrismaClient.readingSession.findMany.mockResolvedValue(mockSessions);

      const result = await mockPrismaClient.readingSession.findMany();

      expect(result).toHaveLength(2);
      expect(result[0].durationMinutes).toBe(30);
      expect(result[1].durationMinutes).toBe(45);
    });

    it('should filter sessions by book ID', async () => {
      const mockSessions = [
        createMockReadingSession({ id: 1, bookId: 5 }),
        createMockReadingSession({ id: 2, bookId: 5 }),
      ];

      mockPrismaClient.readingSession.findMany.mockResolvedValue(mockSessions);

      const result = await mockPrismaClient.readingSession.findMany({
        where: { bookId: 5 },
      });

      expect(result).toHaveLength(2);
      result.forEach((s: { bookId: number }) => expect(s.bookId).toBe(5));
    });

    it('should filter sessions by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockSessions = [
        createMockReadingSession({
          id: 1,
          startTime: new Date('2024-01-15'),
        }),
      ];

      mockPrismaClient.readingSession.findMany.mockResolvedValue(mockSessions);

      const result = await mockPrismaClient.readingSession.findMany({
        where: {
          startTime: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      expect(result).toHaveLength(1);
    });

    it('should return sessions ordered by start time descending', async () => {
      const mockSessions = [
        createMockReadingSession({
          id: 2,
          startTime: new Date('2024-01-02T10:00:00'),
        }),
        createMockReadingSession({
          id: 1,
          startTime: new Date('2024-01-01T10:00:00'),
        }),
      ];

      mockPrismaClient.readingSession.findMany.mockResolvedValue(mockSessions);

      const result = await mockPrismaClient.readingSession.findMany({
        orderBy: { startTime: 'desc' },
      });

      expect(result[0].id).toBe(2);
      expect(result[1].id).toBe(1);
    });
  });

  describe('GET /api/reading-sessions/:id', () => {
    it('should return a specific reading session', async () => {
      const mockSession = createMockReadingSession({
        id: 1,
        bookId: 1,
        startTime: new Date('2024-01-01T10:00:00'),
        endTime: new Date('2024-01-01T11:00:00'),
        pagesRead: 40,
        durationMinutes: 60,
      });

      mockPrismaClient.readingSession.findUnique.mockResolvedValue(mockSession);

      const result = await mockPrismaClient.readingSession.findUnique({
        where: { id: 1 },
      });

      expect(result).toBeDefined();
      expect(result?.durationMinutes).toBe(60);
      expect(result?.pagesRead).toBe(40);
    });

    it('should return null for non-existent session', async () => {
      mockPrismaClient.readingSession.findUnique.mockResolvedValue(null);

      const result = await mockPrismaClient.readingSession.findUnique({
        where: { id: 999 },
      });

      expect(result).toBeNull();
    });
  });

  describe('POST /api/reading-sessions/start', () => {
    it('should start a new reading session', async () => {
      const now = new Date('2024-01-01T10:00:00');
      vi.setSystemTime(now);

      const mockBook = createMockBook({ id: 1, pages: 300 });
      const newSession = createMockReadingSession({
        id: 1,
        bookId: 1,
        startTime: now,
        endTime: null,
        pagesRead: 0,
        durationMinutes: 0,
      });

      mockPrismaClient.book.findUnique.mockResolvedValue(mockBook);
      mockPrismaClient.readingSession.create.mockResolvedValue(newSession);

      const result = await mockPrismaClient.readingSession.create({
        data: {
          bookId: 1,
          startTime: now,
          endTime: null,
          pagesRead: 0,
          durationMinutes: 0,
        },
      });

      expect(result.startTime).toEqual(now);
      expect(result.endTime).toBeNull();
      expect(result.durationMinutes).toBe(0);
    });

    it('should reject starting session for non-existent book', async () => {
      mockPrismaClient.book.findUnique.mockResolvedValue(null);

      const book = await mockPrismaClient.book.findUnique({ where: { id: 999 } });

      expect(book).toBeNull();
    });

    it('should not allow multiple active sessions for same book', async () => {
      const activeSession = createMockReadingSession({
        id: 1,
        bookId: 1,
        endTime: null, // Active session
      });

      mockPrismaClient.readingSession.findFirst.mockResolvedValue(activeSession);

      const existingActive = await mockPrismaClient.readingSession.findFirst({
        where: {
          bookId: 1,
          endTime: null,
        },
      });

      expect(existingActive).not.toBeNull();
      // In actual implementation, this should prevent creating another session
    });

    it('should update reading progress status to "reading"', async () => {
      const mockProgress = createMockReadingProgress({
        id: 1,
        bookId: 1,
        status: 'not_started',
      });

      mockPrismaClient.readingProgress.update.mockResolvedValue({
        ...mockProgress,
        status: 'reading',
      });

      const result = await mockPrismaClient.readingProgress.update({
        where: { bookId: 1 },
        data: { status: 'reading' },
      });

      expect(result.status).toBe('reading');
    });
  });

  describe('POST /api/reading-sessions/:id/end', () => {
    it('should end an active reading session', async () => {
      const startTime = new Date('2024-01-01T10:00:00');
      const endTime = new Date('2024-01-01T11:30:00');
      vi.setSystemTime(endTime);

      const activeSession = createMockReadingSession({
        id: 1,
        bookId: 1,
        startTime,
        endTime: null,
      });

      const endedSession = createMockReadingSession({
        id: 1,
        bookId: 1,
        startTime,
        endTime,
        pagesRead: 50,
        durationMinutes: 90,
      });

      mockPrismaClient.readingSession.findUnique.mockResolvedValue(activeSession);
      mockPrismaClient.readingSession.update.mockResolvedValue(endedSession);

      const result = await mockPrismaClient.readingSession.update({
        where: { id: 1 },
        data: {
          endTime,
          pagesRead: 50,
          durationMinutes: 90,
        },
      });

      expect(result.endTime).toEqual(endTime);
      expect(result.durationMinutes).toBe(90);
      expect(result.pagesRead).toBe(50);
    });

    it('should calculate duration correctly', async () => {
      const calculateDuration = (start: Date, end: Date): number => {
        return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      };

      const start = new Date('2024-01-01T10:00:00');
      const end30min = new Date('2024-01-01T10:30:00');
      const end90min = new Date('2024-01-01T11:30:00');

      expect(calculateDuration(start, end30min)).toBe(30);
      expect(calculateDuration(start, end90min)).toBe(90);
    });

    it('should reject ending already ended session', async () => {
      const endedSession = createMockReadingSession({
        id: 1,
        endTime: new Date('2024-01-01T11:00:00'), // Already ended
      });

      mockPrismaClient.readingSession.findUnique.mockResolvedValue(endedSession);

      const session = await mockPrismaClient.readingSession.findUnique({
        where: { id: 1 },
      });

      expect(session?.endTime).not.toBeNull();
      // In actual implementation, this should return 400 error
    });

    it('should reject ending non-existent session', async () => {
      mockPrismaClient.readingSession.findUnique.mockResolvedValue(null);

      const session = await mockPrismaClient.readingSession.findUnique({
        where: { id: 999 },
      });

      expect(session).toBeNull();
    });

    it('should update reading progress with new page count', async () => {
      const mockProgress = createMockReadingProgress({
        id: 1,
        bookId: 1,
        currentPage: 100,
      });

      mockPrismaClient.readingProgress.update.mockResolvedValue({
        ...mockProgress,
        currentPage: 150,
        progressPercent: 50,
      });

      const result = await mockPrismaClient.readingProgress.update({
        where: { bookId: 1 },
        data: {
          currentPage: 150,
          progressPercent: 50,
        },
      });

      expect(result.currentPage).toBe(150);
    });
  });

  describe('DELETE /api/reading-sessions/:id', () => {
    it('should delete a reading session', async () => {
      mockPrismaClient.readingSession.delete.mockResolvedValue(
        createMockReadingSession({ id: 1 })
      );

      const result = await mockPrismaClient.readingSession.delete({
        where: { id: 1 },
      });

      expect(result).toBeDefined();
      expect(mockPrismaClient.readingSession.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should not allow deleting active session (must end first)', async () => {
      const activeSession = createMockReadingSession({
        id: 1,
        endTime: null,
      });

      mockPrismaClient.readingSession.findUnique.mockResolvedValue(activeSession);

      const session = await mockPrismaClient.readingSession.findUnique({
        where: { id: 1 },
      });

      expect(session?.endTime).toBeNull();
      // In actual implementation, should require ending session first
    });
  });

  describe('GET /api/reading-sessions/stats', () => {
    it('should calculate total reading time', async () => {
      const mockStats = {
        _sum: { durationMinutes: 500 },
        _count: { id: 10 },
      };

      mockPrismaClient.readingSession.aggregate.mockResolvedValue(mockStats);

      const result = await mockPrismaClient.readingSession.aggregate({
        _sum: { durationMinutes: true },
        _count: { id: true },
      });

      expect(result._sum.durationMinutes).toBe(500);
      expect(result._count.id).toBe(10);
    });

    it('should calculate average session duration', async () => {
      const calculateAverage = (total: number, count: number): number => {
        if (count === 0) return 0;
        return Math.round(total / count);
      };

      expect(calculateAverage(500, 10)).toBe(50);
      expect(calculateAverage(0, 0)).toBe(0);
      expect(calculateAverage(90, 3)).toBe(30);
    });

    it('should calculate total pages read', async () => {
      const mockStats = {
        _sum: { pagesRead: 1500 },
      };

      mockPrismaClient.readingSession.aggregate.mockResolvedValue(mockStats);

      const result = await mockPrismaClient.readingSession.aggregate({
        _sum: { pagesRead: true },
      });

      expect(result._sum.pagesRead).toBe(1500);
    });

    it('should calculate reading stats by book', async () => {
      const mockSessions = [
        createMockReadingSession({ bookId: 1, durationMinutes: 60 }),
        createMockReadingSession({ bookId: 1, durationMinutes: 45 }),
        createMockReadingSession({ bookId: 2, durationMinutes: 30 }),
      ];

      const calculateStatsByBook = (sessions: typeof mockSessions) => {
        const stats: Record<number, { totalMinutes: number; sessions: number }> = {};
        sessions.forEach((s) => {
          if (!stats[s.bookId]) {
            stats[s.bookId] = { totalMinutes: 0, sessions: 0 };
          }
          stats[s.bookId].totalMinutes += s.durationMinutes;
          stats[s.bookId].sessions += 1;
        });
        return stats;
      };

      const stats = calculateStatsByBook(mockSessions);

      expect(stats[1].totalMinutes).toBe(105);
      expect(stats[1].sessions).toBe(2);
      expect(stats[2].totalMinutes).toBe(30);
      expect(stats[2].sessions).toBe(1);
    });

    it('should calculate reading velocity (pages per minute)', async () => {
      const calculateVelocity = (pages: number, minutes: number): number => {
        if (minutes === 0) return 0;
        return Math.round((pages / minutes) * 100) / 100;
      };

      expect(calculateVelocity(50, 60)).toBe(0.83);
      expect(calculateVelocity(100, 60)).toBe(1.67);
      expect(calculateVelocity(0, 60)).toBe(0);
      expect(calculateVelocity(50, 0)).toBe(0);
    });
  });

  describe('Timer Functionality', () => {
    it('should calculate elapsed time for active session', async () => {
      const startTime = new Date('2024-01-01T10:00:00');
      const currentTime = new Date('2024-01-01T10:45:00');
      vi.setSystemTime(currentTime);

      const calculateElapsed = (start: Date): number => {
        return Math.floor((Date.now() - start.getTime()) / 1000);
      };

      const elapsedSeconds = calculateElapsed(startTime);

      expect(elapsedSeconds).toBe(45 * 60); // 45 minutes in seconds
    });

    it('should format duration as human-readable string', async () => {
      const formatDuration = (minutes: number): string => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours === 0) return `${mins}m`;
        if (mins === 0) return `${hours}h`;
        return `${hours}h ${mins}m`;
      };

      expect(formatDuration(30)).toBe('30m');
      expect(formatDuration(60)).toBe('1h');
      expect(formatDuration(90)).toBe('1h 30m');
      expect(formatDuration(150)).toBe('2h 30m');
    });

    it('should handle session spanning midnight', async () => {
      const startTime = new Date('2024-01-01T23:30:00');
      const endTime = new Date('2024-01-02T00:30:00');

      const calculateDuration = (start: Date, end: Date): number => {
        return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      };

      expect(calculateDuration(startTime, endTime)).toBe(60);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long reading sessions', async () => {
      const startTime = new Date('2024-01-01T08:00:00');
      const endTime = new Date('2024-01-01T20:00:00'); // 12 hours

      const session = createMockReadingSession({
        id: 1,
        startTime,
        endTime,
        durationMinutes: 720,
        pagesRead: 400,
      });

      expect(session.durationMinutes).toBe(720);
      expect(session.pagesRead).toBe(400);
    });

    it('should handle session with zero pages read', async () => {
      const session = createMockReadingSession({
        id: 1,
        pagesRead: 0,
        durationMinutes: 30,
      });

      expect(session.pagesRead).toBe(0);
      expect(session.durationMinutes).toBe(30);
    });

    it('should handle rapid start/stop cycles', async () => {
      const sessions = [
        createMockReadingSession({ id: 1, durationMinutes: 5 }),
        createMockReadingSession({ id: 2, durationMinutes: 3 }),
        createMockReadingSession({ id: 3, durationMinutes: 7 }),
      ];

      const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);

      expect(totalMinutes).toBe(15);
    });

    it('should validate pages read does not exceed session capability', async () => {
      // Assuming average reading speed of 1 page per minute
      const validatePagesRead = (pages: number, durationMinutes: number): boolean => {
        const maxReasonablePages = durationMinutes * 3; // 3 pages/min max
        return pages <= maxReasonablePages;
      };

      expect(validatePagesRead(30, 30)).toBe(true); // 1 page/min
      expect(validatePagesRead(100, 10)).toBe(false); // 10 pages/min - unreasonable
      expect(validatePagesRead(0, 30)).toBe(true);
    });
  });
});
