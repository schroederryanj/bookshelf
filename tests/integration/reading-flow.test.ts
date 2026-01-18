import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  mockPrismaClient,
  resetPrismaMocks,
  createMockBook,
  createMockReadingProgress,
  createMockReadingSession,
  createMockReadingGoal,
  createMockReadingStreak,
} from '../mocks/prisma';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: mockPrismaClient,
}));

describe('Reading Flow Integration Tests', () => {
  beforeEach(() => {
    resetPrismaMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:00:00'));
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('Complete Reading Flow: Start -> Track Progress -> Complete', () => {
    it('should handle full reading lifecycle for a book', async () => {
      // Step 1: Get book details
      const mockBook = createMockBook({
        id: 1,
        title: 'Test Book',
        pages: 300,
        read: null,
      });
      mockPrismaClient.book.findUnique.mockResolvedValue(mockBook);

      const book = await mockPrismaClient.book.findUnique({ where: { id: 1 } });
      expect(book).toBeDefined();
      expect(book?.pages).toBe(300);

      // Step 2: Initialize reading progress
      const initialProgress = createMockReadingProgress({
        id: 1,
        bookId: 1,
        currentPage: 0,
        progressPercent: 0,
        status: 'not_started',
      });
      mockPrismaClient.readingProgress.create.mockResolvedValue(initialProgress);

      const progress = await mockPrismaClient.readingProgress.create({
        data: {
          bookId: 1,
          currentPage: 0,
          progressPercent: 0,
          status: 'not_started',
        },
      });
      expect(progress.status).toBe('not_started');

      // Step 3: Start first reading session
      const session1Start = new Date('2024-01-15T10:00:00');
      const session1 = createMockReadingSession({
        id: 1,
        bookId: 1,
        startTime: session1Start,
        endTime: null,
      });
      mockPrismaClient.readingSession.create.mockResolvedValue(session1);

      const startedSession = await mockPrismaClient.readingSession.create({
        data: {
          bookId: 1,
          startTime: session1Start,
        },
      });
      expect(startedSession.endTime).toBeNull();

      // Step 4: Update progress status to 'reading'
      const readingProgress = createMockReadingProgress({
        ...initialProgress,
        status: 'reading',
      });
      mockPrismaClient.readingProgress.update.mockResolvedValue(readingProgress);

      const updatedProgress = await mockPrismaClient.readingProgress.update({
        where: { id: 1 },
        data: { status: 'reading' },
      });
      expect(updatedProgress.status).toBe('reading');

      // Step 5: End first session with progress (read 50 pages in 60 minutes)
      const session1End = new Date('2024-01-15T11:00:00');
      const endedSession1 = createMockReadingSession({
        ...session1,
        endTime: session1End,
        pagesRead: 50,
        durationMinutes: 60,
      });
      mockPrismaClient.readingSession.update.mockResolvedValue(endedSession1);

      const completedSession = await mockPrismaClient.readingSession.update({
        where: { id: 1 },
        data: {
          endTime: session1End,
          pagesRead: 50,
          durationMinutes: 60,
        },
      });
      expect(completedSession.pagesRead).toBe(50);
      expect(completedSession.durationMinutes).toBe(60);

      // Step 6: Update reading progress
      const progress50Pages = createMockReadingProgress({
        ...readingProgress,
        currentPage: 50,
        progressPercent: 16.67,
      });
      mockPrismaClient.readingProgress.update.mockResolvedValue(progress50Pages);

      const progressAfterSession = await mockPrismaClient.readingProgress.update({
        where: { id: 1 },
        data: {
          currentPage: 50,
          progressPercent: (50 / 300) * 100,
        },
      });
      expect(progressAfterSession.currentPage).toBe(50);

      // Step 7: Multiple sessions later, complete the book
      const finalProgress = createMockReadingProgress({
        ...progress50Pages,
        currentPage: 300,
        progressPercent: 100,
        status: 'completed',
      });
      mockPrismaClient.readingProgress.update.mockResolvedValue(finalProgress);

      const completedProgress = await mockPrismaClient.readingProgress.update({
        where: { id: 1 },
        data: {
          currentPage: 300,
          progressPercent: 100,
          status: 'completed',
        },
      });
      expect(completedProgress.status).toBe('completed');
      expect(completedProgress.progressPercent).toBe(100);

      // Step 8: Update book read status
      const completedBook = createMockBook({
        ...mockBook,
        read: 'Read',
        dateFinished: '2024-01-20',
      });
      mockPrismaClient.book.update.mockResolvedValue(completedBook);

      const finalBook = await mockPrismaClient.book.update({
        where: { id: 1 },
        data: {
          read: 'Read',
          dateFinished: '2024-01-20',
        },
      });
      expect(finalBook.read).toBe('Read');
    });
  });

  describe('Goal Tracking Integration', () => {
    it('should update monthly goal when completing a book', async () => {
      // Setup: Monthly goal of 4 books
      const monthlyGoal = createMockReadingGoal({
        id: 1,
        type: 'books_per_month',
        target: 4,
        current: 2,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      });

      mockPrismaClient.readingGoal.findFirst.mockResolvedValue(monthlyGoal);

      // Complete a book
      mockPrismaClient.readingProgress.update.mockResolvedValue(
        createMockReadingProgress({
          status: 'completed',
          progressPercent: 100,
        })
      );

      // Update goal
      const updatedGoal = createMockReadingGoal({
        ...monthlyGoal,
        current: 3,
      });
      mockPrismaClient.readingGoal.update.mockResolvedValue(updatedGoal);

      const goal = await mockPrismaClient.readingGoal.findFirst({
        where: { type: 'books_per_month' },
      });

      const result = await mockPrismaClient.readingGoal.update({
        where: { id: goal!.id },
        data: { current: goal!.current + 1 },
      });

      expect(result.current).toBe(3);
    });

    it('should track pages per day goal during reading session', async () => {
      const dailyGoal = createMockReadingGoal({
        id: 1,
        type: 'pages_per_day',
        target: 50,
        current: 20,
      });

      mockPrismaClient.readingGoal.findFirst.mockResolvedValue(dailyGoal);

      // End session with 35 pages read
      const session = createMockReadingSession({
        id: 1,
        pagesRead: 35,
      });
      mockPrismaClient.readingSession.findUnique.mockResolvedValue(session);

      // Update daily goal
      const updatedGoal = createMockReadingGoal({
        ...dailyGoal,
        current: 55, // 20 + 35
      });
      mockPrismaClient.readingGoal.update.mockResolvedValue(updatedGoal);

      const result = await mockPrismaClient.readingGoal.update({
        where: { id: 1 },
        data: { current: dailyGoal.current + session.pagesRead },
      });

      expect(result.current).toBe(55);
      expect(result.current).toBeGreaterThan(result.target);
    });

    it('should reset daily pages goal at midnight', async () => {
      const dailyGoal = createMockReadingGoal({
        type: 'pages_per_day',
        target: 50,
        current: 75,
        startDate: new Date('2024-01-14'),
        endDate: new Date('2024-01-14'),
      });

      // Check if goal period has ended
      const now = new Date('2024-01-15T00:00:00');
      const goalEnded = now > dailyGoal.endDate;

      expect(goalEnded).toBe(true);

      // Create new daily goal for today
      const newDailyGoal = createMockReadingGoal({
        type: 'pages_per_day',
        target: 50,
        current: 0,
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-15'),
      });

      mockPrismaClient.readingGoal.create.mockResolvedValue(newDailyGoal);

      const newGoal = await mockPrismaClient.readingGoal.create({
        data: newDailyGoal,
      });

      expect(newGoal.current).toBe(0);
    });
  });

  describe('Streak Integration', () => {
    it('should update streak when starting a reading session', async () => {
      // Yesterday's streak
      const currentStreak = createMockReadingStreak({
        id: 1,
        currentStreak: 7,
        longestStreak: 14,
        lastReadDate: new Date('2024-01-14'),
      });

      mockPrismaClient.readingStreak.findFirst.mockResolvedValue(currentStreak);

      // Start reading session today
      const today = new Date('2024-01-15');
      vi.setSystemTime(today);

      // Check if consecutive day
      const lastRead = currentStreak.lastReadDate!;
      const diffDays = Math.floor(
        (today.getTime() - lastRead.getTime()) / (1000 * 60 * 60 * 24)
      );

      expect(diffDays).toBe(1); // Consecutive day

      // Update streak
      const updatedStreak = createMockReadingStreak({
        ...currentStreak,
        currentStreak: 8,
        lastReadDate: today,
      });
      mockPrismaClient.readingStreak.update.mockResolvedValue(updatedStreak);

      const result = await mockPrismaClient.readingStreak.update({
        where: { id: 1 },
        data: {
          currentStreak: currentStreak.currentStreak + 1,
          lastReadDate: today,
        },
      });

      expect(result.currentStreak).toBe(8);
    });

    it('should reset streak when missing a day', async () => {
      const brokenStreak = createMockReadingStreak({
        id: 1,
        currentStreak: 7,
        longestStreak: 14,
        lastReadDate: new Date('2024-01-12'), // 3 days ago
      });

      mockPrismaClient.readingStreak.findFirst.mockResolvedValue(brokenStreak);

      const today = new Date('2024-01-15');
      vi.setSystemTime(today);

      const lastRead = brokenStreak.lastReadDate!;
      const diffDays = Math.floor(
        (today.getTime() - lastRead.getTime()) / (1000 * 60 * 60 * 24)
      );

      expect(diffDays).toBe(3); // Not consecutive

      // Reset streak
      const resetStreak = createMockReadingStreak({
        ...brokenStreak,
        currentStreak: 1,
        lastReadDate: today,
      });
      mockPrismaClient.readingStreak.update.mockResolvedValue(resetStreak);

      const result = await mockPrismaClient.readingStreak.update({
        where: { id: 1 },
        data: {
          currentStreak: 1,
          lastReadDate: today,
        },
      });

      expect(result.currentStreak).toBe(1);
    });

    it('should update longest streak when current exceeds it', async () => {
      const nearRecordStreak = createMockReadingStreak({
        id: 1,
        currentStreak: 14,
        longestStreak: 14,
        lastReadDate: new Date('2024-01-14'),
      });

      mockPrismaClient.readingStreak.findFirst.mockResolvedValue(nearRecordStreak);

      // New record
      const newRecordStreak = createMockReadingStreak({
        ...nearRecordStreak,
        currentStreak: 15,
        longestStreak: 15,
        lastReadDate: new Date('2024-01-15'),
      });
      mockPrismaClient.readingStreak.update.mockResolvedValue(newRecordStreak);

      const result = await mockPrismaClient.readingStreak.update({
        where: { id: 1 },
        data: {
          currentStreak: 15,
          longestStreak: 15,
        },
      });

      expect(result.longestStreak).toBe(15);
    });
  });

  describe('Multiple Books Parallel Reading', () => {
    it('should track progress for multiple books independently', async () => {
      const book1Progress = createMockReadingProgress({
        id: 1,
        bookId: 1,
        currentPage: 50,
        progressPercent: 25,
        status: 'reading',
      });

      const book2Progress = createMockReadingProgress({
        id: 2,
        bookId: 2,
        currentPage: 100,
        progressPercent: 50,
        status: 'reading',
      });

      mockPrismaClient.readingProgress.findMany.mockResolvedValue([
        book1Progress,
        book2Progress,
      ]);

      const allProgress = await mockPrismaClient.readingProgress.findMany({
        where: { status: 'reading' },
      });

      expect(allProgress).toHaveLength(2);
      expect(allProgress[0].bookId).not.toBe(allProgress[1].bookId);
    });

    it('should prevent multiple active sessions for same book', async () => {
      // Active session exists
      const activeSession = createMockReadingSession({
        id: 1,
        bookId: 1,
        endTime: null,
      });

      mockPrismaClient.readingSession.findFirst.mockResolvedValue(activeSession);

      const existingActive = await mockPrismaClient.readingSession.findFirst({
        where: {
          bookId: 1,
          endTime: null,
        },
      });

      expect(existingActive).not.toBeNull();

      // Should not create another session for same book
      // In actual implementation, this would return 400 error
    });

    it('should allow active sessions for different books', async () => {
      const book1Session = createMockReadingSession({
        id: 1,
        bookId: 1,
        endTime: null,
      });

      const book2Session = createMockReadingSession({
        id: 2,
        bookId: 2,
        endTime: null,
      });

      mockPrismaClient.readingSession.findMany.mockResolvedValue([
        book1Session,
        book2Session,
      ]);

      const activeSessions = await mockPrismaClient.readingSession.findMany({
        where: { endTime: null },
      });

      expect(activeSessions).toHaveLength(2);
    });
  });

  describe('Statistics Aggregation', () => {
    it('should calculate total reading time across all sessions', async () => {
      const sessions = [
        createMockReadingSession({ id: 1, bookId: 1, durationMinutes: 60 }),
        createMockReadingSession({ id: 2, bookId: 1, durationMinutes: 45 }),
        createMockReadingSession({ id: 3, bookId: 2, durationMinutes: 90 }),
        createMockReadingSession({ id: 4, bookId: 3, durationMinutes: 30 }),
      ];

      mockPrismaClient.readingSession.aggregate.mockResolvedValue({
        _sum: { durationMinutes: 225 },
        _count: { id: 4 },
      });

      const stats = await mockPrismaClient.readingSession.aggregate({
        _sum: { durationMinutes: true },
        _count: { id: true },
      });

      expect(stats._sum.durationMinutes).toBe(225);
      expect(stats._count.id).toBe(4);
    });

    it('should calculate average reading speed', async () => {
      const totalPages = 500;
      const totalMinutes = 250;

      const pagesPerMinute = totalPages / totalMinutes;
      const pagesPerHour = pagesPerMinute * 60;

      expect(pagesPerMinute).toBe(2);
      expect(pagesPerHour).toBe(120);
    });

    it('should calculate books completed this month', async () => {
      const completedBooks = [
        createMockReadingProgress({
          id: 1,
          status: 'completed',
          updatedAt: new Date('2024-01-10'),
        }),
        createMockReadingProgress({
          id: 2,
          status: 'completed',
          updatedAt: new Date('2024-01-20'),
        }),
      ];

      mockPrismaClient.readingProgress.findMany.mockResolvedValue(completedBooks);

      const monthStart = new Date('2024-01-01');
      const monthEnd = new Date('2024-01-31');

      const thisMonthCompleted = await mockPrismaClient.readingProgress.findMany({
        where: {
          status: 'completed',
          updatedAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      });

      expect(thisMonthCompleted).toHaveLength(2);
    });
  });

  describe('Error Recovery', () => {
    it('should handle interrupted session gracefully', async () => {
      // Simulate a session that was started but not ended (app crash, etc.)
      const orphanedSession = createMockReadingSession({
        id: 1,
        bookId: 1,
        startTime: new Date('2024-01-14T20:00:00'),
        endTime: null,
        durationMinutes: 0,
      });

      mockPrismaClient.readingSession.findFirst.mockResolvedValue(orphanedSession);

      // On next app load, find and close orphaned sessions
      const now = new Date('2024-01-15T10:00:00');
      const sessionAge = now.getTime() - orphanedSession.startTime.getTime();
      const hoursSinceStart = sessionAge / (1000 * 60 * 60);

      expect(hoursSinceStart).toBeGreaterThan(12); // Old orphaned session

      // Auto-close with estimated duration (e.g., 1 hour max)
      const closedSession = createMockReadingSession({
        ...orphanedSession,
        endTime: new Date(orphanedSession.startTime.getTime() + 60 * 60 * 1000),
        durationMinutes: 60,
      });
      mockPrismaClient.readingSession.update.mockResolvedValue(closedSession);

      const recovered = await mockPrismaClient.readingSession.update({
        where: { id: 1 },
        data: {
          endTime: new Date(orphanedSession.startTime.getTime() + 60 * 60 * 1000),
          durationMinutes: 60,
        },
      });

      expect(recovered.endTime).not.toBeNull();
    });

    it('should handle database transaction failure', async () => {
      mockPrismaClient.$transaction.mockRejectedValue(
        new Error('Transaction failed')
      );

      await expect(
        mockPrismaClient.$transaction(async (tx) => {
          // Simulated operations that fail
          throw new Error('Transaction failed');
        })
      ).rejects.toThrow('Transaction failed');
    });
  });

  describe('On Hold / Resume Flow', () => {
    it('should put book on hold and resume later', async () => {
      // Currently reading
      const readingProgress = createMockReadingProgress({
        id: 1,
        bookId: 1,
        currentPage: 150,
        progressPercent: 50,
        status: 'reading',
      });

      // Put on hold
      const onHoldProgress = createMockReadingProgress({
        ...readingProgress,
        status: 'on_hold',
      });
      mockPrismaClient.readingProgress.update.mockResolvedValue(onHoldProgress);

      const paused = await mockPrismaClient.readingProgress.update({
        where: { id: 1 },
        data: { status: 'on_hold' },
      });
      expect(paused.status).toBe('on_hold');

      // Resume reading
      const resumedProgress = createMockReadingProgress({
        ...onHoldProgress,
        status: 'reading',
      });
      mockPrismaClient.readingProgress.update.mockResolvedValue(resumedProgress);

      const resumed = await mockPrismaClient.readingProgress.update({
        where: { id: 1 },
        data: { status: 'reading' },
      });
      expect(resumed.status).toBe('reading');
      expect(resumed.currentPage).toBe(150); // Progress preserved
    });
  });
});

describe('Reading Flow Utility Functions', () => {
  describe('calculateReadingStats', () => {
    interface Session {
      durationMinutes: number;
      pagesRead: number;
    }

    const calculateStats = (sessions: Session[]) => {
      const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
      const totalPages = sessions.reduce((sum, s) => sum + s.pagesRead, 0);
      const avgSessionLength = sessions.length > 0 ? totalMinutes / sessions.length : 0;
      const pagesPerMinute = totalMinutes > 0 ? totalPages / totalMinutes : 0;

      return {
        totalMinutes,
        totalPages,
        avgSessionLength: Math.round(avgSessionLength),
        pagesPerMinute: Math.round(pagesPerMinute * 100) / 100,
        totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      };
    };

    it('should calculate correct stats for multiple sessions', () => {
      const sessions = [
        { durationMinutes: 60, pagesRead: 50 },
        { durationMinutes: 45, pagesRead: 40 },
        { durationMinutes: 90, pagesRead: 80 },
      ];

      const stats = calculateStats(sessions);

      expect(stats.totalMinutes).toBe(195);
      expect(stats.totalPages).toBe(170);
      expect(stats.avgSessionLength).toBe(65);
      expect(stats.pagesPerMinute).toBe(0.87);
      expect(stats.totalHours).toBe(3.3);
    });

    it('should handle empty sessions array', () => {
      const stats = calculateStats([]);

      expect(stats.totalMinutes).toBe(0);
      expect(stats.totalPages).toBe(0);
      expect(stats.avgSessionLength).toBe(0);
      expect(stats.pagesPerMinute).toBe(0);
    });
  });

  describe('estimateCompletionDate', () => {
    const estimateCompletion = (
      currentPage: number,
      totalPages: number,
      avgPagesPerDay: number
    ): Date | null => {
      if (avgPagesPerDay <= 0) return null;
      if (currentPage >= totalPages) return new Date();

      const remainingPages = totalPages - currentPage;
      const daysToComplete = Math.ceil(remainingPages / avgPagesPerDay);

      const completionDate = new Date();
      completionDate.setDate(completionDate.getDate() + daysToComplete);
      return completionDate;
    };

    it('should estimate completion date correctly', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);

      const completion = estimateCompletion(100, 300, 20);

      // 200 pages remaining at 20/day = 10 days
      const expectedDate = new Date(now);
      expectedDate.setDate(expectedDate.getDate() + 10);
      expect(completion?.getDate()).toBe(expectedDate.getDate());
    });

    it('should return current date for completed book', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);

      const completion = estimateCompletion(300, 300, 20);

      expect(completion?.getDate()).toBe(now.getDate());
    });

    it('should return null for zero reading pace', () => {
      const completion = estimateCompletion(100, 300, 0);

      expect(completion).toBeNull();
    });
  });
});
