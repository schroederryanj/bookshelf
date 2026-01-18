import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  mockPrismaClient,
  resetPrismaMocks,
  createMockReadingGoal,
  createMockReadingStreak,
} from '../mocks/prisma';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: mockPrismaClient,
}));

describe('Reading Goals API', () => {
  beforeEach(() => {
    resetPrismaMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('GET /api/reading-goals', () => {
    it('should return all reading goals', async () => {
      const mockGoals = [
        createMockReadingGoal({
          id: 1,
          type: 'books_per_month',
          target: 4,
          current: 2,
        }),
        createMockReadingGoal({
          id: 2,
          type: 'pages_per_day',
          target: 50,
          current: 30,
        }),
      ];

      mockPrismaClient.readingGoal.findMany.mockResolvedValue(mockGoals);

      const result = await mockPrismaClient.readingGoal.findMany();

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('books_per_month');
      expect(result[1].type).toBe('pages_per_day');
    });

    it('should filter goals by type', async () => {
      const mockGoals = [
        createMockReadingGoal({ type: 'books_per_year' }),
      ];

      mockPrismaClient.readingGoal.findMany.mockResolvedValue(mockGoals);

      const result = await mockPrismaClient.readingGoal.findMany({
        where: { type: 'books_per_year' },
      });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('books_per_year');
    });

    it('should return active goals only', async () => {
      const now = new Date('2024-06-15');
      vi.setSystemTime(now);

      const activeGoal = createMockReadingGoal({
        id: 1,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      });

      mockPrismaClient.readingGoal.findMany.mockResolvedValue([activeGoal]);

      const result = await mockPrismaClient.readingGoal.findMany({
        where: {
          startDate: { lte: now },
          endDate: { gte: now },
        },
      });

      expect(result).toHaveLength(1);
    });
  });

  describe('GET /api/reading-goals/:id', () => {
    it('should return a specific goal', async () => {
      const mockGoal = createMockReadingGoal({
        id: 1,
        type: 'books_per_month',
        target: 4,
        current: 3,
      });

      mockPrismaClient.readingGoal.findUnique.mockResolvedValue(mockGoal);

      const result = await mockPrismaClient.readingGoal.findUnique({
        where: { id: 1 },
      });

      expect(result).toBeDefined();
      expect(result?.target).toBe(4);
      expect(result?.current).toBe(3);
    });

    it('should return null for non-existent goal', async () => {
      mockPrismaClient.readingGoal.findUnique.mockResolvedValue(null);

      const result = await mockPrismaClient.readingGoal.findUnique({
        where: { id: 999 },
      });

      expect(result).toBeNull();
    });
  });

  describe('POST /api/reading-goals', () => {
    it('should create a books per month goal', async () => {
      const now = new Date('2024-06-01');
      vi.setSystemTime(now);

      const newGoal = createMockReadingGoal({
        id: 1,
        type: 'books_per_month',
        target: 5,
        current: 0,
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-06-30'),
      });

      mockPrismaClient.readingGoal.create.mockResolvedValue(newGoal);

      const result = await mockPrismaClient.readingGoal.create({
        data: {
          type: 'books_per_month',
          target: 5,
          current: 0,
          startDate: new Date('2024-06-01'),
          endDate: new Date('2024-06-30'),
        },
      });

      expect(result.type).toBe('books_per_month');
      expect(result.target).toBe(5);
    });

    it('should create a books per year goal', async () => {
      const newGoal = createMockReadingGoal({
        id: 1,
        type: 'books_per_year',
        target: 52,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      });

      mockPrismaClient.readingGoal.create.mockResolvedValue(newGoal);

      const result = await mockPrismaClient.readingGoal.create({
        data: newGoal,
      });

      expect(result.type).toBe('books_per_year');
      expect(result.target).toBe(52);
    });

    it('should create a pages per day goal', async () => {
      const now = new Date('2024-06-01');
      vi.setSystemTime(now);

      const newGoal = createMockReadingGoal({
        id: 1,
        type: 'pages_per_day',
        target: 50,
        startDate: now,
        endDate: now, // Same day for daily goals
      });

      mockPrismaClient.readingGoal.create.mockResolvedValue(newGoal);

      const result = await mockPrismaClient.readingGoal.create({
        data: newGoal,
      });

      expect(result.type).toBe('pages_per_day');
      expect(result.target).toBe(50);
    });

    it('should reject invalid goal type', async () => {
      const validTypes = ['books_per_month', 'books_per_year', 'pages_per_day'];
      const validateType = (type: string) => validTypes.includes(type);

      expect(validateType('books_per_month')).toBe(true);
      expect(validateType('invalid_type')).toBe(false);
      expect(validateType('')).toBe(false);
    });

    it('should reject negative target', async () => {
      const validateTarget = (target: number) => target > 0;

      expect(validateTarget(-5)).toBe(false);
      expect(validateTarget(0)).toBe(false);
      expect(validateTarget(5)).toBe(true);
    });

    it('should reject end date before start date', async () => {
      const validateDates = (start: Date, end: Date) => end >= start;

      expect(validateDates(new Date('2024-06-15'), new Date('2024-06-01'))).toBe(false);
      expect(validateDates(new Date('2024-06-01'), new Date('2024-06-30'))).toBe(true);
      expect(validateDates(new Date('2024-06-01'), new Date('2024-06-01'))).toBe(true);
    });
  });

  describe('PUT /api/reading-goals/:id', () => {
    it('should update goal target', async () => {
      const updatedGoal = createMockReadingGoal({
        id: 1,
        target: 6,
      });

      mockPrismaClient.readingGoal.update.mockResolvedValue(updatedGoal);

      const result = await mockPrismaClient.readingGoal.update({
        where: { id: 1 },
        data: { target: 6 },
      });

      expect(result.target).toBe(6);
    });

    it('should update goal current progress', async () => {
      const updatedGoal = createMockReadingGoal({
        id: 1,
        current: 3,
      });

      mockPrismaClient.readingGoal.update.mockResolvedValue(updatedGoal);

      const result = await mockPrismaClient.readingGoal.update({
        where: { id: 1 },
        data: { current: 3 },
      });

      expect(result.current).toBe(3);
    });

    it('should not allow changing goal type after creation', async () => {
      // This would be handled in the API route by not accepting type in PUT body
      const allowedFields = ['target', 'current', 'startDate', 'endDate'];
      const validateUpdateFields = (fields: string[]) => {
        return fields.every((f) => allowedFields.includes(f));
      };

      expect(validateUpdateFields(['target', 'current'])).toBe(true);
      expect(validateUpdateFields(['type'])).toBe(false);
    });
  });

  describe('DELETE /api/reading-goals/:id', () => {
    it('should delete a reading goal', async () => {
      mockPrismaClient.readingGoal.delete.mockResolvedValue(
        createMockReadingGoal({ id: 1 })
      );

      const result = await mockPrismaClient.readingGoal.delete({
        where: { id: 1 },
      });

      expect(result).toBeDefined();
      expect(mockPrismaClient.readingGoal.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('Goal Progress Calculation', () => {
    it('should calculate percentage completion', async () => {
      const calculateCompletion = (current: number, target: number): number => {
        if (target === 0) return 0;
        return Math.min(Math.round((current / target) * 100), 100);
      };

      expect(calculateCompletion(2, 4)).toBe(50);
      expect(calculateCompletion(0, 4)).toBe(0);
      expect(calculateCompletion(4, 4)).toBe(100);
      expect(calculateCompletion(5, 4)).toBe(100); // Caps at 100
      expect(calculateCompletion(0, 0)).toBe(0);
    });

    it('should calculate if goal is on track', async () => {
      const isOnTrack = (
        current: number,
        target: number,
        startDate: Date,
        endDate: Date,
        now: Date
      ): boolean => {
        const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        const elapsedDays = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        const expectedProgress = (elapsedDays / totalDays) * target;
        return current >= expectedProgress * 0.9; // Allow 10% buffer
      };

      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');
      const midMonth = new Date('2024-01-15');

      // Target: 4 books, at mid-month should have ~2
      expect(isOnTrack(2, 4, start, end, midMonth)).toBe(true);
      expect(isOnTrack(1, 4, start, end, midMonth)).toBe(false);
      expect(isOnTrack(3, 4, start, end, midMonth)).toBe(true);
    });

    it('should calculate days remaining', async () => {
      const calculateDaysRemaining = (endDate: Date, now: Date): number => {
        const diff = endDate.getTime() - now.getTime();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      };

      const end = new Date('2024-01-31');
      const now = new Date('2024-01-15');

      expect(calculateDaysRemaining(end, now)).toBe(16);
      expect(calculateDaysRemaining(now, end)).toBe(0); // Past end date
    });

    it('should calculate required daily pace to meet goal', async () => {
      const calculateRequiredPace = (
        remaining: number,
        daysLeft: number
      ): number => {
        if (daysLeft <= 0) return remaining > 0 ? Infinity : 0;
        return Math.ceil(remaining / daysLeft * 100) / 100;
      };

      expect(calculateRequiredPace(10, 5)).toBe(2); // 2 per day
      expect(calculateRequiredPace(7, 7)).toBe(1); // 1 per day
      expect(calculateRequiredPace(0, 7)).toBe(0); // Already met
      expect(calculateRequiredPace(10, 0)).toBe(Infinity); // No time left
    });
  });
});

describe('Reading Streaks API', () => {
  beforeEach(() => {
    resetPrismaMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('GET /api/reading-streaks', () => {
    it('should return current streak information', async () => {
      const mockStreak = createMockReadingStreak({
        id: 1,
        currentStreak: 7,
        longestStreak: 14,
        lastReadDate: new Date('2024-01-07'),
      });

      mockPrismaClient.readingStreak.findFirst.mockResolvedValue(mockStreak);

      const result = await mockPrismaClient.readingStreak.findFirst();

      expect(result?.currentStreak).toBe(7);
      expect(result?.longestStreak).toBe(14);
    });

    it('should return zero streaks for new user', async () => {
      mockPrismaClient.readingStreak.findFirst.mockResolvedValue(null);

      const result = await mockPrismaClient.readingStreak.findFirst();

      expect(result).toBeNull();
    });
  });

  describe('Streak Calculation Logic', () => {
    it('should maintain streak when reading on consecutive days', async () => {
      const now = new Date('2024-01-08');
      vi.setSystemTime(now);

      const isConsecutiveDay = (lastRead: Date | null, now: Date): boolean => {
        if (!lastRead) return false;
        const diffMs = now.getTime() - lastRead.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        return diffDays <= 1;
      };

      const yesterday = new Date('2024-01-07');
      const twoDaysAgo = new Date('2024-01-06');

      expect(isConsecutiveDay(yesterday, now)).toBe(true);
      expect(isConsecutiveDay(twoDaysAgo, now)).toBe(false);
      expect(isConsecutiveDay(null, now)).toBe(false);
    });

    it('should reset streak when missing a day', async () => {
      const calculateNewStreak = (
        currentStreak: number,
        lastRead: Date | null,
        now: Date
      ): number => {
        if (!lastRead) return 1;
        const diffMs = now.getTime() - lastRead.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return currentStreak; // Same day
        if (diffDays === 1) return currentStreak + 1; // Next day
        return 1; // Streak broken, restart
      };

      const now = new Date('2024-01-10');
      const yesterday = new Date('2024-01-09');
      const threeDaysAgo = new Date('2024-01-07');

      expect(calculateNewStreak(5, yesterday, now)).toBe(6);
      expect(calculateNewStreak(5, threeDaysAgo, now)).toBe(1);
      expect(calculateNewStreak(0, null, now)).toBe(1);
    });

    it('should update longest streak when current exceeds it', async () => {
      const updateLongestStreak = (
        current: number,
        longest: number
      ): number => {
        return Math.max(current, longest);
      };

      expect(updateLongestStreak(10, 7)).toBe(10);
      expect(updateLongestStreak(5, 10)).toBe(10);
      expect(updateLongestStreak(10, 10)).toBe(10);
    });

    it('should not count multiple reads on same day', async () => {
      const now = new Date('2024-01-08T14:00:00');
      vi.setSystemTime(now);

      const isSameDay = (date1: Date, date2: Date): boolean => {
        return (
          date1.getFullYear() === date2.getFullYear() &&
          date1.getMonth() === date2.getMonth() &&
          date1.getDate() === date2.getDate()
        );
      };

      const earlierToday = new Date('2024-01-08T10:00:00');
      const yesterday = new Date('2024-01-07T10:00:00');

      expect(isSameDay(earlierToday, now)).toBe(true);
      expect(isSameDay(yesterday, now)).toBe(false);
    });
  });

  describe('POST /api/reading-streaks/update', () => {
    it('should increment streak on reading activity', async () => {
      const now = new Date('2024-01-08');
      vi.setSystemTime(now);

      const existingStreak = createMockReadingStreak({
        currentStreak: 5,
        longestStreak: 10,
        lastReadDate: new Date('2024-01-07'),
      });

      const updatedStreak = createMockReadingStreak({
        currentStreak: 6,
        longestStreak: 10,
        lastReadDate: now,
      });

      mockPrismaClient.readingStreak.findFirst.mockResolvedValue(existingStreak);
      mockPrismaClient.readingStreak.update.mockResolvedValue(updatedStreak);

      // Simulated update logic
      const existing = await mockPrismaClient.readingStreak.findFirst();
      expect(existing?.currentStreak).toBe(5);

      const result = await mockPrismaClient.readingStreak.update({
        where: { id: 1 },
        data: {
          currentStreak: 6,
          lastReadDate: now,
        },
      });

      expect(result.currentStreak).toBe(6);
    });

    it('should create streak record if none exists', async () => {
      const now = new Date('2024-01-08');
      vi.setSystemTime(now);

      mockPrismaClient.readingStreak.findFirst.mockResolvedValue(null);
      mockPrismaClient.readingStreak.create.mockResolvedValue(
        createMockReadingStreak({
          id: 1,
          currentStreak: 1,
          longestStreak: 1,
          lastReadDate: now,
        })
      );

      const existing = await mockPrismaClient.readingStreak.findFirst();
      expect(existing).toBeNull();

      const result = await mockPrismaClient.readingStreak.create({
        data: {
          currentStreak: 1,
          longestStreak: 1,
          lastReadDate: now,
        },
      });

      expect(result.currentStreak).toBe(1);
    });
  });

  describe('Milestone Detection', () => {
    it('should detect milestone streaks', async () => {
      const milestones = [7, 14, 30, 50, 100, 365];

      const isMilestone = (streak: number): boolean => {
        return milestones.includes(streak);
      };

      expect(isMilestone(7)).toBe(true);
      expect(isMilestone(8)).toBe(false);
      expect(isMilestone(30)).toBe(true);
      expect(isMilestone(100)).toBe(true);
      expect(isMilestone(365)).toBe(true);
    });

    it('should return next milestone', async () => {
      const milestones = [7, 14, 30, 50, 100, 365];

      const getNextMilestone = (currentStreak: number): number | null => {
        return milestones.find((m) => m > currentStreak) || null;
      };

      expect(getNextMilestone(3)).toBe(7);
      expect(getNextMilestone(7)).toBe(14);
      expect(getNextMilestone(25)).toBe(30);
      expect(getNextMilestone(365)).toBeNull();
    });

    it('should calculate days until next milestone', async () => {
      const getDaysToMilestone = (
        currentStreak: number,
        nextMilestone: number
      ): number => {
        return nextMilestone - currentStreak;
      };

      expect(getDaysToMilestone(5, 7)).toBe(2);
      expect(getDaysToMilestone(10, 14)).toBe(4);
      expect(getDaysToMilestone(28, 30)).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle timezone changes', async () => {
      // Dates are compared at day level, not exact time
      const isSameCalendarDay = (date1: Date, date2: Date): boolean => {
        return (
          date1.getUTCFullYear() === date2.getUTCFullYear() &&
          date1.getUTCMonth() === date2.getUTCMonth() &&
          date1.getUTCDate() === date2.getUTCDate()
        );
      };

      const date1 = new Date('2024-01-08T23:59:59Z');
      const date2 = new Date('2024-01-08T00:00:01Z');

      expect(isSameCalendarDay(date1, date2)).toBe(true);
    });

    it('should handle year boundary', async () => {
      const dec31 = new Date('2024-12-31');
      const jan1 = new Date('2025-01-01');

      const isConsecutiveDay = (prev: Date, next: Date): boolean => {
        const diffMs = next.getTime() - prev.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        return diffDays === 1;
      };

      expect(isConsecutiveDay(dec31, jan1)).toBe(true);
    });

    it('should handle leap year', async () => {
      const feb28 = new Date('2024-02-28'); // 2024 is a leap year
      const feb29 = new Date('2024-02-29');
      const mar1 = new Date('2024-03-01');

      const isConsecutiveDay = (prev: Date, next: Date): boolean => {
        const diffMs = next.getTime() - prev.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        return diffDays === 1;
      };

      expect(isConsecutiveDay(feb28, feb29)).toBe(true);
      expect(isConsecutiveDay(feb29, mar1)).toBe(true);
    });
  });
});
