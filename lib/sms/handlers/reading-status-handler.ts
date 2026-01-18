/**
 * Reading Status Handler - List books by reading status
 *
 * Handles queries like:
 * - "What am I reading?"
 * - "List my unread books"
 * - "Show finished books"
 * - "DNF books"
 */

import { prisma } from "@/lib/prisma";
import {
  CommandHandler,
  errorResult,
  successResult,
  truncate,
} from "./types";

/**
 * List currently reading books
 */
export const currentlyReadingHandler: CommandHandler = async (_intent, _context) => {
  try {
    // Get from ReadingProgress first (active tracking)
    const progressBooks = await prisma.readingProgress.findMany({
      where: {
        status: "READING",
      },
      include: {
        book: {
          select: { id: true, title: true, author: true, pages: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });

    // Also get books marked as "Reading" directly
    const progressBookIds = progressBooks.map(p => p.bookId);
    const directBooks = await prisma.book.findMany({
      where: {
        read: "Reading",
        id: { notIn: progressBookIds },
      },
      select: { id: true, title: true, author: true, pages: true },
      take: 5 - progressBooks.length,
    });

    if (progressBooks.length === 0 && directBooks.length === 0) {
      return successResult(
        "You're not reading anything right now. Text \"start [book]\" to begin!"
      );
    }

    const lines = ["Currently reading:"];

    progressBooks.forEach((p, idx) => {
      const pct = Math.round(p.progressPercent);
      const title = truncate(p.book.title, 30);
      lines.push(`${idx + 1}. ${title} (${pct}%)`);
    });

    directBooks.forEach((book, idx) => {
      const title = truncate(book.title, 35);
      lines.push(`${progressBooks.length + idx + 1}. ${title}`);
    });

    const total = progressBooks.length + directBooks.length;
    return successResult(lines.join("\n"), { count: total });
  } catch (error) {
    return errorResult("Sorry, couldn't fetch reading list.", error);
  }
};

/**
 * List unread/not started books
 */
export const unreadBooksHandler: CommandHandler = async (intent, _context) => {
  try {
    const limit = Math.min((intent.params.limit as number) || 5, 10);

    // Get books marked as "Unread" or with NOT_STARTED status
    const unreadBooks = await prisma.book.findMany({
      where: {
        OR: [
          { read: "Unread" },
          { read: null },
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
      take: limit,
    });

    // Count total unread
    const totalUnread = await prisma.book.count({
      where: {
        OR: [
          { read: "Unread" },
          { read: null },
        ],
      },
    });

    if (unreadBooks.length === 0) {
      return successResult("No unread books in your library. Time to add some!");
    }

    const lines = [`Unread books (${totalUnread} total):`];
    unreadBooks.forEach((book, idx) => {
      const pages = book.pages ? ` - ${book.pages}p` : "";
      lines.push(`${idx + 1}. ${truncate(book.title, 35)}${pages}`);
    });

    if (totalUnread > limit) {
      lines.push(`...and ${totalUnread - limit} more`);
    }

    return successResult(lines.join("\n"), {
      shown: unreadBooks.length,
      total: totalUnread,
    });
  } catch (error) {
    return errorResult("Sorry, couldn't fetch unread books.", error);
  }
};

/**
 * List finished/read books
 */
export const finishedBooksHandler: CommandHandler = async (intent, _context) => {
  try {
    const limit = Math.min((intent.params.limit as number) || 5, 10);

    // Get from ReadingProgress (completed)
    const completedProgress = await prisma.readingProgress.findMany({
      where: { status: "COMPLETED" },
      include: {
        book: {
          select: { id: true, title: true, author: true, ratingOverall: true },
        },
      },
      orderBy: { completedAt: "desc" },
      take: limit,
    });

    const progressBookIds = completedProgress.map(p => p.bookId);

    // Also get books marked as "Read" directly
    const directRead = await prisma.book.findMany({
      where: {
        read: "Read",
        id: { notIn: progressBookIds },
      },
      select: { id: true, title: true, author: true, ratingOverall: true, dateFinished: true },
      orderBy: { dateFinished: "desc" },
      take: Math.max(0, limit - completedProgress.length),
    });

    // Count total finished
    const totalFinishedProgress = await prisma.readingProgress.count({
      where: { status: "COMPLETED" },
    });
    const totalDirectRead = await prisma.book.count({
      where: {
        read: "Read",
        id: { notIn: progressBookIds },
      },
    });
    const totalFinished = totalFinishedProgress + totalDirectRead;

    if (completedProgress.length === 0 && directRead.length === 0) {
      return successResult("No finished books yet. Keep reading!");
    }

    const lines = [`Finished books (${totalFinished} total):`];

    completedProgress.forEach((p, idx) => {
      const rating = p.book.ratingOverall ? ` ★${p.book.ratingOverall.toFixed(1)}` : "";
      lines.push(`${idx + 1}. ${truncate(p.book.title, 32)}${rating}`);
    });

    directRead.forEach((book, idx) => {
      const rating = book.ratingOverall ? ` ★${book.ratingOverall.toFixed(1)}` : "";
      lines.push(`${completedProgress.length + idx + 1}. ${truncate(book.title, 32)}${rating}`);
    });

    return successResult(lines.join("\n"), {
      shown: completedProgress.length + directRead.length,
      total: totalFinished,
    });
  } catch (error) {
    return errorResult("Sorry, couldn't fetch finished books.", error);
  }
};

/**
 * List DNF (Did Not Finish) books
 */
export const dnfBooksHandler: CommandHandler = async (intent, _context) => {
  try {
    const limit = Math.min((intent.params.limit as number) || 5, 10);

    // Get from ReadingProgress (DNF status)
    const dnfProgress = await prisma.readingProgress.findMany({
      where: { status: "DNF" },
      include: {
        book: {
          select: { id: true, title: true, author: true, pages: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });

    const progressBookIds = dnfProgress.map(p => p.bookId);

    // Also get books marked as "DNF" directly
    const directDnf = await prisma.book.findMany({
      where: {
        read: "DNF",
        id: { notIn: progressBookIds },
      },
      select: { id: true, title: true, author: true, pages: true },
      take: Math.max(0, limit - dnfProgress.length),
    });

    const totalDnf = await prisma.book.count({
      where: {
        OR: [
          { read: "DNF" },
        ],
      },
    }) + await prisma.readingProgress.count({
      where: { status: "DNF" },
    });

    if (dnfProgress.length === 0 && directDnf.length === 0) {
      return successResult("No DNF books. You finish what you start!");
    }

    const lines = [`DNF books (${totalDnf}):`];

    dnfProgress.forEach((p, idx) => {
      const pct = Math.round(p.progressPercent);
      lines.push(`${idx + 1}. ${truncate(p.book.title, 35)} (${pct}%)`);
    });

    directDnf.forEach((book, idx) => {
      lines.push(`${dnfProgress.length + idx + 1}. ${truncate(book.title, 40)}`);
    });

    return successResult(lines.join("\n"), {
      count: dnfProgress.length + directDnf.length,
    });
  } catch (error) {
    return errorResult("Sorry, couldn't fetch DNF list.", error);
  }
};

/**
 * Get reading status summary
 */
export const readingStatusSummaryHandler: CommandHandler = async (_intent, _context) => {
  try {
    // Count by status from Book.read field
    const [reading, read, unread, dnf] = await Promise.all([
      prisma.book.count({ where: { read: "Reading" } }),
      prisma.book.count({ where: { read: "Read" } }),
      prisma.book.count({ where: { OR: [{ read: "Unread" }, { read: null }] } }),
      prisma.book.count({ where: { read: "DNF" } }),
    ]);

    const total = reading + read + unread + dnf;

    const lines = [
      `Library: ${total} books`,
      `Reading: ${reading}`,
      `Finished: ${read}`,
      `Unread: ${unread}`,
      dnf > 0 ? `DNF: ${dnf}` : null,
    ].filter(Boolean) as string[];

    return successResult(lines.join("\n"), {
      total,
      reading,
      read,
      unread,
      dnf,
    });
  } catch (error) {
    return errorResult("Sorry, couldn't fetch status summary.", error);
  }
};
