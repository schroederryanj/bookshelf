/**
 * Progress Handler - Update reading progress, mark as finished, start reading
 */

import { prisma } from "@/lib/prisma";
import { ReadingStatus } from "@prisma/client";
import {
  CommandHandler,
  HandlerResult,
  errorResult,
  successResult,
  truncate,
} from "./types";

/**
 * Update current page for a book
 */
export const updateProgressHandler: CommandHandler = async (intent, context) => {
  try {
    const bookId = intent.params.bookId as number | undefined;
    const page = intent.params.page as number | undefined;
    const bookTitle = intent.params.bookTitle as string | undefined;

    // Find book by ID or title
    let book;
    if (bookId) {
      book = await prisma.book.findUnique({
        where: { id: bookId },
        select: { id: true, title: true, pages: true },
      });
    } else if (bookTitle) {
      book = await prisma.book.findFirst({
        where: { title: { contains: bookTitle } },
        select: { id: true, title: true, pages: true },
      });
    }

    if (!book) {
      return errorResult(
        bookId
          ? `Book #${bookId} not found.`
          : `Book "${truncate(bookTitle || "", 20)}" not found. Try searching first.`
      );
    }

    if (page === undefined || page < 0) {
      return errorResult("Please provide a valid page number. Example: page 150");
    }

    const totalPages = book.pages || 0;
    const progressPercent = totalPages > 0 ? Math.min((page / totalPages) * 100, 100) : 0;
    const isComplete = totalPages > 0 && page >= totalPages;

    // Upsert reading progress
    const progress = await prisma.readingProgress.upsert({
      where: {
        bookId_userId: {
          bookId: book.id,
          userId: context.userId,
        },
      },
      create: {
        bookId: book.id,
        userId: context.userId,
        currentPage: page,
        totalPages: totalPages || undefined,
        progressPercent,
        status: isComplete ? ReadingStatus.COMPLETED : ReadingStatus.READING,
        startedAt: new Date(),
        completedAt: isComplete ? new Date() : undefined,
      },
      update: {
        currentPage: page,
        totalPages: totalPages || undefined,
        progressPercent,
        status: isComplete ? ReadingStatus.COMPLETED : ReadingStatus.READING,
        completedAt: isComplete ? new Date() : undefined,
      },
    });

    // Update the book's read status
    await prisma.book.update({
      where: { id: book.id },
      data: {
        read: isComplete ? "Read" : "Reading",
        dateFinished: isComplete ? new Date().toISOString().split("T")[0] : undefined,
      },
    });

    // Record reading session
    await prisma.readingSession.create({
      data: {
        bookId: book.id,
        userId: context.userId,
        pagesRead: 0, // We don't know how many pages were read in this update
        startTime: new Date(),
        endTime: new Date(),
      },
    });

    const pageInfo = totalPages > 0 ? `${page}/${totalPages}` : `${page}`;
    const percentInfo = totalPages > 0 ? ` (${Math.round(progressPercent)}%)` : "";

    if (isComplete) {
      return successResult(
        `Congrats! You finished "${truncate(book.title, 30)}"! ${pageInfo} pages${percentInfo}`
      );
    }

    return successResult(
      `Updated: "${truncate(book.title, 35)}" - Page ${pageInfo}${percentInfo}`
    );
  } catch (error) {
    return errorResult("Sorry, couldn't update progress. Try again.", error);
  }
};

/**
 * Mark a book as finished
 */
export const finishBookHandler: CommandHandler = async (intent, context) => {
  try {
    const bookId = intent.params.bookId as number | undefined;
    const bookTitle = intent.params.bookTitle as string | undefined;

    // Find book by ID or title
    let book;
    if (bookId) {
      book = await prisma.book.findUnique({
        where: { id: bookId },
        select: { id: true, title: true, pages: true },
      });
    } else if (bookTitle) {
      book = await prisma.book.findFirst({
        where: {
          title: { contains: bookTitle },
          read: { not: "Read" }, // Prefer unfinished books
        },
        select: { id: true, title: true, pages: true },
      });

      // If no unfinished book found, try any matching book
      if (!book) {
        book = await prisma.book.findFirst({
          where: { title: { contains: bookTitle } },
          select: { id: true, title: true, pages: true },
        });
      }
    }

    if (!book) {
      return errorResult(
        bookId
          ? `Book #${bookId} not found.`
          : `Book "${truncate(bookTitle || "", 20)}" not found. Try searching first.`
      );
    }

    // Update reading progress
    await prisma.readingProgress.upsert({
      where: {
        bookId_userId: {
          bookId: book.id,
          userId: context.userId,
        },
      },
      create: {
        bookId: book.id,
        userId: context.userId,
        currentPage: book.pages || 0,
        totalPages: book.pages,
        progressPercent: 100,
        status: ReadingStatus.COMPLETED,
        startedAt: new Date(),
        completedAt: new Date(),
      },
      update: {
        currentPage: book.pages || 0,
        progressPercent: 100,
        status: ReadingStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    // Update book status
    await prisma.book.update({
      where: { id: book.id },
      data: {
        read: "Read",
        dateFinished: new Date().toISOString().split("T")[0],
      },
    });

    return successResult(
      `Finished! "${truncate(book.title, 40)}" marked as complete. Great job!`
    );
  } catch (error) {
    return errorResult("Sorry, couldn't mark as finished. Try again.", error);
  }
};

/**
 * Start reading a book
 */
export const startReadingHandler: CommandHandler = async (intent, context) => {
  try {
    const bookId = intent.params.bookId as number | undefined;
    const bookTitle = intent.params.bookTitle as string | undefined;

    // Find book by ID or title
    let book;
    if (bookId) {
      book = await prisma.book.findUnique({
        where: { id: bookId },
        select: { id: true, title: true, pages: true, read: true },
      });
    } else if (bookTitle) {
      book = await prisma.book.findFirst({
        where: { title: { contains: bookTitle } },
        select: { id: true, title: true, pages: true, read: true },
      });
    }

    if (!book) {
      return errorResult(
        bookId
          ? `Book #${bookId} not found.`
          : `Book "${truncate(bookTitle || "", 20)}" not found. Try searching first.`
      );
    }

    if (book.read === "Read") {
      return successResult(
        `"${truncate(book.title, 35)}" is already marked as read. Want to re-read it?`
      );
    }

    // Create or update reading progress
    await prisma.readingProgress.upsert({
      where: {
        bookId_userId: {
          bookId: book.id,
          userId: context.userId,
        },
      },
      create: {
        bookId: book.id,
        userId: context.userId,
        currentPage: 0,
        totalPages: book.pages,
        progressPercent: 0,
        status: ReadingStatus.READING,
        startedAt: new Date(),
      },
      update: {
        status: ReadingStatus.READING,
        startedAt: new Date(),
      },
    });

    // Update book status
    await prisma.book.update({
      where: { id: book.id },
      data: {
        read: "Reading",
        dateStarted: new Date().toISOString().split("T")[0],
      },
    });

    const pageInfo = book.pages ? ` (${book.pages} pages)` : "";
    return successResult(
      `Started reading "${truncate(book.title, 35)}"${pageInfo}. Happy reading!`
    );
  } catch (error) {
    return errorResult("Sorry, couldn't start the book. Try again.", error);
  }
};

/**
 * Get current reading progress for all active books
 */
export const getCurrentReadingHandler: CommandHandler = async (_intent, context) => {
  try {
    const activeBooks = await prisma.readingProgress.findMany({
      where: {
        userId: context.userId,
        status: ReadingStatus.READING,
      },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            pages: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });

    if (activeBooks.length === 0) {
      return successResult("No books in progress. Start reading with: start [book title]");
    }

    const lines = activeBooks.map((p, idx) => {
      const pages = p.totalPages || p.book.pages;
      const pageInfo = pages ? `${p.currentPage}/${pages}` : `p.${p.currentPage}`;
      const percent = Math.round(p.progressPercent);
      return `${idx + 1}. ${truncate(p.book.title, 30)} - ${pageInfo} (${percent}%)`;
    });

    const header = `Currently reading ${activeBooks.length} book${activeBooks.length > 1 ? "s" : ""}:`;
    return successResult([header, ...lines].join("\n"));
  } catch (error) {
    return errorResult("Sorry, couldn't fetch reading list.", error);
  }
};
