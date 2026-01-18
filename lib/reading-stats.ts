import { prisma } from "@/lib/prisma";

export interface ReadingStreak {
  currentStreak: number;
  longestStreak: number;
  lastReadDate: Date | null;
  streakStartDate: Date | null;
}

export interface ReadingMilestone {
  id: string;
  name: string;
  description: string;
  achieved: boolean;
  achievedAt: Date | null;
  progress: number;
  target: number;
}

export interface ReadingStats {
  totalBooksRead: number;
  totalBooksReading: number;
  totalBooksNotStarted: number;
  totalBooksDnf: number;
  totalPagesRead: number;
  totalReadingTime: number; // in seconds
  averagePagesPerSession: number;
  averageSessionDuration: number; // in seconds
  averageBooksPerMonth: number;
  averageDaysToComplete: number;
  streak: ReadingStreak;
  milestones: ReadingMilestone[];
}

// Calculate reading streak (consecutive days with reading activity)
export async function calculateStreak(userId: string): Promise<ReadingStreak> {
  // Get all unique reading days (from sessions)
  const sessions = await prisma.readingSession.findMany({
    where: {
      userId,
      endTime: { not: null },
      pagesRead: { gt: 0 },
    },
    orderBy: { startTime: "desc" },
    select: { startTime: true },
  });

  if (sessions.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastReadDate: null,
      streakStartDate: null,
    };
  }

  // Extract unique dates (YYYY-MM-DD format)
  const uniqueDates: string[] = [...new Set(
    sessions.map((s) => s.startTime.toISOString().split("T")[0])
  )].sort().reverse();

  if (uniqueDates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastReadDate: null,
      streakStartDate: null,
    };
  }

  const lastReadDate = new Date(uniqueDates[0]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Check if streak is still active (read today or yesterday)
  const lastReadDay = new Date(lastReadDate);
  lastReadDay.setHours(0, 0, 0, 0);

  const isStreakActive = lastReadDay >= yesterday;

  // Calculate current streak
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let streakStartDate: Date | null = null;
  let currentStreakStart: Date | null = null;

  for (let i = 0; i < uniqueDates.length; i++) {
    const currentDate = new Date(uniqueDates[i]);
    currentDate.setHours(0, 0, 0, 0);

    if (i === 0) {
      tempStreak = 1;
      currentStreakStart = currentDate;
    } else {
      const prevDate = new Date(uniqueDates[i - 1]);
      prevDate.setHours(0, 0, 0, 0);

      const diffDays = Math.round(
        (prevDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 1) {
        tempStreak++;
        currentStreakStart = currentDate;
      } else {
        // Streak broken, check if this was the longest
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
        // Reset for next streak
        tempStreak = 1;
        currentStreakStart = currentDate;
      }
    }

    // After first iteration, capture current streak if still active
    if (i === uniqueDates.length - 1 ||
        (i > 0 && Math.round((new Date(uniqueDates[i - 1]).getTime() - new Date(uniqueDates[i]).getTime()) / (1000 * 60 * 60 * 24)) !== 1)) {
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    }
  }

  // Recalculate current streak from today/yesterday backwards
  if (isStreakActive) {
    currentStreak = 1;
    streakStartDate = lastReadDate;

    for (let i = 1; i < uniqueDates.length; i++) {
      const currentDate = new Date(uniqueDates[i]);
      const prevDate = new Date(uniqueDates[i - 1]);

      const diffDays = Math.round(
        (prevDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 1) {
        currentStreak++;
        streakStartDate = currentDate;
      } else {
        break;
      }
    }
  }

  // Final longest streak check
  if (tempStreak > longestStreak) {
    longestStreak = tempStreak;
  }

  return {
    currentStreak: isStreakActive ? currentStreak : 0,
    longestStreak,
    lastReadDate,
    streakStartDate: isStreakActive ? streakStartDate : null,
  };
}

// Define and check milestones
export async function calculateMilestones(userId: string): Promise<ReadingMilestone[]> {
  const completedBooks = await prisma.readingProgress.findMany({
    where: {
      userId,
      status: "COMPLETED",
    },
    orderBy: { completedAt: "asc" },
  });

  const totalSessions = await prisma.readingSession.count({
    where: { userId, endTime: { not: null } },
  });

  const totalPagesResult = await prisma.readingSession.aggregate({
    where: { userId },
    _sum: { pagesRead: true },
  });
  const totalPages = totalPagesResult._sum.pagesRead || 0;

  const totalTimeResult = await prisma.readingSession.aggregate({
    where: { userId, duration: { not: null } },
    _sum: { duration: true },
  });
  const totalMinutes = Math.floor((totalTimeResult._sum.duration || 0) / 60);

  const streak = await calculateStreak(userId);

  // Define milestones
  const milestoneDefinitions = [
    // Book completion milestones
    { id: "first_book", name: "First Book", description: "Complete your first book", target: 1, getValue: () => completedBooks.length },
    { id: "bookworm", name: "Bookworm", description: "Complete 5 books", target: 5, getValue: () => completedBooks.length },
    { id: "avid_reader", name: "Avid Reader", description: "Complete 10 books", target: 10, getValue: () => completedBooks.length },
    { id: "bibliophile", name: "Bibliophile", description: "Complete 25 books", target: 25, getValue: () => completedBooks.length },
    { id: "book_dragon", name: "Book Dragon", description: "Complete 50 books", target: 50, getValue: () => completedBooks.length },
    { id: "literary_legend", name: "Literary Legend", description: "Complete 100 books", target: 100, getValue: () => completedBooks.length },

    // Session milestones
    { id: "first_session", name: "Getting Started", description: "Complete your first reading session", target: 1, getValue: () => totalSessions },
    { id: "consistent_reader", name: "Consistent Reader", description: "Complete 50 reading sessions", target: 50, getValue: () => totalSessions },
    { id: "dedicated_reader", name: "Dedicated Reader", description: "Complete 100 reading sessions", target: 100, getValue: () => totalSessions },

    // Page milestones
    { id: "page_turner", name: "Page Turner", description: "Read 500 pages", target: 500, getValue: () => totalPages },
    { id: "thousand_pages", name: "Thousand Pages", description: "Read 1,000 pages", target: 1000, getValue: () => totalPages },
    { id: "page_master", name: "Page Master", description: "Read 5,000 pages", target: 5000, getValue: () => totalPages },
    { id: "page_legend", name: "Page Legend", description: "Read 10,000 pages", target: 10000, getValue: () => totalPages },

    // Time milestones
    { id: "hour_reader", name: "Hour Reader", description: "Read for 1 hour total", target: 60, getValue: () => totalMinutes },
    { id: "ten_hours", name: "Ten Hours", description: "Read for 10 hours total", target: 600, getValue: () => totalMinutes },
    { id: "hundred_hours", name: "Hundred Hours", description: "Read for 100 hours total", target: 6000, getValue: () => totalMinutes },

    // Streak milestones
    { id: "three_day_streak", name: "Getting Hooked", description: "Maintain a 3-day reading streak", target: 3, getValue: () => streak.longestStreak },
    { id: "week_streak", name: "Week Warrior", description: "Maintain a 7-day reading streak", target: 7, getValue: () => streak.longestStreak },
    { id: "two_week_streak", name: "Fortnight Focus", description: "Maintain a 14-day reading streak", target: 14, getValue: () => streak.longestStreak },
    { id: "month_streak", name: "Month Master", description: "Maintain a 30-day reading streak", target: 30, getValue: () => streak.longestStreak },
  ];

  const milestones: ReadingMilestone[] = milestoneDefinitions.map((def) => {
    const progress = def.getValue();
    const achieved = progress >= def.target;

    // Find achievement date for book milestones
    let achievedAt: Date | null = null;
    if (achieved && def.id.includes("book") && completedBooks.length >= def.target) {
      achievedAt = completedBooks[def.target - 1]?.completedAt || null;
    }

    return {
      id: def.id,
      name: def.name,
      description: def.description,
      achieved,
      achievedAt,
      progress,
      target: def.target,
    };
  });

  return milestones;
}

// Get comprehensive reading stats
export async function getReadingStats(userId: string): Promise<ReadingStats> {
  // Count books by status
  const statusCounts = await prisma.readingProgress.groupBy({
    by: ["status"],
    where: { userId },
    _count: true,
  });

  const getCount = (status: string) =>
    statusCounts.find((s) => s.status === status)?._count || 0;

  // Get session aggregates
  const sessionStats = await prisma.readingSession.aggregate({
    where: { userId, endTime: { not: null } },
    _sum: { pagesRead: true, duration: true },
    _count: true,
    _avg: { pagesRead: true, duration: true },
  });

  // Calculate average books per month
  const firstCompletion = await prisma.readingProgress.findFirst({
    where: { userId, status: "COMPLETED", completedAt: { not: null } },
    orderBy: { completedAt: "asc" },
  });

  let averageBooksPerMonth = 0;
  const totalCompleted = getCount("COMPLETED");

  if (firstCompletion?.completedAt && totalCompleted > 0) {
    const monthsSinceFirst = Math.max(
      1,
      (Date.now() - firstCompletion.completedAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    averageBooksPerMonth = Math.round((totalCompleted / monthsSinceFirst) * 100) / 100;
  }

  // Calculate average days to complete a book
  const completedWithDates = await prisma.readingProgress.findMany({
    where: {
      userId,
      status: "COMPLETED",
      startedAt: { not: null },
      completedAt: { not: null },
    },
  });

  let averageDaysToComplete = 0;
  if (completedWithDates.length > 0) {
    const totalDays = completedWithDates.reduce((acc, p) => {
      if (p.startedAt && p.completedAt) {
        return acc + (p.completedAt.getTime() - p.startedAt.getTime()) / (1000 * 60 * 60 * 24);
      }
      return acc;
    }, 0);
    averageDaysToComplete = Math.round(totalDays / completedWithDates.length);
  }

  // Get streak and milestones
  const streak = await calculateStreak(userId);
  const milestones = await calculateMilestones(userId);

  return {
    totalBooksRead: totalCompleted,
    totalBooksReading: getCount("READING"),
    totalBooksNotStarted: getCount("NOT_STARTED"),
    totalBooksDnf: getCount("DNF"),
    totalPagesRead: sessionStats._sum.pagesRead || 0,
    totalReadingTime: sessionStats._sum.duration || 0,
    averagePagesPerSession: Math.round(sessionStats._avg.pagesRead || 0),
    averageSessionDuration: Math.round(sessionStats._avg.duration || 0),
    averageBooksPerMonth,
    averageDaysToComplete,
    streak,
    milestones,
  };
}
