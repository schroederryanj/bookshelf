/**
 * Book Details Handler - Get specific book information
 *
 * Handles queries like:
 * - "Tell me about [book]"
 * - "How many pages is [book]?"
 * - "Who wrote [book]?"
 * - "What's the rating for [book]?"
 */

import { prisma } from "@/lib/prisma";
import {
  CommandHandler,
  errorResult,
  successResult,
  truncate,
} from "./types";

/**
 * Search for a book by title (case-insensitive, partial match)
 */
async function findBook(title: string) {
  return prisma.book.findFirst({
    where: {
      title: { contains: title },
    },
    include: {
      readingProgress: {
        where: { userId: "default" },
        take: 1,
      },
    },
  });
}

/**
 * Get comprehensive book details
 */
export const bookDetailsHandler: CommandHandler = async (intent, _context) => {
  try {
    const bookTitle = intent.params.title as string | undefined;
    const bookId = intent.params.bookId as number | undefined;

    if (!bookTitle && !bookId) {
      return errorResult('Please specify a book. Example: "about The Great Gatsby"');
    }

    let book;
    if (bookId) {
      book = await prisma.book.findUnique({
        where: { id: bookId },
        include: {
          readingProgress: {
            where: { userId: "default" },
            take: 1,
          },
        },
      });
    } else if (bookTitle) {
      book = await findBook(bookTitle);
    }

    if (!book) {
      const searchTerm = bookTitle || `#${bookId}`;
      return errorResult(`Book "${truncate(searchTerm, 30)}" not found.`);
    }

    // Build response lines
    const lines: string[] = [];

    lines.push(`"${truncate(book.title, 45)}"`);

    if (book.author) {
      lines.push(`by ${truncate(book.author, 35)}`);
    }

    if (book.pages) {
      lines.push(`${book.pages} pages`);
    }

    if (book.genre) {
      lines.push(`Genre: ${truncate(book.genre, 30)}`);
    }

    // Status
    const progress = book.readingProgress[0];
    if (progress) {
      const pct = Math.round(progress.progressPercent);
      if (progress.status === "COMPLETED") {
        lines.push("Status: Finished");
      } else if (progress.status === "READING") {
        lines.push(`Reading: ${pct}% (pg ${progress.currentPage})`);
      } else if (progress.status === "DNF") {
        lines.push("Status: Did Not Finish");
      }
    } else if (book.read) {
      const statusMap: Record<string, string> = {
        Read: "Finished",
        Reading: "Currently Reading",
        Unread: "Not Started",
        DNF: "Did Not Finish",
      };
      lines.push(`Status: ${statusMap[book.read] || book.read}`);
    }

    // Rating
    if (book.ratingOverall) {
      const stars = "★".repeat(Math.round(book.ratingOverall)) +
                   "☆".repeat(5 - Math.round(book.ratingOverall));
      lines.push(`Rating: ${stars} (${book.ratingOverall.toFixed(1)})`);
    }

    return successResult(lines.join("\n"), {
      bookId: book.id,
      title: book.title,
      author: book.author,
      pages: book.pages,
      genre: book.genre,
      rating: book.ratingOverall,
      status: book.read,
    });
  } catch (error) {
    return errorResult("Sorry, couldn't fetch book details.", error);
  }
};

/**
 * Get page count for a specific book
 */
export const bookPagesHandler: CommandHandler = async (intent, _context) => {
  try {
    const bookTitle = intent.params.title as string | undefined;

    if (!bookTitle) {
      return errorResult('Please specify a book. Example: "pages War and Peace"');
    }

    const book = await findBook(bookTitle);

    if (!book) {
      return errorResult(`Book "${truncate(bookTitle, 30)}" not found.`);
    }

    if (!book.pages) {
      return successResult(`"${truncate(book.title, 40)}" - page count unknown.`);
    }

    return successResult(
      `"${truncate(book.title, 40)}" is ${book.pages} pages.`,
      { bookId: book.id, pages: book.pages }
    );
  } catch (error) {
    return errorResult("Sorry, couldn't fetch page count.", error);
  }
};

/**
 * Get author of a specific book
 */
export const bookAuthorHandler: CommandHandler = async (intent, _context) => {
  try {
    const bookTitle = intent.params.title as string | undefined;

    if (!bookTitle) {
      return errorResult('Please specify a book. Example: "who wrote 1984"');
    }

    const book = await findBook(bookTitle);

    if (!book) {
      return errorResult(`Book "${truncate(bookTitle, 30)}" not found.`);
    }

    if (!book.author) {
      return successResult(`Author of "${truncate(book.title, 40)}" is unknown.`);
    }

    return successResult(
      `"${truncate(book.title, 35)}" was written by ${book.author}.`,
      { bookId: book.id, author: book.author }
    );
  } catch (error) {
    return errorResult("Sorry, couldn't fetch author info.", error);
  }
};

/**
 * Get rating for a specific book
 */
export const bookRatingHandler: CommandHandler = async (intent, _context) => {
  try {
    const bookTitle = intent.params.title as string | undefined;

    if (!bookTitle) {
      return errorResult('Please specify a book. Example: "rating Dune"');
    }

    const book = await findBook(bookTitle);

    if (!book) {
      return errorResult(`Book "${truncate(bookTitle, 30)}" not found.`);
    }

    if (!book.ratingOverall) {
      return successResult(`"${truncate(book.title, 40)}" hasn't been rated yet.`);
    }

    const stars = "★".repeat(Math.round(book.ratingOverall)) +
                 "☆".repeat(5 - Math.round(book.ratingOverall));

    const lines = [
      `"${truncate(book.title, 40)}"`,
      `Overall: ${stars} (${book.ratingOverall.toFixed(1)}/5)`,
    ];

    // Include sub-ratings if available
    const subRatings: string[] = [];
    if (book.ratingWriting) subRatings.push(`Writing: ${book.ratingWriting}`);
    if (book.ratingPlot) subRatings.push(`Plot: ${book.ratingPlot}`);
    if (book.ratingCharacters) subRatings.push(`Characters: ${book.ratingCharacters}`);

    if (subRatings.length > 0) {
      lines.push(subRatings.join(", "));
    }

    return successResult(lines.join("\n"), {
      bookId: book.id,
      rating: book.ratingOverall,
      subRatings: {
        writing: book.ratingWriting,
        plot: book.ratingPlot,
        characters: book.ratingCharacters,
        pacing: book.ratingPacing,
        worldBuilding: book.ratingWorldBuilding,
        enjoyment: book.ratingEnjoyment,
      },
    });
  } catch (error) {
    return errorResult("Sorry, couldn't fetch rating.", error);
  }
};
