/**
 * Genre Stats Handler - Genre-based queries and statistics
 *
 * Handles queries like:
 * - "How many fantasy books do I have?"
 * - "What's my favorite genre?"
 * - "List books in sci-fi"
 * - "Genre breakdown"
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
 * Count books by genre
 */
export const genreCountHandler: CommandHandler = async (intent, _context) => {
  try {
    const genre = intent.params.genre as string | undefined;

    if (!genre) {
      return errorResult('Please specify a genre. Example: "count fantasy"');
    }

    const books = await prisma.book.findMany({
      where: {
        genre: { contains: genre },
      },
      select: {
        id: true,
        read: true,
      },
    });

    if (books.length === 0) {
      return successResult(`No books found in "${genre}" genre.`);
    }

    const readCount = books.filter(b => b.read === "Read").length;
    const unreadCount = books.filter(b => b.read === "Unread" || !b.read).length;

    const message = `${genre}: ${books.length} books (${readCount} read, ${unreadCount} unread)`;

    return successResult(message, {
      genre,
      total: books.length,
      read: readCount,
      unread: unreadCount,
    });
  } catch (error) {
    return errorResult("Sorry, couldn't count genre books.", error);
  }
};

/**
 * Find favorite genre (most books or highest avg rating)
 */
export const favoriteGenreHandler: CommandHandler = async (intent, _context) => {
  try {
    const byRating = intent.params.byRating as boolean | undefined;

    // Get all books with genres
    const books = await prisma.book.findMany({
      where: {
        genre: { not: null },
      },
      select: {
        genre: true,
        ratingOverall: true,
        read: true,
      },
    });

    if (books.length === 0) {
      return successResult("No books with genres found. Add genres to your books!");
    }

    // Parse and count genres
    const genreStats: Record<string, { count: number; ratings: number[]; readCount: number }> = {};

    books.forEach(book => {
      if (!book.genre) return;

      const genres = book.genre.split(",").map(g => g.trim()).filter(Boolean);
      genres.forEach(g => {
        if (!genreStats[g]) {
          genreStats[g] = { count: 0, ratings: [], readCount: 0 };
        }
        genreStats[g].count++;
        if (book.ratingOverall) {
          genreStats[g].ratings.push(book.ratingOverall);
        }
        if (book.read === "Read") {
          genreStats[g].readCount++;
        }
      });
    });

    // Calculate averages and sort
    const genreData = Object.entries(genreStats).map(([genre, stats]) => ({
      genre,
      count: stats.count,
      readCount: stats.readCount,
      avgRating: stats.ratings.length > 0
        ? stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length
        : 0,
      ratedCount: stats.ratings.length,
    }));

    if (byRating) {
      // Sort by average rating (only consider genres with 3+ rated books)
      const ratedGenres = genreData
        .filter(g => g.ratedCount >= 3)
        .sort((a, b) => b.avgRating - a.avgRating);

      if (ratedGenres.length === 0) {
        return successResult("Not enough rated books per genre. Rate more books!");
      }

      const top = ratedGenres[0];
      const stars = "★".repeat(Math.round(top.avgRating));

      return successResult(
        `Highest rated genre: ${top.genre} (${stars} ${top.avgRating.toFixed(1)}/5 avg from ${top.ratedCount} books)`,
        { genre: top.genre, avgRating: top.avgRating, count: top.count }
      );
    } else {
      // Sort by count (most books)
      genreData.sort((a, b) => b.count - a.count);
      const top = genreData[0];

      return successResult(
        `Most read genre: ${top.genre} (${top.count} books, ${top.readCount} finished)`,
        { genre: top.genre, count: top.count, readCount: top.readCount }
      );
    }
  } catch (error) {
    return errorResult("Sorry, couldn't determine favorite genre.", error);
  }
};

/**
 * List books in a specific genre
 */
export const booksByGenreHandler: CommandHandler = async (intent, _context) => {
  try {
    const genre = intent.params.genre as string | undefined;
    const limit = Math.min((intent.params.limit as number) || 5, 10);

    if (!genre) {
      return errorResult('Please specify a genre. Example: "list mystery"');
    }

    const books = await prisma.book.findMany({
      where: {
        genre: { contains: genre },
      },
      select: {
        id: true,
        title: true,
        author: true,
        read: true,
        ratingOverall: true,
      },
      orderBy: [
        { ratingOverall: "desc" },
        { title: "asc" },
      ],
      take: limit,
    });

    const totalCount = await prisma.book.count({
      where: {
        genre: { contains: genre },
      },
    });

    if (books.length === 0) {
      return successResult(`No books found in "${genre}" genre.`);
    }

    const lines = [`${genre} books (${totalCount}):`];
    books.forEach((book, idx) => {
      const status = book.read === "Read" ? "[R]" : book.read === "Reading" ? "[*]" : "";
      const rating = book.ratingOverall ? ` ★${book.ratingOverall.toFixed(1)}` : "";
      lines.push(`${idx + 1}. ${truncate(book.title, 30)}${rating} ${status}`);
    });

    if (totalCount > limit) {
      lines.push(`...and ${totalCount - limit} more`);
    }

    return successResult(lines.join("\n"), {
      genre,
      shown: books.length,
      total: totalCount,
    });
  } catch (error) {
    return errorResult("Sorry, couldn't list genre books.", error);
  }
};

/**
 * Get genre breakdown/distribution
 */
export const genreBreakdownHandler: CommandHandler = async (_intent, _context) => {
  try {
    const books = await prisma.book.findMany({
      where: {
        genre: { not: null },
      },
      select: {
        genre: true,
      },
    });

    if (books.length === 0) {
      return successResult("No genre data. Add genres to your books!");
    }

    // Count genres
    const genreCount: Record<string, number> = {};
    books.forEach(book => {
      if (!book.genre) return;
      const genres = book.genre.split(",").map(g => g.trim()).filter(Boolean);
      genres.forEach(g => {
        genreCount[g] = (genreCount[g] || 0) + 1;
      });
    });

    // Sort and get top 5
    const topGenres = Object.entries(genreCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const totalBooks = await prisma.book.count();
    const booksWithGenre = books.length;

    const lines = [`Genre breakdown (${formatNumber(booksWithGenre)}/${formatNumber(totalBooks)} tagged):`];
    topGenres.forEach(([genre, count], idx) => {
      const pct = Math.round((count / booksWithGenre) * 100);
      lines.push(`${idx + 1}. ${genre}: ${count} (${pct}%)`);
    });

    return successResult(lines.join("\n"), {
      genres: topGenres.map(([g, c]) => ({ genre: g, count: c })),
      totalTagged: booksWithGenre,
      totalBooks,
    });
  } catch (error) {
    return errorResult("Sorry, couldn't fetch genre breakdown.", error);
  }
};

/**
 * Get genre diversity stats
 */
export const genreDiversityHandler: CommandHandler = async (_intent, _context) => {
  try {
    const readBooks = await prisma.book.findMany({
      where: {
        read: "Read",
        genre: { not: null },
      },
      select: { genre: true },
    });

    if (readBooks.length === 0) {
      return successResult("Read more books to see genre diversity!");
    }

    const uniqueGenres = new Set<string>();
    readBooks.forEach(book => {
      if (book.genre) {
        book.genre.split(",").map(g => g.trim()).filter(Boolean).forEach(g => {
          uniqueGenres.add(g);
        });
      }
    });

    const genreCount = uniqueGenres.size;
    const bookCount = readBooks.length;

    let diversityRating: string;
    if (genreCount >= 10) {
      diversityRating = "Excellent";
    } else if (genreCount >= 7) {
      diversityRating = "Great";
    } else if (genreCount >= 5) {
      diversityRating = "Good";
    } else if (genreCount >= 3) {
      diversityRating = "Growing";
    } else {
      diversityRating = "Focused";
    }

    return successResult(
      `Genre diversity: ${diversityRating}\n${genreCount} genres across ${bookCount} books read`,
      { uniqueGenres: genreCount, booksRead: bookCount, rating: diversityRating }
    );
  } catch (error) {
    return errorResult("Sorry, couldn't analyze genre diversity.", error);
  }
};
