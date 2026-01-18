/**
 * Complex Filter Handler
 *
 * Handle multi-criteria book filtering with natural language parsing.
 * Combines multiple filters:
 * - Reading status (unread, reading, finished)
 * - Genre
 * - Page count (under X, over X)
 * - Rating (4+ stars, 5-star only)
 *
 * Examples:
 * - "unread fantasy under 300 pages"
 * - "5-star sci-fi books"
 * - "short unread mystery"
 * - "highly rated books over 500 pages"
 */

import { prisma } from "@/lib/prisma";
import {
  CommandHandler,
  errorResult,
  successResult,
  truncate,
} from "./types";
import {
  BookFilterOptions,
  parseFilterString,
  buildBookWhereClause,
  buildOrderBy,
} from "../utils/query-builder";

/**
 * Main filter handler - parses natural language filters
 */
export const filterHandler: CommandHandler = async (intent, context) => {
  try {
    const query = intent.params.query as string | undefined;
    const limit = Math.min((intent.params.limit as number | undefined) || 5, 10);

    // Get explicit filter params if provided
    const explicitFilters: BookFilterOptions = {};

    if (intent.params.status) {
      explicitFilters.status = intent.params.status as BookFilterOptions["status"];
    }
    if (intent.params.genre) {
      explicitFilters.genre = intent.params.genre as string;
    }
    if (intent.params.minRating) {
      explicitFilters.minRating = intent.params.minRating as number;
    }
    if (intent.params.maxRating) {
      explicitFilters.maxRating = intent.params.maxRating as number;
    }
    if (intent.params.minPages) {
      explicitFilters.minPages = intent.params.minPages as number;
    }
    if (intent.params.maxPages) {
      explicitFilters.maxPages = intent.params.maxPages as number;
    }
    if (intent.params.author) {
      explicitFilters.author = intent.params.author as string;
    }

    // Parse natural language query if provided
    const parsedFilters = query ? parseFilterString(query) : {};

    // Merge filters (explicit takes precedence)
    const filters: BookFilterOptions = {
      ...parsedFilters,
      ...explicitFilters,
    };

    // Also try to parse from raw message
    if (context.rawMessage && Object.keys(filters).length === 0) {
      const messageFilters = parseFilterString(context.rawMessage);
      Object.assign(filters, messageFilters);
    }

    console.log("[filter-handler] Filters:", filters);

    if (Object.keys(filters).length === 0) {
      return errorResult(
        "Please specify filter criteria. Examples:\n" +
        "- unread fantasy\n" +
        "- 4+ star books\n" +
        "- under 300 pages"
      );
    }

    // Build and execute query
    const whereClause = buildBookWhereClause(filters);
    const orderBy = buildOrderBy();

    const books = await prisma.book.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        author: true,
        pages: true,
        ratingOverall: true,
        read: true,
        genre: true,
      },
      orderBy,
      take: limit,
    });

    // Get total count for context
    const totalCount = await prisma.book.count({ where: whereClause });

    if (books.length === 0) {
      return successResult(
        `No books match: ${formatFilterDescription(filters)}. Try fewer filters.`
      );
    }

    // Format results
    const lines = books.map((book, idx) => {
      const status = book.read === "Read" ? "[R]" : book.read === "Reading" ? "[*]" : "";
      const pages = book.pages ? `${book.pages}p` : "";
      const rating = book.ratingOverall ? `${book.ratingOverall}*` : "";
      const meta = [pages, rating].filter(Boolean).join(" ");
      return `${idx + 1}. ${truncate(book.title, 30)} ${meta} ${status}`.trim();
    });

    const header = totalCount > books.length
      ? `Found ${totalCount} books (showing ${books.length}):`
      : `Found ${books.length} book${books.length > 1 ? "s" : ""}:`;

    return successResult([header, ...lines].join("\n"), {
      filters,
      totalCount,
      shown: books.length,
    });
  } catch (error) {
    console.error("[filter-handler] Error:", error);
    return errorResult("Sorry, filter failed. Please try again.", error);
  }
};

/**
 * Handler specifically for unread book queries
 */
export const unreadBooksHandler: CommandHandler = async (intent, _context) => {
  try {
    const genre = intent.params.genre as string | undefined;
    const maxPages = intent.params.maxPages as number | undefined;
    const limit = Math.min((intent.params.limit as number | undefined) || 5, 10);

    const filters: BookFilterOptions = {
      status: "unread",
      genre,
      maxPages,
    };

    const whereClause = buildBookWhereClause(filters);

    const books = await prisma.book.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        author: true,
        pages: true,
        genre: true,
      },
      orderBy: [
        { createdAt: "desc" },
      ],
      take: limit,
    });

    const totalUnread = await prisma.book.count({ where: whereClause });

    if (books.length === 0) {
      const qualifier = genre ? ` ${genre}` : "";
      return successResult(`No unread${qualifier} books found.`);
    }

    const lines = books.map((book, idx) => {
      const author = book.author ? ` - ${truncate(book.author, 15)}` : "";
      const pages = book.pages ? ` (${book.pages}p)` : "";
      return `${idx + 1}. ${truncate(book.title, 30)}${author}${pages}`;
    });

    const qualifier = genre ? ` ${genre}` : "";
    const header = totalUnread > books.length
      ? `${totalUnread} unread${qualifier} books (showing ${books.length}):`
      : `${books.length} unread${qualifier} book${books.length > 1 ? "s" : ""}:`;

    return successResult([header, ...lines].join("\n"), {
      totalUnread,
      shown: books.length,
    });
  } catch (error) {
    console.error("[filter-handler] Error:", error);
    return errorResult("Sorry, couldn't fetch unread books.", error);
  }
};

/**
 * Handler for highly rated books
 */
export const topRatedHandler: CommandHandler = async (intent, _context) => {
  try {
    const minRating = (intent.params.minRating as number | undefined) || 4;
    const genre = intent.params.genre as string | undefined;
    const unreadOnly = intent.params.unreadOnly as boolean | undefined;
    const limit = Math.min((intent.params.limit as number | undefined) || 5, 10);

    const filters: BookFilterOptions = {
      minRating,
      genre,
      status: unreadOnly ? "unread" : undefined,
    };

    const whereClause = buildBookWhereClause(filters);

    const books = await prisma.book.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        author: true,
        ratingOverall: true,
        rating: true,
        read: true,
      },
      orderBy: [
        { ratingOverall: "desc" },
        { rating: "desc" },
      ],
      take: limit,
    });

    if (books.length === 0) {
      return successResult(`No ${minRating}+ star books found.`);
    }

    const lines = books.map((book, idx) => {
      const r = book.ratingOverall ?? book.rating ?? 0;
      const status = book.read === "Read" ? "[R]" : "";
      return `${idx + 1}. ${truncate(book.title, 32)} (${r}/5) ${status}`.trim();
    });

    const genreText = genre ? ` ${genre}` : "";
    const header = `Top${genreText} books (${minRating}+ stars):`;

    return successResult([header, ...lines].join("\n"), {
      minRating,
      count: books.length,
    });
  } catch (error) {
    console.error("[filter-handler] Error:", error);
    return errorResult("Sorry, couldn't fetch top-rated books.", error);
  }
};

/**
 * Handler for short/quick read queries
 */
export const shortBooksHandler: CommandHandler = async (intent, _context) => {
  try {
    const maxPages = (intent.params.maxPages as number | undefined) || 250;
    const unreadOnly = intent.params.unreadOnly !== false;
    const limit = Math.min((intent.params.limit as number | undefined) || 5, 10);

    const filters: BookFilterOptions = {
      maxPages,
      status: unreadOnly ? "unread" : undefined,
    };

    const whereClause = buildBookWhereClause(filters);

    const books = await prisma.book.findMany({
      where: {
        ...whereClause,
        pages: { not: null, lte: maxPages },
      },
      select: {
        id: true,
        title: true,
        author: true,
        pages: true,
        ratingOverall: true,
      },
      orderBy: [
        { ratingOverall: "desc" },
        { pages: "asc" },
      ],
      take: limit,
    });

    if (books.length === 0) {
      return successResult(`No ${unreadOnly ? "unread " : ""}books under ${maxPages} pages.`);
    }

    const lines = books.map((book, idx) => {
      const rating = book.ratingOverall ? ` (${book.ratingOverall}/5)` : "";
      return `${idx + 1}. ${truncate(book.title, 30)} - ${book.pages}p${rating}`;
    });

    const prefix = unreadOnly ? "Unread " : "";
    const header = `${prefix}Short reads (under ${maxPages}p):`;

    return successResult([header, ...lines].join("\n"), {
      maxPages,
      count: books.length,
    });
  } catch (error) {
    console.error("[filter-handler] Error:", error);
    return errorResult("Sorry, couldn't fetch short books.", error);
  }
};

/**
 * Handler for long books
 */
export const longBooksHandler: CommandHandler = async (intent, _context) => {
  try {
    const minPages = (intent.params.minPages as number | undefined) || 400;
    const unreadOnly = intent.params.unreadOnly !== false;
    const limit = Math.min((intent.params.limit as number | undefined) || 5, 10);

    const filters: BookFilterOptions = {
      minPages,
      status: unreadOnly ? "unread" : undefined,
    };

    const whereClause = buildBookWhereClause(filters);

    const books = await prisma.book.findMany({
      where: {
        ...whereClause,
        pages: { not: null, gte: minPages },
      },
      select: {
        id: true,
        title: true,
        author: true,
        pages: true,
        ratingOverall: true,
      },
      orderBy: [
        { ratingOverall: "desc" },
        { pages: "desc" },
      ],
      take: limit,
    });

    if (books.length === 0) {
      return successResult(`No ${unreadOnly ? "unread " : ""}books over ${minPages} pages.`);
    }

    const lines = books.map((book, idx) => {
      const rating = book.ratingOverall ? ` (${book.ratingOverall}/5)` : "";
      return `${idx + 1}. ${truncate(book.title, 30)} - ${book.pages}p${rating}`;
    });

    const prefix = unreadOnly ? "Unread " : "";
    const header = `${prefix}Long reads (${minPages}+ pages):`;

    return successResult([header, ...lines].join("\n"), {
      minPages,
      count: books.length,
    });
  } catch (error) {
    console.error("[filter-handler] Error:", error);
    return errorResult("Sorry, couldn't fetch long books.", error);
  }
};

/**
 * Format filter description for user feedback
 */
function formatFilterDescription(filters: BookFilterOptions): string {
  const parts: string[] = [];

  if (filters.status) {
    parts.push(filters.status);
  }

  if (filters.genre) {
    parts.push(filters.genre);
  }

  if (filters.minRating) {
    parts.push(`${filters.minRating}+ stars`);
  }

  if (filters.maxPages) {
    parts.push(`under ${filters.maxPages} pages`);
  }

  if (filters.minPages) {
    parts.push(`over ${filters.minPages} pages`);
  }

  if (filters.author) {
    parts.push(`by ${filters.author}`);
  }

  return parts.join(", ") || "no filters";
}
