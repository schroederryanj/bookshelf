/**
 * Unread Books Handler - Smart unread book queries and suggestions
 *
 * Handles queries like:
 * - "What should I read next?"
 * - "Short unread books under 300 pages"
 * - "Unread fantasy books"
 * - "Suggest something to read"
 */

import { prisma } from "@/lib/prisma";
import {
  CommandHandler,
  errorResult,
  successResult,
  truncate,
} from "./types";

/**
 * List unread books with optional filters
 */
export const filteredUnreadHandler: CommandHandler = async (intent, _context) => {
  try {
    const genre = intent.params.genre as string | undefined;
    const maxPages = intent.params.maxPages as number | undefined;
    const minPages = intent.params.minPages as number | undefined;
    const limit = Math.min((intent.params.limit as number) || 5, 10);

    // Build where clause
    const whereClause: Record<string, unknown> = {
      OR: [
        { read: "Unread" },
        { read: null },
      ],
    };

    if (genre) {
      whereClause.genre = { contains: genre };
    }

    if (maxPages || minPages) {
      whereClause.pages = {};
      if (maxPages) {
        (whereClause.pages as Record<string, number>).lte = maxPages;
      }
      if (minPages) {
        (whereClause.pages as Record<string, number>).gte = minPages;
      }
    }

    const books = await prisma.book.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        author: true,
        pages: true,
        genre: true,
        ratingOverall: true,
      },
      orderBy: [
        { ratingOverall: "desc" },
        { pages: "asc" },
      ],
      take: limit,
    });

    const totalCount = await prisma.book.count({
      where: whereClause,
    });

    if (books.length === 0) {
      const filters: string[] = [];
      if (genre) filters.push(`in ${genre}`);
      if (maxPages) filters.push(`under ${maxPages} pages`);
      if (minPages) filters.push(`over ${minPages} pages`);

      return successResult(
        `No unread books found${filters.length > 0 ? ` ${filters.join(", ")}` : ""}. Try different filters!`
      );
    }

    // Build header based on filters
    const filterParts: string[] = [];
    if (genre) filterParts.push(genre);
    if (maxPages) filterParts.push(`<${maxPages}p`);
    if (minPages) filterParts.push(`>${minPages}p`);

    const header = filterParts.length > 0
      ? `Unread ${filterParts.join(", ")} (${totalCount}):`
      : `Unread books (${totalCount}):`;

    const lines = [header];
    books.forEach((book, idx) => {
      const pages = book.pages ? ` - ${book.pages}p` : "";
      lines.push(`${idx + 1}. ${truncate(book.title, 32)}${pages}`);
    });

    if (totalCount > limit) {
      lines.push(`...and ${totalCount - limit} more`);
    }

    return successResult(lines.join("\n"), {
      shown: books.length,
      total: totalCount,
      filters: { genre, maxPages, minPages },
    });
  } catch (error) {
    return errorResult("Sorry, couldn't fetch unread books.", error);
  }
};

/**
 * Smart "what to read next" suggestion based on preferences
 */
export const whatToReadNextHandler: CommandHandler = async (_intent, _context) => {
  try {
    // Get user's reading preferences from past reads
    const readBooks = await prisma.book.findMany({
      where: {
        read: "Read",
        ratingOverall: { gte: 4 },
      },
      select: {
        genre: true,
        pages: true,
        author: true,
      },
    });

    // Analyze preferences
    const genreCount: Record<string, number> = {};
    const authorCount: Record<string, number> = {};
    let avgPages = 0;
    let pageCount = 0;

    readBooks.forEach(book => {
      if (book.genre) {
        book.genre.split(",").map(g => g.trim()).filter(Boolean).forEach(g => {
          genreCount[g] = (genreCount[g] || 0) + 1;
        });
      }
      if (book.author) {
        authorCount[book.author] = (authorCount[book.author] || 0) + 1;
      }
      if (book.pages) {
        avgPages += book.pages;
        pageCount++;
      }
    });

    // Get favorite genres (top 3)
    const favoriteGenres = Object.entries(genreCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([g]) => g);

    // Get favorite authors
    const favoriteAuthors = Object.entries(authorCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([a]) => a);

    const targetPages = pageCount > 0 ? Math.round(avgPages / pageCount) : null;

    // Build query for suggestions
    const suggestions = await prisma.book.findMany({
      where: {
        OR: [
          { read: "Unread" },
          { read: null },
        ],
        AND: [
          favoriteGenres.length > 0
            ? { OR: favoriteGenres.map(g => ({ genre: { contains: g } })) }
            : {},
        ],
      },
      select: {
        id: true,
        title: true,
        author: true,
        pages: true,
        genre: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Score and sort suggestions
    const scoredSuggestions = suggestions.map(book => {
      let score = 0;

      // Genre match
      if (book.genre) {
        const bookGenres = book.genre.split(",").map(g => g.trim());
        bookGenres.forEach(g => {
          if (favoriteGenres.includes(g)) score += 3;
        });
      }

      // Author match
      if (book.author && favoriteAuthors.includes(book.author)) {
        score += 5;
      }

      // Page count preference (within 100 pages of average)
      if (book.pages && targetPages) {
        const pageDiff = Math.abs(book.pages - targetPages);
        if (pageDiff < 50) score += 2;
        else if (pageDiff < 100) score += 1;
      }

      return { ...book, score };
    });

    scoredSuggestions.sort((a, b) => b.score - a.score);
    const topSuggestions = scoredSuggestions.slice(0, 3);

    if (topSuggestions.length === 0) {
      // Fallback to any unread book
      const anyUnread = await prisma.book.findFirst({
        where: {
          OR: [{ read: "Unread" }, { read: null }],
        },
        select: { id: true, title: true, author: true, pages: true },
        orderBy: { createdAt: "desc" },
      });

      if (!anyUnread) {
        return successResult("No unread books! Time to add more to your library.");
      }

      return successResult(
        `Try: "${truncate(anyUnread.title, 40)}"${anyUnread.author ? ` by ${anyUnread.author}` : ""}`,
        { bookId: anyUnread.id }
      );
    }

    const lines = ["Based on your taste, try:"];
    topSuggestions.forEach((book, idx) => {
      const pages = book.pages ? ` (${book.pages}p)` : "";
      lines.push(`${idx + 1}. ${truncate(book.title, 35)}${pages}`);
    });

    if (favoriteGenres.length > 0) {
      lines.push(`You enjoy: ${favoriteGenres.slice(0, 2).join(", ")}`);
    }

    return successResult(lines.join("\n"), {
      suggestions: topSuggestions.map(b => ({ id: b.id, title: b.title })),
      preferences: { genres: favoriteGenres, authors: favoriteAuthors },
    });
  } catch (error) {
    return errorResult("Sorry, couldn't generate suggestions.", error);
  }
};

/**
 * Get short unread books (quick reads)
 */
export const quickReadsHandler: CommandHandler = async (intent, _context) => {
  try {
    const maxPages = (intent.params.maxPages as number) || 300;
    const limit = Math.min((intent.params.limit as number) || 5, 10);

    const books = await prisma.book.findMany({
      where: {
        OR: [
          { read: "Unread" },
          { read: null },
        ],
        pages: { lte: maxPages, gt: 0 },
      },
      select: {
        id: true,
        title: true,
        author: true,
        pages: true,
        genre: true,
      },
      orderBy: { pages: "asc" },
      take: limit,
    });

    const totalCount = await prisma.book.count({
      where: {
        OR: [
          { read: "Unread" },
          { read: null },
        ],
        pages: { lte: maxPages, gt: 0 },
      },
    });

    if (books.length === 0) {
      return successResult(`No unread books under ${maxPages} pages.`);
    }

    const lines = [`Quick reads (<${maxPages}p):`];
    books.forEach((book, idx) => {
      lines.push(`${idx + 1}. ${truncate(book.title, 35)} - ${book.pages}p`);
    });

    if (totalCount > limit) {
      lines.push(`...and ${totalCount - limit} more`);
    }

    return successResult(lines.join("\n"), {
      shown: books.length,
      total: totalCount,
      maxPages,
    });
  } catch (error) {
    return errorResult("Sorry, couldn't fetch quick reads.", error);
  }
};

/**
 * Get long unread books (for dedicated reading)
 */
export const longReadsHandler: CommandHandler = async (intent, _context) => {
  try {
    const minPages = (intent.params.minPages as number) || 500;
    const limit = Math.min((intent.params.limit as number) || 5, 10);

    const books = await prisma.book.findMany({
      where: {
        OR: [
          { read: "Unread" },
          { read: null },
        ],
        pages: { gte: minPages },
      },
      select: {
        id: true,
        title: true,
        author: true,
        pages: true,
        genre: true,
      },
      orderBy: { pages: "desc" },
      take: limit,
    });

    const totalCount = await prisma.book.count({
      where: {
        OR: [
          { read: "Unread" },
          { read: null },
        ],
        pages: { gte: minPages },
      },
    });

    if (books.length === 0) {
      return successResult(`No unread books over ${minPages} pages.`);
    }

    const lines = [`Long reads (${minPages}+ pages):`];
    books.forEach((book, idx) => {
      lines.push(`${idx + 1}. ${truncate(book.title, 32)} - ${book.pages}p`);
    });

    if (totalCount > limit) {
      lines.push(`...and ${totalCount - limit} more`);
    }

    return successResult(lines.join("\n"), {
      shown: books.length,
      total: totalCount,
      minPages,
    });
  } catch (error) {
    return errorResult("Sorry, couldn't fetch long reads.", error);
  }
};

/**
 * Random unread book suggestion
 */
export const randomUnreadHandler: CommandHandler = async (_intent, _context) => {
  try {
    const unreadCount = await prisma.book.count({
      where: {
        OR: [
          { read: "Unread" },
          { read: null },
        ],
      },
    });

    if (unreadCount === 0) {
      return successResult("No unread books! Time to add more to your library.");
    }

    // Get random book using skip
    const randomSkip = Math.floor(Math.random() * unreadCount);

    const book = await prisma.book.findFirst({
      where: {
        OR: [
          { read: "Unread" },
          { read: null },
        ],
      },
      skip: randomSkip,
      select: {
        id: true,
        title: true,
        author: true,
        pages: true,
        genre: true,
      },
    });

    if (!book) {
      return errorResult("Couldn't pick a random book.");
    }

    const details: string[] = [];
    if (book.author) details.push(`by ${book.author}`);
    if (book.pages) details.push(`${book.pages} pages`);
    if (book.genre) details.push(truncate(book.genre, 25));

    const lines = [
      `Random pick: "${truncate(book.title, 40)}"`,
      details.join(" | "),
      'Text "start [title]" to begin reading!',
    ].filter(Boolean);

    return successResult(lines.join("\n"), {
      bookId: book.id,
      title: book.title,
    });
  } catch (error) {
    return errorResult("Sorry, couldn't pick a random book.", error);
  }
};
