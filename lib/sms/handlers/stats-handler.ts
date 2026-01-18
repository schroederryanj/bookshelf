/**
 * Stats Handler - Get reading statistics
 */

import { prisma } from "@/lib/prisma";
import { getReadingStats } from "@/lib/reading-stats";
import {
  CommandHandler,
  errorResult,
  successResult,
  formatNumber,
} from "./types";

/**
 * Get comprehensive reading stats
 */
export const statsHandler: CommandHandler = async (_intent, context) => {
  try {
    const stats = await getReadingStats(context.userId);

    const lines = [
      `Books read: ${stats.totalBooksRead}`,
      `Currently reading: ${stats.totalBooksReading}`,
      `Pages read: ${formatNumber(stats.totalPagesRead)}`,
      stats.streak.currentStreak > 0
        ? `Streak: ${stats.streak.currentStreak} days`
        : null,
      stats.averageBooksPerMonth > 0
        ? `Avg: ${stats.averageBooksPerMonth.toFixed(1)} books/month`
        : null,
    ].filter(Boolean);

    return successResult(lines.join("\n"), {
      stats: {
        booksRead: stats.totalBooksRead,
        reading: stats.totalBooksReading,
        pages: stats.totalPagesRead,
        streak: stats.streak.currentStreak,
      },
    });
  } catch (error) {
    return errorResult("Sorry, couldn't fetch stats. Try again.", error);
  }
};

/**
 * Get books read this year
 */
export const yearlyStatsHandler: CommandHandler = async (_intent, context) => {
  try {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);

    // Count from ReadingProgress
    const completedThisYear = await prisma.readingProgress.count({
      where: {
        userId: context.userId,
        status: "COMPLETED",
        completedAt: { gte: startOfYear },
      },
    });

    // Also count directly-read books with dateFinished this year
    const directRead = await prisma.book.count({
      where: {
        read: "Read",
        dateFinished: { startsWith: currentYear.toString() },
      },
    });

    // Get some of the books
    const recentBooks = await prisma.readingProgress.findMany({
      where: {
        userId: context.userId,
        status: "COMPLETED",
        completedAt: { gte: startOfYear },
      },
      include: {
        book: { select: { title: true } },
      },
      orderBy: { completedAt: "desc" },
      take: 3,
    });

    const total = completedThisYear + directRead;

    const lines = [`Books in ${currentYear}: ${total}`];

    if (recentBooks.length > 0) {
      lines.push("Recent:");
      recentBooks.forEach((p, idx) => {
        lines.push(`${idx + 1}. ${p.book.title.slice(0, 35)}`);
      });
    }

    return successResult(lines.join("\n"), { year: currentYear, count: total });
  } catch (error) {
    return errorResult("Sorry, couldn't fetch yearly stats.", error);
  }
};

/**
 * Get books read this month
 */
export const monthlyStatsHandler: CommandHandler = async (_intent, context) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthName = now.toLocaleString("default", { month: "long" });

    const completedThisMonth = await prisma.readingProgress.count({
      where: {
        userId: context.userId,
        status: "COMPLETED",
        completedAt: { gte: startOfMonth },
      },
    });

    // Count pages read this month
    const sessionsThisMonth = await prisma.readingSession.aggregate({
      where: {
        userId: context.userId,
        startTime: { gte: startOfMonth },
      },
      _sum: { pagesRead: true },
    });

    const pages = sessionsThisMonth._sum.pagesRead || 0;

    return successResult(
      `${monthName}: ${completedThisMonth} books, ${formatNumber(pages)} pages`,
      { month: monthName, books: completedThisMonth, pages }
    );
  } catch (error) {
    return errorResult("Sorry, couldn't fetch monthly stats.", error);
  }
};

/**
 * Get current reading streak info
 */
export const streakHandler: CommandHandler = async (_intent, context) => {
  try {
    const stats = await getReadingStats(context.userId);
    const { streak } = stats;

    if (streak.currentStreak === 0 && streak.longestStreak === 0) {
      return successResult("No streak yet! Start reading to build one.");
    }

    const lines = [];

    if (streak.currentStreak > 0) {
      lines.push(`Current streak: ${streak.currentStreak} days`);
      if (streak.streakStartDate) {
        const startDate = streak.streakStartDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        lines.push(`Started: ${startDate}`);
      }
    } else {
      lines.push("No active streak. Read today to start one!");
    }

    if (streak.longestStreak > streak.currentStreak) {
      lines.push(`Best streak: ${streak.longestStreak} days`);
    }

    return successResult(lines.join("\n"), {
      current: streak.currentStreak,
      longest: streak.longestStreak,
    });
  } catch (error) {
    return errorResult("Sorry, couldn't fetch streak info.", error);
  }
};

/**
 * Get favorite genres based on reading history
 */
export const genreStatsHandler: CommandHandler = async (_intent, _context) => {
  try {
    // Get all read books with genres
    const readBooks = await prisma.book.findMany({
      where: {
        read: { in: ["Read", "Finished"] },
        genre: { not: null },
      },
      select: { genre: true },
    });

    if (readBooks.length === 0) {
      return successResult("No genre data yet. Read and rate some books!");
    }

    // Count genres
    const genreCount: Record<string, number> = {};
    readBooks.forEach(book => {
      if (book.genre) {
        const genres = book.genre.split(",").map(g => g.trim()).filter(Boolean);
        genres.forEach(g => {
          genreCount[g] = (genreCount[g] || 0) + 1;
        });
      }
    });

    // Sort and get top genres
    const topGenres = Object.entries(genreCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (topGenres.length === 0) {
      return successResult("No genre data available. Add genres to your books!");
    }

    const lines = ["Top genres:"];
    topGenres.forEach(([genre, count], idx) => {
      lines.push(`${idx + 1}. ${genre} (${count})`);
    });

    return successResult(lines.join("\n"), {
      genres: topGenres.map(([g, c]) => ({ genre: g, count: c })),
    });
  } catch (error) {
    return errorResult("Sorry, couldn't fetch genre stats.", error);
  }
};

/**
 * Get a quick summary suitable for SMS
 */
export const quickStatsHandler: CommandHandler = async (_intent, context) => {
  try {
    const stats = await getReadingStats(context.userId);

    const parts = [
      `${stats.totalBooksRead} read`,
      `${stats.totalBooksReading} reading`,
      stats.streak.currentStreak > 0 ? `${stats.streak.currentStreak}d streak` : null,
    ].filter(Boolean);

    return successResult(parts.join(" | "));
  } catch (error) {
    return errorResult("Stats unavailable.", error);
  }
};
