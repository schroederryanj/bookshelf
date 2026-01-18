/**
 * Reading Patterns Handler
 *
 * Analyze reading patterns and provide statistics:
 * - Average pages per day/week/month
 * - Reading streak information
 * - Most productive reading periods
 * - Time spent reading stats
 *
 * Examples:
 * - "How many pages do I read per day?"
 * - "What's my reading pace?"
 * - "When do I read most?"
 * - "Time spent reading this month"
 */

import { prisma } from "@/lib/prisma";
import { calculateStreak, getReadingStats } from "@/lib/reading-stats";
import {
  CommandHandler,
  errorResult,
  successResult,
  formatNumber,
} from "./types";

/**
 * Main reading patterns handler - comprehensive stats
 */
export const patternsHandler: CommandHandler = async (_intent, context) => {
  try {
    const userId = context.userId;

    // Get session data for pace calculations
    const sessions = await prisma.readingSession.findMany({
      where: {
        userId,
        endTime: { not: null },
        pagesRead: { gt: 0 },
      },
      select: {
        startTime: true,
        pagesRead: true,
        duration: true,
      },
      orderBy: { startTime: "desc" },
    });

    if (sessions.length === 0) {
      return successResult(
        "No reading sessions recorded yet. Start tracking your reading to see patterns!"
      );
    }

    // Calculate pace metrics
    const pace = calculateReadingPace(sessions);

    const lines = [
      "Reading Patterns:",
      `Avg per session: ${pace.avgPagesPerSession} pages`,
      `Avg per day: ${pace.avgPagesPerDay} pages`,
    ];

    if (pace.avgSessionDuration > 0) {
      lines.push(`Avg session: ${formatDuration(pace.avgSessionDuration)}`);
    }

    if (pace.avgPagesPerHour > 0) {
      lines.push(`Reading speed: ~${pace.avgPagesPerHour} pages/hour`);
    }

    // Add streak info
    const streak = await calculateStreak(userId);
    if (streak.currentStreak > 0) {
      lines.push(`Current streak: ${streak.currentStreak} days`);
    }

    return successResult(lines.join("\n"), {
      pace,
      streak: streak.currentStreak,
    });
  } catch (error) {
    console.error("[patterns-handler] Error:", error);
    return errorResult("Sorry, couldn't analyze patterns.", error);
  }
};

/**
 * Reading pace handler - pages per day/week/month
 */
export const readingPaceHandler: CommandHandler = async (_intent, context) => {
  try {
    const userId = context.userId;

    // Get recent sessions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSessions = await prisma.readingSession.findMany({
      where: {
        userId,
        startTime: { gte: thirtyDaysAgo },
        pagesRead: { gt: 0 },
      },
      select: {
        startTime: true,
        pagesRead: true,
        duration: true,
      },
    });

    if (recentSessions.length === 0) {
      return successResult(
        "No reading recorded in the last 30 days. Start a reading session!"
      );
    }

    // Calculate daily averages
    const totalPages = recentSessions.reduce((sum, s) => sum + s.pagesRead, 0);
    const uniqueDays = new Set(
      recentSessions.map(s => s.startTime.toISOString().split("T")[0])
    ).size;

    const avgPerReadingDay = Math.round(totalPages / uniqueDays);
    const avgPerCalendarDay = Math.round(totalPages / 30);
    const weeklyPace = Math.round(avgPerCalendarDay * 7);

    const lines = [
      "Reading Pace (last 30 days):",
      `Total pages: ${formatNumber(totalPages)}`,
      `Days with reading: ${uniqueDays}`,
      `Avg per reading day: ${avgPerReadingDay} pages`,
      `Avg per day: ${avgPerCalendarDay} pages`,
      `Weekly pace: ~${weeklyPace} pages`,
    ];

    return successResult(lines.join("\n"), {
      totalPages,
      uniqueDays,
      avgPerReadingDay,
      avgPerCalendarDay,
    });
  } catch (error) {
    console.error("[patterns-handler] Error:", error);
    return errorResult("Sorry, couldn't calculate pace.", error);
  }
};

/**
 * Streak handler - detailed streak information
 */
export const detailedStreakHandler: CommandHandler = async (_intent, context) => {
  try {
    const streak = await calculateStreak(context.userId);

    if (streak.currentStreak === 0 && streak.longestStreak === 0) {
      return successResult(
        "No reading streak yet! Read today to start building one."
      );
    }

    const lines: string[] = [];

    if (streak.currentStreak > 0) {
      lines.push(`Current streak: ${streak.currentStreak} days`);
      if (streak.streakStartDate) {
        const startDate = streak.streakStartDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        lines.push(`Started: ${startDate}`);
      }

      // Motivational message based on streak length
      if (streak.currentStreak >= 30) {
        lines.push("Amazing dedication!");
      } else if (streak.currentStreak >= 14) {
        lines.push("Great consistency!");
      } else if (streak.currentStreak >= 7) {
        lines.push("Nice streak going!");
      } else if (streak.currentStreak >= 3) {
        lines.push("Keep it up!");
      }
    } else {
      lines.push("No active streak.");
      if (streak.lastReadDate) {
        const lastRead = streak.lastReadDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        lines.push(`Last read: ${lastRead}`);
      }
      lines.push("Read today to start a new streak!");
    }

    if (streak.longestStreak > streak.currentStreak) {
      lines.push(`Best streak: ${streak.longestStreak} days`);
    }

    return successResult(lines.join("\n"), {
      current: streak.currentStreak,
      longest: streak.longestStreak,
    });
  } catch (error) {
    console.error("[patterns-handler] Error:", error);
    return errorResult("Sorry, couldn't fetch streak info.", error);
  }
};

/**
 * Productive periods handler - when user reads most
 */
export const productivePeriodsHandler: CommandHandler = async (_intent, context) => {
  try {
    const userId = context.userId;

    // Get sessions with timing data
    const sessions = await prisma.readingSession.findMany({
      where: {
        userId,
        endTime: { not: null },
        pagesRead: { gt: 0 },
      },
      select: {
        startTime: true,
        pagesRead: true,
        duration: true,
      },
    });

    if (sessions.length < 5) {
      return successResult(
        "Not enough data yet. Track more reading sessions to see patterns!"
      );
    }

    // Analyze by day of week
    const dayStats: Record<number, { pages: number; sessions: number }> = {};
    const hourStats: Record<number, { pages: number; sessions: number }> = {};

    for (const session of sessions) {
      const day = session.startTime.getDay();
      const hour = session.startTime.getHours();

      if (!dayStats[day]) dayStats[day] = { pages: 0, sessions: 0 };
      dayStats[day].pages += session.pagesRead;
      dayStats[day].sessions += 1;

      if (!hourStats[hour]) hourStats[hour] = { pages: 0, sessions: 0 };
      hourStats[hour].pages += session.pagesRead;
      hourStats[hour].sessions += 1;
    }

    // Find best day
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const bestDay = Object.entries(dayStats)
      .sort((a, b) => b[1].pages - a[1].pages)[0];

    // Find best time of day
    const timeSlots: Record<string, { pages: number; sessions: number }> = {
      morning: { pages: 0, sessions: 0 },   // 5-11
      afternoon: { pages: 0, sessions: 0 }, // 12-17
      evening: { pages: 0, sessions: 0 },   // 18-21
      night: { pages: 0, sessions: 0 },     // 22-4
    };

    for (const [hourStr, stats] of Object.entries(hourStats)) {
      const hour = parseInt(hourStr);
      if (hour >= 5 && hour < 12) {
        timeSlots.morning.pages += stats.pages;
        timeSlots.morning.sessions += stats.sessions;
      } else if (hour >= 12 && hour < 18) {
        timeSlots.afternoon.pages += stats.pages;
        timeSlots.afternoon.sessions += stats.sessions;
      } else if (hour >= 18 && hour < 22) {
        timeSlots.evening.pages += stats.pages;
        timeSlots.evening.sessions += stats.sessions;
      } else {
        timeSlots.night.pages += stats.pages;
        timeSlots.night.sessions += stats.sessions;
      }
    }

    const bestTimeSlot = Object.entries(timeSlots)
      .sort((a, b) => b[1].pages - a[1].pages)[0];

    const lines = [
      "Productive Reading Times:",
      `Best day: ${dayNames[parseInt(bestDay[0])]} (${formatNumber(bestDay[1].pages)} pages)`,
      `Best time: ${capitalizeFirst(bestTimeSlot[0])} (${formatNumber(bestTimeSlot[1].pages)} pages)`,
      `Total sessions: ${sessions.length}`,
    ];

    return successResult(lines.join("\n"), {
      bestDay: dayNames[parseInt(bestDay[0])],
      bestTime: bestTimeSlot[0],
      totalSessions: sessions.length,
    });
  } catch (error) {
    console.error("[patterns-handler] Error:", error);
    return errorResult("Sorry, couldn't analyze productive periods.", error);
  }
};

/**
 * Time spent reading handler
 */
export const timeSpentHandler: CommandHandler = async (intent, context) => {
  try {
    const userId = context.userId;
    const period = (intent.params.period as string) || "month";

    // Determine date range
    const now = new Date();
    let startDate: Date;
    let periodLabel: string;

    switch (period.toLowerCase()) {
      case "week":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        periodLabel = "This week";
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        periodLabel = "This year";
        break;
      case "all":
        startDate = new Date(0);
        periodLabel = "All time";
        break;
      case "month":
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        periodLabel = "This month";
    }

    // Get sessions in range
    const sessions = await prisma.readingSession.aggregate({
      where: {
        userId,
        startTime: { gte: startDate },
        endTime: { not: null },
      },
      _sum: {
        duration: true,
        pagesRead: true,
      },
      _count: true,
    });

    const totalSeconds = sessions._sum.duration || 0;
    const totalPages = sessions._sum.pagesRead || 0;
    const sessionCount = sessions._count;

    if (totalSeconds === 0 && sessionCount === 0) {
      return successResult(`${periodLabel}: No reading sessions recorded.`);
    }

    const lines = [
      `${periodLabel}:`,
      `Time: ${formatDuration(totalSeconds)}`,
      `Pages: ${formatNumber(totalPages)}`,
      `Sessions: ${sessionCount}`,
    ];

    if (sessionCount > 0) {
      const avgMinutes = Math.round(totalSeconds / sessionCount / 60);
      lines.push(`Avg session: ${avgMinutes} min`);
    }

    return successResult(lines.join("\n"), {
      period: periodLabel,
      totalSeconds,
      totalPages,
      sessionCount,
    });
  } catch (error) {
    console.error("[patterns-handler] Error:", error);
    return errorResult("Sorry, couldn't calculate time spent.", error);
  }
};

/**
 * Books completion rate handler
 */
export const completionRateHandler: CommandHandler = async (_intent, context) => {
  try {
    const stats = await getReadingStats(context.userId);

    const totalBooks = stats.totalBooksRead + stats.totalBooksReading +
      stats.totalBooksNotStarted + stats.totalBooksDnf;

    if (totalBooks === 0) {
      return successResult("No books in library yet!");
    }

    const completionRate = Math.round((stats.totalBooksRead / totalBooks) * 100);
    const dnfRate = stats.totalBooksDnf > 0
      ? Math.round((stats.totalBooksDnf / (stats.totalBooksRead + stats.totalBooksDnf)) * 100)
      : 0;

    const lines = [
      "Completion Stats:",
      `Completed: ${stats.totalBooksRead}/${totalBooks} (${completionRate}%)`,
      `Currently reading: ${stats.totalBooksReading}`,
      `Not started: ${stats.totalBooksNotStarted}`,
    ];

    if (stats.totalBooksDnf > 0) {
      lines.push(`DNF: ${stats.totalBooksDnf} (${dnfRate}% of finished)`);
    }

    if (stats.averageDaysToComplete > 0) {
      lines.push(`Avg completion time: ${stats.averageDaysToComplete} days`);
    }

    return successResult(lines.join("\n"), {
      completionRate,
      stats,
    });
  } catch (error) {
    console.error("[patterns-handler] Error:", error);
    return errorResult("Sorry, couldn't calculate completion rate.", error);
  }
};

// Helper functions

interface ReadingPace {
  avgPagesPerSession: number;
  avgPagesPerDay: number;
  avgPagesPerHour: number;
  avgSessionDuration: number;
}

function calculateReadingPace(
  sessions: Array<{ startTime: Date; pagesRead: number; duration: number | null }>
): ReadingPace {
  if (sessions.length === 0) {
    return {
      avgPagesPerSession: 0,
      avgPagesPerDay: 0,
      avgPagesPerHour: 0,
      avgSessionDuration: 0,
    };
  }

  const totalPages = sessions.reduce((sum, s) => sum + s.pagesRead, 0);
  const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);

  // Get unique days
  const uniqueDays = new Set(
    sessions.map(s => s.startTime.toISOString().split("T")[0])
  ).size;

  // Calculate pages per hour (only if we have duration data)
  let avgPagesPerHour = 0;
  if (totalDuration > 0) {
    avgPagesPerHour = Math.round(totalPages / (totalDuration / 3600));
  }

  return {
    avgPagesPerSession: Math.round(totalPages / sessions.length),
    avgPagesPerDay: uniqueDays > 0 ? Math.round(totalPages / uniqueDays) : 0,
    avgPagesPerHour,
    avgSessionDuration: sessions.length > 0 ? Math.round(totalDuration / sessions.length) : 0,
  };
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
