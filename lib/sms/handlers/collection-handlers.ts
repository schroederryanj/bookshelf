/**
 * Collection Query Handlers
 * Handlers for comprehensive book collection queries via SMS
 */

import { prisma } from "@/lib/prisma";
import {
  CommandHandler,
  HandlerResult,
  errorResult,
  successResult,
  truncate,
  formatNumber,
} from "./types";
import type { AIIntentParameters } from "../types";

/**
 * Handle book details query
 * "Tell me about Dune", "How many pages is The Hobbit?"
 */
export const bookDetailsHandler: CommandHandler = async (intent, _context) => {
  try {
    const { bookTitle, query } = intent.params as AIIntentParameters;
    const searchTerm = bookTitle || query;

    if (!searchTerm) {
      return errorResult("Which book would you like details about?");
    }

    const book = await prisma.book.findFirst({
      where: {
        OR: [
          { title: { contains: searchTerm } },
          { author: { contains: searchTerm } },
        ],
      },
    });

    if (!book) {
      return errorResult(`No book found matching "${truncate(searchTerm, 30)}".`);
    }

    // Get reading progress separately
    const progress = await prisma.readingProgress.findFirst({
      where: { bookId: book.id, userId: "default" },
    });
    const lines = [
      `"${truncate(book.title, 40)}"`,
      book.author ? `by ${book.author}` : null,
      book.pages ? `${formatNumber(book.pages)} pages` : null,
      book.genre ? `Genre: ${book.genre}` : null,
      book.ratingOverall ? `Rating: ${book.ratingOverall}/5` : null,
      progress ? `Progress: ${Math.round(progress.progressPercent)}%` :
        book.read === "Read" ? "Status: Read" :
        book.read === "Reading" ? "Status: Reading" : "Status: Unread",
    ].filter(Boolean);

    return successResult(lines.join("\n"), {
      bookId: book.id,
      title: book.title,
      author: book.author,
      pages: book.pages,
    });
  } catch (error) {
    return errorResult("Sorry, couldn't fetch book details.", error);
  }
};

/**
 * Handle reading status query
 * "What am I reading?", "Which books haven't I started?"
 */
export const readingStatusHandler: CommandHandler = async (intent, context) => {
  try {
    const { readingStatus, limit = 5 } = intent.params as AIIntentParameters;
    const status = readingStatus || "reading";

    let whereClause: Record<string, unknown> = {};
    let statusLabel = "";

    switch (status) {
      case "reading":
        whereClause = { read: "Reading" };
        statusLabel = "Currently reading";
        break;
      case "unread":
        whereClause = { read: { notIn: ["Read", "Reading"] } };
        statusLabel = "Unread books";
        break;
      case "finished":
        whereClause = { read: "Read" };
        statusLabel = "Finished books";
        break;
      case "dnf":
        whereClause = { read: "DNF" };
        statusLabel = "Did not finish";
        break;
      default:
        statusLabel = "All books";
    }

    const books = await prisma.book.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        author: true,
        pages: true,
      },
      orderBy: { title: "asc" },
      take: Math.min(limit, 10),
    });

    const total = await prisma.book.count({ where: whereClause });

    if (books.length === 0) {
      return successResult(`No ${statusLabel.toLowerCase()} found.`);
    }

    const lines = [`${statusLabel} (${total} total):`];
    books.forEach((book, idx) => {
      lines.push(`${idx + 1}. ${truncate(book.title, 35)}`);
    });

    if (total > books.length) {
      lines.push(`Reply MORE for more results.`);
    }

    return successResult(lines.join("\n"), {
      status,
      totalCount: total,
      shown: books.length,
      books: books.map(b => ({ id: b.id, title: b.title })),
    });
  } catch (error) {
    return errorResult("Sorry, couldn't fetch reading status.", error);
  }
};

/**
 * Handle genre statistics query
 * "What's my favorite genre?", "How many fantasy books do I have?"
 */
export const genreQueryHandler: CommandHandler = async (intent, _context) => {
  try {
    const { genre, statType } = intent.params as AIIntentParameters;

    if (genre) {
      // Count books in specific genre
      const count = await prisma.book.count({
        where: { genre: { contains: genre } },
      });

      const readCount = await prisma.book.count({
        where: {
          genre: { contains: genre },
          read: "Read",
        },
      });

      return successResult(
        `${genre}: ${count} books (${readCount} read)`,
        { genre, total: count, read: readCount }
      );
    }

    // Get genre breakdown
    const books = await prisma.book.findMany({
      where: { genre: { not: null } },
      select: { genre: true, read: true },
    });

    const genreCount: Record<string, { total: number; read: number }> = {};

    books.forEach((book) => {
      if (book.genre) {
        const genres = book.genre.split(",").map((g) => g.trim());
        genres.forEach((g) => {
          if (!genreCount[g]) {
            genreCount[g] = { total: 0, read: 0 };
          }
          genreCount[g].total++;
          if (book.read === "Read") {
            genreCount[g].read++;
          }
        });
      }
    });

    const sorted = Object.entries(genreCount)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5);

    if (sorted.length === 0) {
      return successResult("No genre data available. Add genres to your books!");
    }

    const lines = ["Top genres:"];
    sorted.forEach(([g, counts], idx) => {
      lines.push(`${idx + 1}. ${g}: ${counts.total} (${counts.read} read)`);
    });

    return successResult(lines.join("\n"), {
      genres: sorted.map(([g, c]) => ({ genre: g, ...c })),
    });
  } catch (error) {
    return errorResult("Sorry, couldn't fetch genre stats.", error);
  }
};

/**
 * Handle reading patterns query
 * "What's my reading streak?", "Average pages per day?"
 */
export const readingPatternsHandler: CommandHandler = async (_intent, context) => {
  try {
    // Get reading sessions for pattern analysis
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sessions = await prisma.readingSession.findMany({
      where: {
        userId: context.userId,
        startTime: { gte: thirtyDaysAgo },
      },
      orderBy: { startTime: "desc" },
    });

    if (sessions.length === 0) {
      return successResult("No reading sessions in the last 30 days. Start tracking your reading!");
    }

    const totalPages = sessions.reduce((sum, s) => sum + (s.pagesRead || 0), 0);
    const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);

    // Calculate streak (consecutive days with reading)
    const readingDays = new Set(
      sessions.map((s) =>
        s.startTime.toISOString().split("T")[0]
      )
    );

    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split("T")[0];
      if (readingDays.has(dateStr)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    const avgPagesPerDay = Math.round(totalPages / 30);
    const avgMinutesPerSession = sessions.length > 0 ? Math.round(totalMinutes / sessions.length) : 0;

    const lines = [
      `Last 30 days:`,
      `Pages read: ${formatNumber(totalPages)}`,
      `Sessions: ${sessions.length}`,
      `Avg pages/day: ${avgPagesPerDay}`,
      avgMinutesPerSession > 0 ? `Avg session: ${avgMinutesPerSession} min` : null,
      streak > 0 ? `Current streak: ${streak} days` : "No active streak",
    ].filter(Boolean);

    return successResult(lines.join("\n"), {
      totalPages,
      sessions: sessions.length,
      avgPagesPerDay,
      streak,
    });
  } catch (error) {
    return errorResult("Sorry, couldn't analyze reading patterns.", error);
  }
};

/**
 * Handle ratings query
 * "What's my highest rated book?", "Show me 5-star books"
 */
export const ratingsQueryHandler: CommandHandler = async (intent, _context) => {
  try {
    const { minRating, limit = 5, sortBy } = intent.params as AIIntentParameters;

    const whereClause: Record<string, unknown> = {
      ratingOverall: { not: null },
    };

    if (minRating) {
      whereClause.ratingOverall = { gte: minRating };
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
      take: Math.min(limit, 10),
    });

    if (books.length === 0) {
      const msg = minRating
        ? `No books rated ${minRating}+ stars found.`
        : "No rated books found. Rate some books!";
      return successResult(msg);
    }

    const header = minRating
      ? `Books rated ${minRating}+ stars:`
      : "Top rated books:";

    const lines = [header];
    books.forEach((book, idx) => {
      const stars = book.ratingOverall ? `${"*".repeat(Math.round(book.ratingOverall))}` : "";
      lines.push(`${idx + 1}. ${truncate(book.title, 30)} ${stars}`);
    });

    return successResult(lines.join("\n"), {
      books: books.map((b) => ({ id: b.id, title: b.title, rating: b.ratingOverall })),
    });
  } catch (error) {
    return errorResult("Sorry, couldn't fetch ratings.", error);
  }
};

/**
 * Handle reading goal progress query
 * "Am I on track for my goal?", "How many books behind?"
 */
export const goalProgressHandler: CommandHandler = async (_intent, context) => {
  try {
    // Get current year goal
    const currentYear = new Date().getFullYear();
    const goal = await prisma.readingGoal.findFirst({
      where: {
        userId: context.userId,
        goalType: "BOOKS_PER_YEAR",
        period: currentYear.toString(),
      },
    });

    if (!goal) {
      return successResult(
        `No reading goal set for ${currentYear}. Set one in the app!`
      );
    }

    // Count books read this year
    const startOfYear = new Date(currentYear, 0, 1);
    const booksRead = await prisma.readingProgress.count({
      where: {
        userId: context.userId,
        status: "COMPLETED",
        completedAt: { gte: startOfYear },
      },
    });

    // Also count directly-read books
    const directRead = await prisma.book.count({
      where: {
        read: "Read",
        dateFinished: { startsWith: currentYear.toString() },
      },
    });

    const totalRead = booksRead + directRead;
    const targetBooks = goal.target || 12;

    // Calculate if on track
    const dayOfYear = Math.floor(
      (new Date().getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)
    );
    const expectedBooks = Math.round((dayOfYear / 365) * targetBooks);
    const diff = totalRead - expectedBooks;

    const status = diff >= 0 ? "ahead" : "behind";
    const progressPercent = Math.round((totalRead / targetBooks) * 100);

    const lines = [
      `${currentYear} Goal: ${totalRead}/${targetBooks} books (${progressPercent}%)`,
      diff >= 0
        ? `${diff} books ahead of schedule!`
        : `${Math.abs(diff)} books behind schedule`,
      `Expected by now: ${expectedBooks} books`,
    ];

    return successResult(lines.join("\n"), {
      goal: targetBooks,
      read: totalRead,
      expected: expectedBooks,
      difference: diff,
      status,
    });
  } catch (error) {
    return errorResult("Sorry, couldn't fetch goal progress.", error);
  }
};

/**
 * Handle unread books query
 * "What should I read next?", "Show unread sci-fi"
 */
export const unreadBooksHandler: CommandHandler = async (intent, _context) => {
  try {
    const { genre, maxPages, sortBy, limit = 5 } = intent.params as AIIntentParameters;

    const whereClause: Record<string, unknown> = {
      read: { notIn: ["Read", "Reading"] },
    };

    if (genre) {
      whereClause.genre = { contains: genre };
    }

    if (maxPages) {
      whereClause.pages = { lte: maxPages };
    }

    let orderBy: Record<string, string> = { title: "asc" };
    if (sortBy === "pages") {
      orderBy = { pages: "asc" };
    } else if (sortBy === "rating") {
      orderBy = { ratingOverall: "desc" };
    }

    const books = await prisma.book.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        author: true,
        pages: true,
        genre: true,
      },
      orderBy,
      take: Math.min(limit, 10),
    });

    const total = await prisma.book.count({ where: whereClause });

    if (books.length === 0) {
      const filters = [];
      if (genre) filters.push(genre);
      if (maxPages) filters.push(`under ${maxPages} pages`);
      const filterStr = filters.length > 0 ? ` matching ${filters.join(", ")}` : "";
      return successResult(`No unread books${filterStr} found.`);
    }

    const header = genre
      ? `Unread ${genre} books (${total} total):`
      : `Unread books (${total} total):`;

    const lines = [header];
    books.forEach((book, idx) => {
      const pages = book.pages ? ` (${book.pages}p)` : "";
      lines.push(`${idx + 1}. ${truncate(book.title, 30)}${pages}`);
    });

    if (total > books.length) {
      lines.push(`Reply MORE for more suggestions.`);
    }

    return successResult(lines.join("\n"), {
      totalCount: total,
      shown: books.length,
      books: books.map((b) => ({ id: b.id, title: b.title })),
    });
  } catch (error) {
    return errorResult("Sorry, couldn't fetch unread books.", error);
  }
};

/**
 * Handle book recommendations by topic/genre
 * Searches ALL books (not just unread) by genre, title, author, or description
 * "Recommend thriller", "Suggest a mystery", "Got any sci-fi?"
 */
export const recommendBooksHandler: CommandHandler = async (intent, _context) => {
  try {
    const { genre, query, maxPages, sortBy, limit = 5 } = intent.params as AIIntentParameters;
    const searchTerm = genre || query;

    // Build where clause - search genre, title, author, and description
    const whereClause: Record<string, unknown> = searchTerm
      ? {
          OR: [
            { genre: { contains: searchTerm } },
            { title: { contains: searchTerm } },
            { author: { contains: searchTerm } },
            { description: { contains: searchTerm } },
          ],
        }
      : {};

    if (maxPages) {
      whereClause.pages = { lte: maxPages };
    }

    // Order by rating first, then unread books
    let orderBy: Record<string, string>[] = [
      { ratingOverall: "desc" },
      { title: "asc" },
    ];
    if (sortBy === "pages") {
      orderBy = [{ pages: "asc" }];
    }

    const books = await prisma.book.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        author: true,
        pages: true,
        genre: true,
        read: true,
        ratingOverall: true,
      },
      orderBy,
      take: Math.min(limit, 10),
    });

    const total = await prisma.book.count({ where: whereClause });

    if (books.length === 0) {
      if (searchTerm) {
        return successResult(`No books found matching "${truncate(searchTerm, 20)}". Try a different topic or say "my books" to see your collection.`);
      }
      return successResult("Your bookshelf is empty! Add some books first.");
    }

    const header = searchTerm
      ? `${searchTerm} books in your collection (${total} total):`
      : `Books in your collection (${total} total):`;

    const lines = [header];
    books.forEach((book, idx) => {
      const status = book.read === "Read" ? "✓" : book.read === "Reading" ? "📖" : "";
      const rating = book.ratingOverall ? ` ★${book.ratingOverall}` : "";
      const pages = book.pages ? ` (${book.pages}p)` : "";
      lines.push(`${idx + 1}. ${status}${truncate(book.title, 25)}${rating}${pages}`);
    });

    if (total > books.length) {
      lines.push(`Reply MORE for more.`);
    }

    return successResult(lines.join("\n"), {
      totalCount: total,
      shown: books.length,
      books: books.map((b) => ({ id: b.id, title: b.title })),
    });
  } catch (error) {
    return errorResult("Sorry, couldn't search books.", error);
  }
};

/**
 * Handle similar books query
 * "Find books like The Martian", "Other books by this author"
 */
export const similarBooksHandler: CommandHandler = async (intent, _context) => {
  try {
    const { bookTitle, author } = intent.params as AIIntentParameters;

    if (author) {
      // Find other books by the same author
      const books = await prisma.book.findMany({
        where: {
          author: { contains: author },
        },
        select: {
          id: true,
          title: true,
          read: true,
          pages: true,
        },
        orderBy: { ratingOverall: "desc" },
        take: 5,
      });

      if (books.length === 0) {
        return successResult(`No books by ${author} in your library.`);
      }

      const lines = [`Books by ${author}:`];
      books.forEach((book, idx) => {
        const status = book.read === "Read" ? "[R]" : book.read === "Reading" ? "[*]" : "";
        lines.push(`${idx + 1}. ${truncate(book.title, 35)} ${status}`);
      });

      return successResult(lines.join("\n"), {
        author,
        books: books.map((b) => ({ id: b.id, title: b.title })),
      });
    }

    if (!bookTitle) {
      return errorResult("Which book would you like similar recommendations for?");
    }

    // Find the reference book
    const refBook = await prisma.book.findFirst({
      where: { title: { contains: bookTitle } },
    });

    if (!refBook) {
      return errorResult(`Couldn't find "${truncate(bookTitle, 30)}" in your library.`);
    }

    // Find similar books by genre or author
    const similarBooks = await prisma.book.findMany({
      where: {
        id: { not: refBook.id },
        OR: [
          refBook.genre ? { genre: { contains: refBook.genre.split(",")[0] } } : {},
          refBook.author ? { author: { equals: refBook.author } } : {},
        ],
      },
      select: {
        id: true,
        title: true,
        author: true,
        read: true,
      },
      take: 5,
    });

    if (similarBooks.length === 0) {
      return successResult(`No similar books found to "${truncate(refBook.title, 30)}".`);
    }

    const lines = [`Similar to "${truncate(refBook.title, 25)}":`];
    similarBooks.forEach((book, idx) => {
      const status = book.read === "Read" ? "[R]" : "";
      lines.push(`${idx + 1}. ${truncate(book.title, 30)} ${status}`);
    });

    return successResult(lines.join("\n"), {
      referenceBook: refBook.title,
      similar: similarBooks.map((b) => ({ id: b.id, title: b.title })),
    });
  } catch (error) {
    return errorResult("Sorry, couldn't find similar books.", error);
  }
};

/**
 * Handle book comparison query
 * "Which is longer, Dune or LOTR?", "Compare ratings"
 */
export const compareBooksHandler: CommandHandler = async (intent, _context) => {
  try {
    const { comparisonBooks, comparisonType = "pages" } = intent.params as AIIntentParameters;

    if (!comparisonBooks || comparisonBooks.length < 2) {
      return errorResult("Please specify two books to compare. Example: 'compare Dune and LOTR'");
    }

    const books = await Promise.all(
      comparisonBooks.slice(0, 2).map((title) =>
        prisma.book.findFirst({
          where: { title: { contains: title } },
          select: {
            id: true,
            title: true,
            author: true,
            pages: true,
            ratingOverall: true,
            read: true,
          },
        })
      )
    );

    const [book1, book2] = books;

    if (!book1 || !book2) {
      const missing = !book1 ? comparisonBooks[0] : comparisonBooks[1];
      return errorResult(`Couldn't find "${truncate(missing, 30)}" in your library.`);
    }

    let comparison = "";
    switch (comparisonType) {
      case "pages":
        if (book1.pages && book2.pages) {
          const longer = book1.pages > book2.pages ? book1 : book2;
          const diff = Math.abs(book1.pages - book2.pages);
          comparison = `"${truncate(longer.title, 25)}" is longer by ${formatNumber(diff)} pages.\n\n`;
          comparison += `${truncate(book1.title, 20)}: ${formatNumber(book1.pages)}p\n`;
          comparison += `${truncate(book2.title, 20)}: ${formatNumber(book2.pages)}p`;
        } else {
          comparison = "Page counts unavailable for comparison.";
        }
        break;

      case "rating":
        if (book1.ratingOverall && book2.ratingOverall) {
          const higher = book1.ratingOverall > book2.ratingOverall ? book1 : book2;
          comparison = `"${truncate(higher.title, 25)}" is rated higher.\n\n`;
          comparison += `${truncate(book1.title, 20)}: ${book1.ratingOverall}/5\n`;
          comparison += `${truncate(book2.title, 20)}: ${book2.ratingOverall}/5`;
        } else {
          comparison = "Ratings unavailable for comparison.";
        }
        break;

      default:
        comparison = `${truncate(book1.title, 25)} vs ${truncate(book2.title, 25)}`;
    }

    return successResult(comparison, {
      books: [
        { id: book1.id, title: book1.title, pages: book1.pages, rating: book1.ratingOverall },
        { id: book2.id, title: book2.title, pages: book2.pages, rating: book2.ratingOverall },
      ],
    });
  } catch (error) {
    return errorResult("Sorry, couldn't compare books.", error);
  }
};

/**
 * Handle time-based query
 * "What did I read last month?", "Books finished in 2023"
 */
export const timeQueryHandler: CommandHandler = async (intent, context) => {
  try {
    const { timeframe = "month", limit = 5 } = intent.params as AIIntentParameters;

    let startDate: Date;
    let endDate: Date = new Date();
    let periodLabel = "";

    const now = new Date();

    switch (timeframe) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        periodLabel = "Today";
        break;
      case "week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        periodLabel = "This week";
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        periodLabel = now.toLocaleString("default", { month: "long" });
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        periodLabel = now.getFullYear().toString();
        break;
      default:
        // Assume it's a year number like "2023"
        const yearMatch = timeframe.match(/\d{4}/);
        if (yearMatch) {
          const year = parseInt(yearMatch[0]);
          startDate = new Date(year, 0, 1);
          endDate = new Date(year, 11, 31);
          periodLabel = year.toString();
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          periodLabel = "This month";
        }
    }

    const completed = await prisma.readingProgress.findMany({
      where: {
        userId: context.userId,
        status: "COMPLETED",
        completedAt: { gte: startDate, lte: endDate },
      },
      include: {
        book: { select: { id: true, title: true, author: true, pages: true } },
      },
      orderBy: { completedAt: "desc" },
      take: Math.min(limit, 10),
    });

    const totalCount = await prisma.readingProgress.count({
      where: {
        userId: context.userId,
        status: "COMPLETED",
        completedAt: { gte: startDate, lte: endDate },
      },
    });

    if (completed.length === 0) {
      return successResult(`No books finished in ${periodLabel}.`);
    }

    const lines = [`${periodLabel}: ${totalCount} book${totalCount !== 1 ? "s" : ""} finished`];
    completed.forEach((p, idx) => {
      lines.push(`${idx + 1}. ${truncate(p.book.title, 35)}`);
    });

    if (totalCount > completed.length) {
      lines.push(`Reply MORE for more.`);
    }

    return successResult(lines.join("\n"), {
      period: periodLabel,
      totalCount,
      shown: completed.length,
      books: completed.map((p) => ({ id: p.book.id, title: p.book.title })),
    });
  } catch (error) {
    return errorResult("Sorry, couldn't fetch reading history.", error);
  }
};

/**
 * Handle complex filter query
 * "Unread books under 300 pages", "Fantasy rated 4+ stars"
 * "What Harry Potter books have I read?", "Have I read any Sanderson?"
 */
export const complexFilterHandler: CommandHandler = async (intent, _context) => {
  try {
    const {
      genre,
      query,
      bookTitle,
      author,
      maxPages,
      minPages,
      minRating,
      readingStatus,
      sortBy,
      limit = 5,
    } = intent.params as AIIntentParameters;

    const whereClause: Record<string, unknown> = {};

    // Text search filter (title, author, description)
    const searchTerm = query || bookTitle || author;
    if (searchTerm) {
      whereClause.OR = [
        { title: { contains: searchTerm } },
        { author: { contains: searchTerm } },
        { description: { contains: searchTerm } },
      ];
    }

    // Genre filter
    if (genre) {
      whereClause.genre = { contains: genre };
    }

    // Page filters
    if (maxPages || minPages) {
      whereClause.pages = {};
      if (maxPages) (whereClause.pages as Record<string, number>).lte = maxPages;
      if (minPages) (whereClause.pages as Record<string, number>).gte = minPages;
    }

    // Rating filter
    if (minRating) {
      whereClause.ratingOverall = { gte: minRating };
    }

    // Reading status filter
    if (readingStatus) {
      switch (readingStatus) {
        case "reading":
          whereClause.read = "Reading";
          break;
        case "unread":
          whereClause.read = { notIn: ["Read", "Reading"] };
          break;
        case "finished":
          whereClause.read = "Read";
          break;
        case "dnf":
          whereClause.read = "DNF";
          break;
      }
    }

    // Determine sort order
    let orderBy: Record<string, string> = { title: "asc" };
    if (sortBy === "pages") orderBy = { pages: "asc" };
    else if (sortBy === "rating") orderBy = { ratingOverall: "desc" };
    else if (sortBy === "date") orderBy = { dateFinished: "desc" };
    else if (sortBy === "author") orderBy = { author: "asc" };

    const books = await prisma.book.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        author: true,
        pages: true,
        ratingOverall: true,
        read: true,
      },
      orderBy,
      take: Math.min(limit, 10),
    });

    const totalCount = await prisma.book.count({ where: whereClause });

    if (books.length === 0) {
      const filters = [];
      if (searchTerm) filters.push(`"${truncate(searchTerm, 20)}"`);
      if (genre) filters.push(genre);
      if (maxPages) filters.push(`under ${maxPages}p`);
      if (minRating) filters.push(`${minRating}+ stars`);
      if (readingStatus) filters.push(readingStatus);
      return successResult(`No books found matching: ${filters.join(", ")}`);
    }

    // Build header describing filters
    const filterParts = [];
    if (searchTerm) filterParts.push(`"${truncate(searchTerm, 15)}"`);
    if (readingStatus) filterParts.push(readingStatus);
    if (genre) filterParts.push(genre);
    if (maxPages) filterParts.push(`<${maxPages}p`);
    if (minRating) filterParts.push(`${minRating}+*`);

    const header =
      filterParts.length > 0
        ? `${filterParts.join(" ")} (${totalCount} found):`
        : `Found ${totalCount} books:`;

    const lines = [header];
    books.forEach((book, idx) => {
      const pages = book.pages ? ` ${book.pages}p` : "";
      const rating = book.ratingOverall ? ` ${book.ratingOverall}*` : "";
      lines.push(`${idx + 1}. ${truncate(book.title, 25)}${pages}${rating}`);
    });

    if (totalCount > books.length) {
      lines.push(`Reply MORE for more.`);
    }

    return successResult(lines.join("\n"), {
      filters: { query: searchTerm, genre, maxPages, minPages, minRating, readingStatus },
      totalCount,
      shown: books.length,
      books: books.map((b) => ({ id: b.id, title: b.title })),
    });
  } catch (error) {
    return errorResult("Sorry, couldn't filter books.", error);
  }
};

/**
 * Handle "more" / pagination request
 */
export const moreResultsHandler: CommandHandler = async (_intent, context) => {
  // This handler relies on context having previous results
  // The orchestrator should pass along pagination info
  return successResult(
    "Reply with your original query to see more results, or try a more specific search."
  );
};
