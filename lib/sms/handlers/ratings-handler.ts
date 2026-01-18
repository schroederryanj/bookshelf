/**
 * Ratings Handler - Rating-based book queries
 *
 * Handles queries like:
 * - "What are my highest rated books?"
 * - "List 5-star books"
 * - "What's my average rating?"
 * - "Show lowest rated books"
 */

import { prisma } from "@/lib/prisma";
import {
  CommandHandler,
  errorResult,
  successResult,
  truncate,
} from "./types";

/**
 * Get highest rated books
 */
export const highestRatedHandler: CommandHandler = async (intent, _context) => {
  try {
    const limit = Math.min((intent.params.limit as number) || 5, 10);

    const books = await prisma.book.findMany({
      where: {
        ratingOverall: { not: null },
      },
      select: {
        id: true,
        title: true,
        author: true,
        ratingOverall: true,
        genre: true,
      },
      orderBy: { ratingOverall: "desc" },
      take: limit,
    });

    if (books.length === 0) {
      return successResult("No rated books yet. Rate some books first!");
    }

    const lines = ["Highest rated:"];
    books.forEach((book, idx) => {
      const stars = "★".repeat(Math.round(book.ratingOverall!));
      lines.push(`${idx + 1}. ${truncate(book.title, 30)} ${stars}`);
    });

    return successResult(lines.join("\n"), {
      books: books.map(b => ({
        id: b.id,
        title: b.title,
        rating: b.ratingOverall,
      })),
    });
  } catch (error) {
    return errorResult("Sorry, couldn't fetch highest rated books.", error);
  }
};

/**
 * Get lowest rated books
 */
export const lowestRatedHandler: CommandHandler = async (intent, _context) => {
  try {
    const limit = Math.min((intent.params.limit as number) || 5, 10);

    const books = await prisma.book.findMany({
      where: {
        ratingOverall: { not: null, gt: 0 },
      },
      select: {
        id: true,
        title: true,
        author: true,
        ratingOverall: true,
      },
      orderBy: { ratingOverall: "asc" },
      take: limit,
    });

    if (books.length === 0) {
      return successResult("No rated books yet. Rate some books first!");
    }

    const lines = ["Lowest rated:"];
    books.forEach((book, idx) => {
      const rating = book.ratingOverall!.toFixed(1);
      lines.push(`${idx + 1}. ${truncate(book.title, 35)} (${rating}/5)`);
    });

    return successResult(lines.join("\n"), {
      books: books.map(b => ({
        id: b.id,
        title: b.title,
        rating: b.ratingOverall,
      })),
    });
  } catch (error) {
    return errorResult("Sorry, couldn't fetch lowest rated books.", error);
  }
};

/**
 * List books with specific rating (e.g., 5-star books)
 */
export const booksByRatingHandler: CommandHandler = async (intent, _context) => {
  try {
    const rating = intent.params.rating as number | undefined;
    const minRating = intent.params.minRating as number | undefined;
    const limit = Math.min((intent.params.limit as number) || 5, 10);

    if (rating === undefined && minRating === undefined) {
      return errorResult('Please specify a rating. Example: "5-star books" or "4+ stars"');
    }

    let whereClause;
    let description: string;

    if (rating !== undefined) {
      // Exact rating (with tolerance for decimals)
      const lower = rating - 0.5;
      const upper = rating + 0.49;
      whereClause = {
        ratingOverall: { gte: lower, lte: upper },
      };
      description = `${rating}-star`;
    } else {
      // Minimum rating
      whereClause = {
        ratingOverall: { gte: minRating },
      };
      description = `${minRating}+ star`;
    }

    const books = await prisma.book.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        author: true,
        ratingOverall: true,
      },
      orderBy: { ratingOverall: "desc" },
      take: limit,
    });

    const totalCount = await prisma.book.count({
      where: whereClause,
    });

    if (books.length === 0) {
      return successResult(`No ${description} books found.`);
    }

    const lines = [`${description} books (${totalCount}):`];
    books.forEach((book, idx) => {
      const r = book.ratingOverall!.toFixed(1);
      lines.push(`${idx + 1}. ${truncate(book.title, 35)} (${r})`);
    });

    if (totalCount > limit) {
      lines.push(`...and ${totalCount - limit} more`);
    }

    return successResult(lines.join("\n"), {
      rating: rating || minRating,
      shown: books.length,
      total: totalCount,
    });
  } catch (error) {
    return errorResult("Sorry, couldn't fetch books by rating.", error);
  }
};

/**
 * Calculate average rating across collection
 */
export const averageRatingHandler: CommandHandler = async (_intent, _context) => {
  try {
    const result = await prisma.book.aggregate({
      where: {
        ratingOverall: { not: null },
      },
      _avg: { ratingOverall: true },
      _count: true,
      _min: { ratingOverall: true },
      _max: { ratingOverall: true },
    });

    if (!result._avg.ratingOverall || result._count === 0) {
      return successResult("No rated books yet. Rate some books first!");
    }

    const avg = result._avg.ratingOverall;
    const stars = "★".repeat(Math.round(avg)) + "☆".repeat(5 - Math.round(avg));

    const lines = [
      `Average rating: ${stars}`,
      `${avg.toFixed(2)}/5 across ${result._count} books`,
      `Range: ${result._min.ratingOverall?.toFixed(1)} - ${result._max.ratingOverall?.toFixed(1)}`,
    ];

    return successResult(lines.join("\n"), {
      average: avg,
      count: result._count,
      min: result._min.ratingOverall,
      max: result._max.ratingOverall,
    });
  } catch (error) {
    return errorResult("Sorry, couldn't calculate average rating.", error);
  }
};

/**
 * Get rating distribution breakdown
 */
export const ratingDistributionHandler: CommandHandler = async (_intent, _context) => {
  try {
    const books = await prisma.book.findMany({
      where: {
        ratingOverall: { not: null },
      },
      select: { ratingOverall: true },
    });

    if (books.length === 0) {
      return successResult("No rated books yet. Rate some books first!");
    }

    // Count by rating brackets
    const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    books.forEach(book => {
      if (book.ratingOverall !== null) {
        const bracket = Math.round(book.ratingOverall);
        if (bracket >= 1 && bracket <= 5) {
          distribution[bracket]++;
        }
      }
    });

    const lines = ["Rating distribution:"];
    for (let i = 5; i >= 1; i--) {
      const count = distribution[i];
      const pct = Math.round((count / books.length) * 100);
      const bar = "█".repeat(Math.ceil(pct / 10));
      lines.push(`${"★".repeat(i)}: ${count} (${pct}%) ${bar}`);
    }

    return successResult(lines.join("\n"), {
      distribution,
      total: books.length,
    });
  } catch (error) {
    return errorResult("Sorry, couldn't fetch rating distribution.", error);
  }
};

/**
 * Get unrated books
 */
export const unratedBooksHandler: CommandHandler = async (intent, _context) => {
  try {
    const limit = Math.min((intent.params.limit as number) || 5, 10);
    const onlyRead = intent.params.onlyRead as boolean | undefined;

    const whereClause = {
      ratingOverall: null,
      ...(onlyRead ? { read: "Read" } : {}),
    };

    const books = await prisma.book.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        author: true,
        read: true,
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });

    const totalUnrated = await prisma.book.count({
      where: whereClause,
    });

    if (books.length === 0) {
      return successResult("All your books are rated! Great job!");
    }

    const header = onlyRead
      ? `Unrated read books (${totalUnrated}):`
      : `Unrated books (${totalUnrated}):`;

    const lines = [header];
    books.forEach((book, idx) => {
      const status = book.read === "Read" ? "[R]" : "";
      lines.push(`${idx + 1}. ${truncate(book.title, 38)} ${status}`);
    });

    if (totalUnrated > limit) {
      lines.push(`...and ${totalUnrated - limit} more`);
    }

    return successResult(lines.join("\n"), {
      shown: books.length,
      total: totalUnrated,
    });
  } catch (error) {
    return errorResult("Sorry, couldn't fetch unrated books.", error);
  }
};
