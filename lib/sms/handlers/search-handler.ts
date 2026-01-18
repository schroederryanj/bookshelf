/**
 * Search Handler - Search books by title, author, or genre
 */

import { prisma } from "@/lib/prisma";
import {
  CommandHandler,
  HandlerResult,
  errorResult,
  successResult,
  truncate,
} from "./types";

export const searchHandler: CommandHandler = async (intent, _context) => {
  try {
    const query = intent.params.query as string | undefined;
    const searchType = intent.params.type as string | undefined; // "title", "author", "genre", or undefined for all
    const maxResults = Math.min(
      (intent.params.limit as number | undefined) || 5,
      5
    );

    if (!query || query.trim().length === 0) {
      return errorResult("Please provide a search term. Example: search Harry Potter");
    }

    const searchTerm = query.trim();

    // Build search conditions based on search type
    const conditions = [];

    if (!searchType || searchType === "title") {
      conditions.push({ title: { contains: searchTerm } });
    }
    if (!searchType || searchType === "author") {
      conditions.push({ author: { contains: searchTerm } });
    }
    if (!searchType || searchType === "genre") {
      conditions.push({ genre: { contains: searchTerm } });
    }

    const books = await prisma.book.findMany({
      where: {
        OR: conditions,
      },
      select: {
        id: true,
        title: true,
        author: true,
        read: true,
        pages: true,
      },
      orderBy: [
        { ratingOverall: "desc" },
        { title: "asc" },
      ],
      take: maxResults,
    });

    if (books.length === 0) {
      return successResult(`No books found for "${truncate(searchTerm, 30)}". Try a different search term.`);
    }

    // Format results for SMS (compact format)
    const resultLines = books.map((book, idx) => {
      const status = book.read === "Read" ? "[R]" : book.read === "Reading" ? "[*]" : "";
      const author = book.author ? ` - ${truncate(book.author, 20)}` : "";
      return `${idx + 1}. ${truncate(book.title, 35)}${author} ${status}`;
    });

    const totalFound = await prisma.book.count({
      where: {
        OR: conditions,
      },
    });

    const header = totalFound > maxResults
      ? `Found ${totalFound} books (showing ${maxResults}):`
      : `Found ${books.length} book${books.length > 1 ? "s" : ""}:`;

    const message = [header, ...resultLines].join("\n");

    return successResult(message, {
      totalFound,
      shown: books.length,
      books: books.map(b => ({ id: b.id, title: b.title })),
    });
  } catch (error) {
    return errorResult("Sorry, search failed. Please try again.", error);
  }
};

/**
 * Quick search by book ID
 */
export const getBookHandler: CommandHandler = async (intent, _context) => {
  try {
    const bookId = intent.params.bookId as number | undefined;

    if (!bookId) {
      return errorResult("Please provide a book ID. Example: book 123");
    }

    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        readingProgress: {
          where: { userId: "default" },
          take: 1,
        },
      },
    });

    if (!book) {
      return errorResult(`Book #${bookId} not found.`);
    }

    const progress = book.readingProgress[0];
    const progressInfo = progress
      ? `Progress: ${progress.currentPage}/${progress.totalPages || book.pages || "?"} pages (${Math.round(progress.progressPercent)}%)`
      : book.read === "Read"
      ? "Status: Read"
      : book.read === "Reading"
      ? "Status: Reading"
      : "Status: Unread";

    const lines = [
      truncate(book.title, 50),
      book.author ? `by ${truncate(book.author, 30)}` : "",
      book.genre ? `Genre: ${truncate(book.genre, 25)}` : "",
      progressInfo,
      book.ratingOverall ? `Rating: ${book.ratingOverall}/5` : "",
    ].filter(Boolean);

    return successResult(lines.join("\n"), { bookId: book.id });
  } catch (error) {
    return errorResult("Sorry, couldn't fetch book details.", error);
  }
};
