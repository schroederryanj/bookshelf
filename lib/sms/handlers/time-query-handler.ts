/**
 * Time Query Handler - Time-based book queries
 *
 * Handles queries like:
 * - "Books read last month"
 * - "What did I read in 2023?"
 * - "Books finished this year"
 * - "Reading history for January"
 */

import { prisma } from "@/lib/prisma";
import {
  CommandHandler,
  errorResult,
  successResult,
  truncate,
  formatNumber,
} from "./types";

/**
 * Parse natural language time references
 */
function parseTimeRange(input: string): { start: Date; end: Date; label: string } | null {
  const now = new Date();
  const inputLower = input.toLowerCase().trim();

  // "this year" / "2024" / current year
  if (inputLower === "this year" || inputLower === now.getFullYear().toString()) {
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
      label: now.getFullYear().toString(),
    };
  }

  // "last year"
  if (inputLower === "last year") {
    const lastYear = now.getFullYear() - 1;
    return {
      start: new Date(lastYear, 0, 1),
      end: new Date(lastYear, 11, 31, 23, 59, 59),
      label: lastYear.toString(),
    };
  }

  // Specific year (e.g., "2023")
  const yearMatch = inputLower.match(/^(\d{4})$/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1], 10);
    return {
      start: new Date(year, 0, 1),
      end: new Date(year, 11, 31, 23, 59, 59),
      label: year.toString(),
    };
  }

  // "this month"
  if (inputLower === "this month") {
    const monthName = now.toLocaleString("default", { month: "long" });
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      label: `${monthName} ${now.getFullYear()}`,
    };
  }

  // "last month"
  if (inputLower === "last month") {
    const lastMonth = now.getMonth() - 1;
    const year = lastMonth < 0 ? now.getFullYear() - 1 : now.getFullYear();
    const month = lastMonth < 0 ? 11 : lastMonth;
    const monthName = new Date(year, month, 1).toLocaleString("default", { month: "long" });
    return {
      start: new Date(year, month, 1),
      end: new Date(year, month + 1, 0, 23, 59, 59),
      label: `${monthName} ${year}`,
    };
  }

  // Month names (e.g., "january", "jan")
  const months = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
  ];
  const shortMonths = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

  for (let i = 0; i < months.length; i++) {
    if (inputLower === months[i] || inputLower === shortMonths[i]) {
      // Assume current year if month is in the past, otherwise last year
      let year = now.getFullYear();
      if (i > now.getMonth()) {
        year = now.getFullYear() - 1;
      }
      const monthName = months[i].charAt(0).toUpperCase() + months[i].slice(1);
      return {
        start: new Date(year, i, 1),
        end: new Date(year, i + 1, 0, 23, 59, 59),
        label: `${monthName} ${year}`,
      };
    }
  }

  // "Month Year" format (e.g., "January 2023", "Jan 2024")
  const monthYearMatch = inputLower.match(/^(\w+)\s+(\d{4})$/);
  if (monthYearMatch) {
    const monthStr = monthYearMatch[1];
    const year = parseInt(monthYearMatch[2], 10);

    let monthIdx = months.indexOf(monthStr);
    if (monthIdx === -1) {
      monthIdx = shortMonths.indexOf(monthStr);
    }

    if (monthIdx !== -1) {
      const monthName = months[monthIdx].charAt(0).toUpperCase() + months[monthIdx].slice(1);
      return {
        start: new Date(year, monthIdx, 1),
        end: new Date(year, monthIdx + 1, 0, 23, 59, 59),
        label: `${monthName} ${year}`,
      };
    }
  }

  // "this week"
  if (inputLower === "this week") {
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    return {
      start: startOfWeek,
      end: now,
      label: "this week",
    };
  }

  // "last week"
  if (inputLower === "last week") {
    const dayOfWeek = now.getDay();
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - dayOfWeek);

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);
    startOfLastWeek.setHours(0, 0, 0, 0);

    const endOfLastWeek = new Date(startOfThisWeek);
    endOfLastWeek.setDate(startOfThisWeek.getDate() - 1);
    endOfLastWeek.setHours(23, 59, 59, 999);

    return {
      start: startOfLastWeek,
      end: endOfLastWeek,
      label: "last week",
    };
  }

  // "today"
  if (inputLower === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return {
      start,
      end: now,
      label: "today",
    };
  }

  // "yesterday"
  if (inputLower === "yesterday") {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const start = new Date(yesterday);
    start.setHours(0, 0, 0, 0);
    const end = new Date(yesterday);
    end.setHours(23, 59, 59, 999);
    return {
      start,
      end,
      label: "yesterday",
    };
  }

  return null;
}

/**
 * Get books read in a specific timeframe
 */
export const booksInTimeframeHandler: CommandHandler = async (intent, context) => {
  try {
    const timeInput = intent.params.timeframe as string | undefined;
    const limit = Math.min((intent.params.limit as number) || 5, 10);

    if (!timeInput) {
      return errorResult('Please specify a time. Example: "books read this year" or "read in January"');
    }

    const timeRange = parseTimeRange(timeInput);
    if (!timeRange) {
      return errorResult(`Couldn't understand "${timeInput}". Try "this year", "last month", or "January 2024".`);
    }

    // Get books from ReadingProgress
    const completedBooks = await prisma.readingProgress.findMany({
      where: {
        userId: context.userId,
        status: "COMPLETED",
        completedAt: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
      },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            pages: true,
            ratingOverall: true,
          },
        },
      },
      orderBy: { completedAt: "desc" },
      take: limit,
    });

    const progressBookIds = completedBooks.map(p => p.bookId);

    // Also get directly-read books for the timeframe
    // Format dateFinished to match (YYYY-MM-DD or similar string format)
    const startStr = timeRange.start.toISOString().split("T")[0];
    const endStr = timeRange.end.toISOString().split("T")[0];

    const directBooks = await prisma.book.findMany({
      where: {
        read: "Read",
        dateFinished: {
          gte: startStr,
          lte: endStr,
        },
        id: { notIn: progressBookIds },
      },
      select: {
        id: true,
        title: true,
        author: true,
        pages: true,
        ratingOverall: true,
        dateFinished: true,
      },
      take: Math.max(0, limit - completedBooks.length),
    });

    const totalCount = completedBooks.length + directBooks.length;

    if (totalCount === 0) {
      return successResult(`No books finished in ${timeRange.label}.`);
    }

    // Calculate total pages
    const totalPages = [
      ...completedBooks.map(p => p.book.pages || 0),
      ...directBooks.map(b => b.pages || 0),
    ].reduce((a, b) => a + b, 0);

    const lines = [`Books in ${timeRange.label} (${totalCount}):`];

    completedBooks.forEach((p, idx) => {
      const rating = p.book.ratingOverall ? ` ★${p.book.ratingOverall.toFixed(1)}` : "";
      lines.push(`${idx + 1}. ${truncate(p.book.title, 32)}${rating}`);
    });

    directBooks.forEach((book, idx) => {
      const rating = book.ratingOverall ? ` ★${book.ratingOverall.toFixed(1)}` : "";
      lines.push(`${completedBooks.length + idx + 1}. ${truncate(book.title, 32)}${rating}`);
    });

    if (totalPages > 0) {
      lines.push(`Total: ${formatNumber(totalPages)} pages`);
    }

    return successResult(lines.join("\n"), {
      timeframe: timeRange.label,
      count: totalCount,
      totalPages,
      start: timeRange.start.toISOString(),
      end: timeRange.end.toISOString(),
    });
  } catch (error) {
    return errorResult("Sorry, couldn't fetch books for that timeframe.", error);
  }
};

/**
 * Get reading activity summary for a time period
 */
export const readingActivityHandler: CommandHandler = async (intent, context) => {
  try {
    const timeInput = (intent.params.timeframe as string) || "this month";

    const timeRange = parseTimeRange(timeInput);
    if (!timeRange) {
      return errorResult(`Couldn't understand "${timeInput}".`);
    }

    // Get session stats for the period
    const sessionStats = await prisma.readingSession.aggregate({
      where: {
        userId: context.userId,
        startTime: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
      },
      _sum: {
        pagesRead: true,
        duration: true,
      },
      _count: true,
    });

    // Get completed books count
    const booksFinished = await prisma.readingProgress.count({
      where: {
        userId: context.userId,
        status: "COMPLETED",
        completedAt: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
      },
    });

    const pages = sessionStats._sum.pagesRead || 0;
    const sessions = sessionStats._count || 0;
    const minutes = Math.round((sessionStats._sum.duration || 0) / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;

    const lines = [`Activity in ${timeRange.label}:`];

    if (booksFinished > 0) {
      lines.push(`Books finished: ${booksFinished}`);
    }

    if (pages > 0) {
      lines.push(`Pages read: ${formatNumber(pages)}`);
    }

    if (sessions > 0) {
      lines.push(`Reading sessions: ${sessions}`);
    }

    if (minutes > 0) {
      const timeStr = hours > 0
        ? `${hours}h ${remainingMins}m`
        : `${minutes}m`;
      lines.push(`Time spent: ${timeStr}`);
    }

    if (lines.length === 1) {
      lines.push("No reading activity recorded.");
    }

    return successResult(lines.join("\n"), {
      timeframe: timeRange.label,
      booksFinished,
      pagesRead: pages,
      sessions,
      minutesRead: minutes,
    });
  } catch (error) {
    return errorResult("Sorry, couldn't fetch reading activity.", error);
  }
};

/**
 * Compare reading between two time periods
 */
export const comparePeriodsHandler: CommandHandler = async (intent, context) => {
  try {
    const period1Input = (intent.params.period1 as string) || "this month";
    const period2Input = (intent.params.period2 as string) || "last month";

    const period1 = parseTimeRange(period1Input);
    const period2 = parseTimeRange(period2Input);

    if (!period1 || !period2) {
      return errorResult("Couldn't parse time periods. Try 'this month vs last month'.");
    }

    // Get stats for both periods
    const [stats1, stats2] = await Promise.all([
      prisma.readingProgress.count({
        where: {
          userId: context.userId,
          status: "COMPLETED",
          completedAt: { gte: period1.start, lte: period1.end },
        },
      }),
      prisma.readingProgress.count({
        where: {
          userId: context.userId,
          status: "COMPLETED",
          completedAt: { gte: period2.start, lte: period2.end },
        },
      }),
    ]);

    const [pages1Result, pages2Result] = await Promise.all([
      prisma.readingSession.aggregate({
        where: {
          userId: context.userId,
          startTime: { gte: period1.start, lte: period1.end },
        },
        _sum: { pagesRead: true },
      }),
      prisma.readingSession.aggregate({
        where: {
          userId: context.userId,
          startTime: { gte: period2.start, lte: period2.end },
        },
        _sum: { pagesRead: true },
      }),
    ]);

    const pages1 = pages1Result._sum.pagesRead || 0;
    const pages2 = pages2Result._sum.pagesRead || 0;

    const booksDiff = stats1 - stats2;
    const pagesDiff = pages1 - pages2;

    const lines = [
      `${period1.label} vs ${period2.label}:`,
      `Books: ${stats1} vs ${stats2} (${booksDiff >= 0 ? "+" : ""}${booksDiff})`,
      `Pages: ${formatNumber(pages1)} vs ${formatNumber(pages2)} (${pagesDiff >= 0 ? "+" : ""}${formatNumber(pagesDiff)})`,
    ];

    // Add a summary
    if (stats1 > stats2 && pages1 > pages2) {
      lines.push(`Great progress in ${period1.label}!`);
    } else if (stats1 < stats2 && pages1 < pages2) {
      lines.push(`${period2.label} was stronger.`);
    } else {
      lines.push("Mixed results between periods.");
    }

    return successResult(lines.join("\n"), {
      period1: { label: period1.label, books: stats1, pages: pages1 },
      period2: { label: period2.label, books: stats2, pages: pages2 },
    });
  } catch (error) {
    return errorResult("Sorry, couldn't compare periods.", error);
  }
};

/**
 * Get reading history/timeline
 */
export const readingHistoryHandler: CommandHandler = async (intent, context) => {
  try {
    const limit = Math.min((intent.params.limit as number) || 10, 20);

    // Get recently completed books
    const recentBooks = await prisma.readingProgress.findMany({
      where: {
        userId: context.userId,
        status: "COMPLETED",
        completedAt: { not: null },
      },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            ratingOverall: true,
          },
        },
      },
      orderBy: { completedAt: "desc" },
      take: limit,
    });

    if (recentBooks.length === 0) {
      return successResult("No completed books in your history yet.");
    }

    const lines = ["Reading history:"];

    recentBooks.forEach((p, idx) => {
      const date = p.completedAt
        ? p.completedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : "?";
      const rating = p.book.ratingOverall ? ` ★${p.book.ratingOverall.toFixed(1)}` : "";
      lines.push(`${date}: ${truncate(p.book.title, 28)}${rating}`);
    });

    return successResult(lines.join("\n"), {
      count: recentBooks.length,
    });
  } catch (error) {
    return errorResult("Sorry, couldn't fetch reading history.", error);
  }
};
