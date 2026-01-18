/**
 * Add Book Handler - Add new books to the collection
 */

import { prisma } from "@/lib/prisma";
import {
  CommandHandler,
  errorResult,
  successResult,
  truncate,
} from "./types";

// Default book cover placeholder
const DEFAULT_COVER = "/images/default-cover.png";
const DEFAULT_HEIGHT = 1.0;
const DEFAULT_SHELF = 1;

/**
 * Add a new book to the collection
 */
export const addBookHandler: CommandHandler = async (intent, _context) => {
  try {
    const title = intent.params.title as string | undefined;
    const author = intent.params.author as string | undefined;
    const genre = intent.params.genre as string | undefined;
    const pages = intent.params.pages as number | undefined;

    if (!title || title.trim().length === 0) {
      return errorResult("Please provide a book title. Example: add The Hobbit by J.R.R. Tolkien");
    }

    // Check for duplicate
    const existing = await prisma.book.findFirst({
      where: {
        title: { equals: title.trim() },
        author: author ? { equals: author.trim() } : undefined,
      },
    });

    if (existing) {
      return successResult(
        `"${truncate(title, 35)}" is already in your library (ID: ${existing.id}).`
      );
    }

    // Get the next position on the shelf
    const maxPosition = await prisma.book.aggregate({
      where: { shelf: DEFAULT_SHELF },
      _max: { position: true },
    });
    const nextPosition = (maxPosition._max.position || 0) + 1;

    // Create the book
    const book = await prisma.book.create({
      data: {
        title: title.trim(),
        author: author?.trim() || null,
        genre: genre?.trim() || null,
        pages: pages || null,
        img: DEFAULT_COVER,
        height: DEFAULT_HEIGHT,
        shelf: DEFAULT_SHELF,
        position: nextPosition,
        read: "Unread",
      },
    });

    const authorInfo = author ? ` by ${truncate(author, 20)}` : "";
    const pageInfo = pages ? ` (${pages}p)` : "";

    return successResult(
      `Added: "${truncate(title, 35)}"${authorInfo}${pageInfo}. ID: ${book.id}`,
      { bookId: book.id }
    );
  } catch (error) {
    return errorResult("Sorry, couldn't add the book. Try again.", error);
  }
};

/**
 * Parse a natural language add book request
 * Supports formats like:
 * - "add The Hobbit by J.R.R. Tolkien"
 * - "add The Hobbit - Tolkien"
 * - "add The Hobbit, fantasy, 310 pages"
 */
export const parseAndAddBookHandler: CommandHandler = async (intent, context) => {
  try {
    const rawInput = intent.params.raw as string | undefined;

    if (!rawInput || rawInput.trim().length === 0) {
      return errorResult("Please provide book details. Example: add The Hobbit by J.R.R. Tolkien");
    }

    const input = rawInput.trim();

    // Try to parse the input
    let title: string | undefined;
    let author: string | undefined;
    let genre: string | undefined;
    let pages: number | undefined;

    // Check for "by" pattern: "Title by Author"
    const byMatch = input.match(/^(.+?)\s+by\s+(.+)$/i);
    if (byMatch) {
      title = byMatch[1].trim();
      const afterBy = byMatch[2].trim();

      // Check if there's additional info after author
      const commaIdx = afterBy.indexOf(",");
      if (commaIdx > -1) {
        author = afterBy.substring(0, commaIdx).trim();
        const extras = afterBy.substring(commaIdx + 1).trim();
        // Parse extras (genre, pages)
        const parsedExtras = parseExtras(extras);
        genre = parsedExtras.genre;
        pages = parsedExtras.pages;
      } else {
        author = afterBy;
      }
    } else {
      // Check for dash pattern: "Title - Author"
      const dashMatch = input.match(/^(.+?)\s*-\s*(.+)$/);
      if (dashMatch) {
        title = dashMatch[1].trim();
        author = dashMatch[2].trim();
      } else {
        // Just a title, maybe with comma-separated extras
        const commaIdx = input.indexOf(",");
        if (commaIdx > -1) {
          title = input.substring(0, commaIdx).trim();
          const extras = input.substring(commaIdx + 1).trim();
          const parsedExtras = parseExtras(extras);
          genre = parsedExtras.genre;
          pages = parsedExtras.pages;
          // First extra might be author
          if (!parsedExtras.genre && !parsedExtras.pages && extras.length > 0) {
            author = extras.split(",")[0].trim();
          }
        } else {
          title = input;
        }
      }
    }

    if (!title) {
      return errorResult("Couldn't parse book title. Try: add Title by Author");
    }

    // Use the standard add handler with parsed params
    return addBookHandler(
      {
        ...intent,
        params: { title, author, genre, pages },
      },
      context
    );
  } catch (error) {
    return errorResult("Sorry, couldn't parse book details. Try: add Title by Author", error);
  }
};

function parseExtras(extras: string): { genre?: string; pages?: number } {
  const result: { genre?: string; pages?: number } = {};

  const parts = extras.split(",").map(p => p.trim()).filter(Boolean);

  for (const part of parts) {
    // Check for pages pattern
    const pagesMatch = part.match(/^(\d+)\s*(p|pages?)?$/i);
    if (pagesMatch) {
      result.pages = parseInt(pagesMatch[1], 10);
      continue;
    }

    // Otherwise treat as genre
    if (!result.genre && part.length > 0 && part.length < 50) {
      result.genre = part;
    }
  }

  return result;
}

/**
 * Quick add with just title
 */
export const quickAddHandler: CommandHandler = async (intent, context) => {
  const title = intent.params.title as string | undefined;

  if (!title) {
    return errorResult("Please provide a book title. Example: add The Hobbit");
  }

  return addBookHandler(
    { ...intent, params: { title } },
    context
  );
};
