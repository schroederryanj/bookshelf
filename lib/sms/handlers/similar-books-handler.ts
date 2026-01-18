/**
 * Similar Books Handler
 *
 * Find books similar to a given book based on:
 * - Genre matching
 * - Same author
 * - Prioritizes unread books
 *
 * Examples:
 * - "Find books like The Martian"
 * - "Books similar to Dune"
 * - "Other books by Brandon Sanderson"
 * - "More like Project Hail Mary"
 */

import { prisma } from "@/lib/prisma";
import {
  CommandHandler,
  errorResult,
  successResult,
  truncate,
} from "./types";
import { fuzzyMatchTitle, buildStatusCondition } from "../utils/query-builder";

interface ScoredBook {
  id: number;
  title: string;
  author: string | null;
  genre: string | null;
  pages: number | null;
  ratingOverall: number | null;
  read: string | null;
  score: number;
}

/**
 * Main similar books handler
 */
export const similarBooksHandler: CommandHandler = async (intent, _context) => {
  try {
    const bookQuery = intent.params.book as string | undefined;
    const limit = Math.min((intent.params.limit as number | undefined) || 5, 8);
    const unreadOnly = intent.params.unreadOnly !== false;

    if (!bookQuery) {
      return errorResult(
        "Please specify a book. Example: similar to The Martian"
      );
    }

    console.log(`[similar-books-handler] Finding books similar to "${bookQuery}"`);

    // Find the source book
    const sourceBook = await findBestMatchingBook(bookQuery);

    if (!sourceBook) {
      return successResult(
        `Could not find a book matching "${truncate(bookQuery, 30)}". Try a different title.`
      );
    }

    console.log(`[similar-books-handler] Found source: ${sourceBook.title}`);

    // Find similar books
    const similar = await findSimilarBooks(
      sourceBook.id,
      sourceBook.genre,
      sourceBook.author,
      limit,
      unreadOnly
    );

    if (similar.length === 0) {
      if (unreadOnly) {
        // Try again including read books
        const allSimilar = await findSimilarBooks(
          sourceBook.id,
          sourceBook.genre,
          sourceBook.author,
          limit,
          false
        );

        if (allSimilar.length > 0) {
          return successResult(
            `No unread books similar to "${truncate(sourceBook.title, 25)}". You've read similar ones! Try: "similar to ${truncate(bookQuery, 15)} including read"`
          );
        }
      }

      return successResult(
        `No similar books found for "${truncate(sourceBook.title, 30)}". Add more books to your library!`
      );
    }

    // Format response
    const lines = similar.map((book, idx) => {
      const status = book.read === "Read" ? "[R]" : book.read === "Reading" ? "[*]" : "";
      const author = book.author ? ` - ${truncate(book.author, 15)}` : "";
      return `${idx + 1}. ${truncate(book.title, 30)}${author} ${status}`;
    });

    const header = unreadOnly
      ? `Like "${truncate(sourceBook.title, 25)}" (unread):`
      : `Similar to "${truncate(sourceBook.title, 25)}":`;

    return successResult([header, ...lines].join("\n"), {
      sourceBook: { id: sourceBook.id, title: sourceBook.title },
      count: similar.length,
      unreadOnly,
    });
  } catch (error) {
    console.error("[similar-books-handler] Error:", error);
    return errorResult("Sorry, couldn't find similar books. Try again.", error);
  }
};

/**
 * Handler for "other books by author" queries
 */
export const booksByAuthorHandler: CommandHandler = async (intent, _context) => {
  try {
    const authorQuery = intent.params.author as string | undefined;
    const bookQuery = intent.params.book as string | undefined;
    const limit = Math.min((intent.params.limit as number | undefined) || 5, 8);

    let authorName: string;
    let sourceBookId: number | null = null;

    // If book is provided, get author from book
    if (bookQuery) {
      const book = await findBestMatchingBook(bookQuery);
      if (!book) {
        return successResult(`Could not find "${truncate(bookQuery, 30)}".`);
      }
      if (!book.author) {
        return successResult(`"${truncate(book.title, 30)}" has no author info.`);
      }
      authorName = book.author;
      sourceBookId = book.id;
    } else if (authorQuery) {
      authorName = authorQuery;
    } else {
      return errorResult(
        "Please specify an author or book. Example: books by Sanderson"
      );
    }

    console.log(`[similar-books-handler] Finding books by "${authorName}"`);

    // Find books by this author
    const books = await prisma.book.findMany({
      where: {
        author: { contains: authorName },
        ...(sourceBookId ? { id: { not: sourceBookId } } : {}),
      },
      select: {
        id: true,
        title: true,
        author: true,
        pages: true,
        ratingOverall: true,
        read: true,
      },
      orderBy: [
        { ratingOverall: "desc" },
        { title: "asc" },
      ],
      take: limit + 5, // Get extra for sorting
    });

    if (books.length === 0) {
      return successResult(
        sourceBookId
          ? `No other books by this author in your library.`
          : `No books by "${truncate(authorName, 25)}" found.`
      );
    }

    // Prioritize unread books
    const sorted = books.sort((a, b) => {
      const aUnread = !a.read || a.read === "Unread" || a.read === "";
      const bUnread = !b.read || b.read === "Unread" || b.read === "";
      if (aUnread && !bUnread) return -1;
      if (!aUnread && bUnread) return 1;
      return (b.ratingOverall || 0) - (a.ratingOverall || 0);
    });

    const results = sorted.slice(0, limit);

    const lines = results.map((book, idx) => {
      const status = book.read === "Read" ? "[R]" : book.read === "Reading" ? "[*]" : "";
      return `${idx + 1}. ${truncate(book.title, 40)} ${status}`;
    });

    const displayAuthor = results[0]?.author || authorName;
    const header = `By ${truncate(displayAuthor, 25)}:`;

    return successResult([header, ...lines].join("\n"), {
      author: displayAuthor,
      count: results.length,
      total: books.length,
    });
  } catch (error) {
    console.error("[similar-books-handler] Error:", error);
    return errorResult("Sorry, couldn't find books by author.", error);
  }
};

/**
 * Find the best matching book for a query
 */
async function findBestMatchingBook(query: string) {
  const candidates = await prisma.book.findMany({
    where: {
      OR: [
        { title: { contains: query } },
        ...query.split(/\s+/)
          .filter(w => w.length > 2)
          .slice(0, 3)
          .map(word => ({ title: { contains: word } })),
      ],
    },
    select: {
      id: true,
      title: true,
      author: true,
      genre: true,
      pages: true,
      ratingOverall: true,
      read: true,
    },
    take: 20,
  });

  if (candidates.length === 0) {
    return null;
  }

  let bestMatch = candidates[0];
  let bestScore = 0;

  for (const book of candidates) {
    const score = fuzzyMatchTitle(book.title, query);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = book;
    }
  }

  return bestMatch;
}

/**
 * Find books similar to a source book
 */
async function findSimilarBooks(
  sourceId: number,
  genre: string | null,
  author: string | null,
  limit: number,
  unreadOnly: boolean
): Promise<ScoredBook[]> {
  const genres = genre?.split(",").map(g => g.trim()).filter(Boolean) || [];

  // Build OR conditions for matching
  const orConditions: { genre?: { contains: string }; author?: { contains: string } }[] = [];

  // Add genre conditions
  genres.forEach(g => {
    orConditions.push({ genre: { contains: g } });
  });

  // Add author condition
  if (author) {
    orConditions.push({ author: { contains: author } });
  }

  if (orConditions.length === 0) {
    return [];
  }

  // Build status condition if unread only
  const statusCondition = unreadOnly ? buildStatusCondition("unread") : {};

  const candidates = await prisma.book.findMany({
    where: {
      AND: [
        { id: { not: sourceId } },
        { OR: orConditions },
        statusCondition,
      ],
    },
    select: {
      id: true,
      title: true,
      author: true,
      genre: true,
      pages: true,
      ratingOverall: true,
      read: true,
    },
    take: 50,
  });

  // Score candidates
  const scored: ScoredBook[] = candidates.map(book => {
    let score = 0;

    // Genre matching (higher weight)
    if (book.genre && genres.length > 0) {
      const bookGenres = book.genre.split(",").map(g => g.trim().toLowerCase());
      genres.forEach((sourceGenre, idx) => {
        if (bookGenres.some(bg => bg.includes(sourceGenre.toLowerCase()))) {
          // Earlier genres in the list are weighted higher
          score += (genres.length - idx) * 3;
        }
      });
    }

    // Author matching
    if (book.author && author) {
      if (book.author.toLowerCase() === author.toLowerCase()) {
        score += 5;
      } else if (book.author.toLowerCase().includes(author.toLowerCase())) {
        score += 2;
      }
    }

    // Rating bonus
    if (book.ratingOverall) {
      score += book.ratingOverall * 0.5;
    }

    return { ...book, score };
  });

  // Sort by score and return top results
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
}

/**
 * Handler for finding books in the same genre
 */
export const sameGenreHandler: CommandHandler = async (intent, _context) => {
  try {
    const bookQuery = intent.params.book as string | undefined;
    const genreQuery = intent.params.genre as string | undefined;
    const limit = Math.min((intent.params.limit as number | undefined) || 5, 8);

    let targetGenre: string;

    if (bookQuery) {
      const book = await findBestMatchingBook(bookQuery);
      if (!book) {
        return successResult(`Could not find "${truncate(bookQuery, 30)}".`);
      }
      if (!book.genre) {
        return successResult(`"${truncate(book.title, 30)}" has no genre info.`);
      }
      // Use the first genre
      targetGenre = book.genre.split(",")[0].trim();
    } else if (genreQuery) {
      targetGenre = genreQuery;
    } else {
      return errorResult("Please specify a book or genre.");
    }

    // Find unread books in this genre
    const books = await prisma.book.findMany({
      where: {
        genre: { contains: targetGenre },
        OR: [
          { read: null },
          { read: "" },
          { read: "Unread" },
        ],
      },
      select: {
        id: true,
        title: true,
        author: true,
        ratingOverall: true,
      },
      orderBy: [
        { ratingOverall: "desc" },
        { title: "asc" },
      ],
      take: limit,
    });

    if (books.length === 0) {
      return successResult(`No unread ${targetGenre} books found.`);
    }

    const lines = books.map((book, idx) => {
      const author = book.author ? ` - ${truncate(book.author, 15)}` : "";
      return `${idx + 1}. ${truncate(book.title, 35)}${author}`;
    });

    return successResult([`Unread ${targetGenre}:`, ...lines].join("\n"), {
      genre: targetGenre,
      count: books.length,
    });
  } catch (error) {
    console.error("[similar-books-handler] Error:", error);
    return errorResult("Sorry, couldn't find books in genre.", error);
  }
};
