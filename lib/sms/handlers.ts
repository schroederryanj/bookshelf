/**
 * SMS Command Handlers
 * Individual handlers for each intent type
 */

import { prisma } from '@/lib/prisma';
import type {
  HandlerResponse,
  IntentParameters,
  BookSummary,
  ReadingStatsSummary,
  ConversationContext,
} from './types';

/**
 * Format a book summary for SMS response
 */
function formatBookSummary(book: BookSummary): string {
  const progress = book.progressPercent > 0
    ? ` (${Math.round(book.progressPercent)}%)`
    : '';
  const pages = book.pages
    ? ` - ${book.currentPage}/${book.pages} pages`
    : '';
  return `"${book.title}"${book.author ? ` by ${book.author}` : ''}${pages}${progress}`;
}

/**
 * Handle progress update command
 */
export async function handleUpdateProgress(
  params: IntentParameters,
  context?: ConversationContext
): Promise<HandlerResponse> {
  const { pageNumber, percentComplete, bookId } = params;

  // Try to determine which book to update
  const targetBookId = bookId || context?.lastBookId;

  if (!targetBookId && !pageNumber && !percentComplete) {
    return {
      success: false,
      message: 'Please specify a page number or percentage. Example: "page 150" or "50%"',
    };
  }

  try {
    // If no specific book, get the most recently updated "reading" book
    let bookProgress;

    if (targetBookId) {
      bookProgress = await prisma.readingProgress.findFirst({
        where: { bookId: targetBookId },
        include: { book: true },
      });
    } else {
      bookProgress = await prisma.readingProgress.findFirst({
        where: { status: 'READING' },
        orderBy: { updatedAt: 'desc' },
        include: { book: true },
      });
    }

    if (!bookProgress) {
      return {
        success: false,
        message: 'No active book found. Start reading a book first with "start [book title]"',
      };
    }

    const totalPages = bookProgress.book.pages || bookProgress.totalPages;
    let newPage = pageNumber;
    let newPercent = percentComplete;

    // Calculate page from percentage if only percentage provided
    if (!newPage && newPercent && totalPages) {
      newPage = Math.round((newPercent / 100) * totalPages);
    }

    // Calculate percentage from page if only page provided
    if (newPage && totalPages && !newPercent) {
      newPercent = (newPage / totalPages) * 100;
    }

    // Validate page number
    if (newPage && totalPages && newPage > totalPages) {
      return {
        success: false,
        message: `"${bookProgress.book.title}" only has ${totalPages} pages. Did you finish the book?`,
      };
    }

    // Update progress
    const isComplete = newPercent && newPercent >= 100;

    await prisma.readingProgress.update({
      where: { id: bookProgress.id },
      data: {
        currentPage: newPage || bookProgress.currentPage,
        progressPercent: newPercent || bookProgress.progressPercent,
        status: isComplete ? 'COMPLETED' : 'READING',
        completedAt: isComplete ? new Date() : undefined,
      },
    });

    const responseMsg = isComplete
      ? `Congratulations! You've finished "${bookProgress.book.title}"!`
      : `Updated "${bookProgress.book.title}" to page ${newPage}${newPercent ? ` (${Math.round(newPercent)}%)` : ''}`;

    return {
      success: true,
      message: responseMsg,
      data: { bookId: bookProgress.bookId, page: newPage, percent: newPercent },
    };
  } catch (error) {
    console.error('Error updating progress:', error);
    return {
      success: false,
      message: 'Sorry, there was an error updating your progress. Please try again.',
    };
  }
}

/**
 * Handle start book command
 */
export async function handleStartBook(params: IntentParameters): Promise<HandlerResponse> {
  const { bookTitle } = params;

  if (!bookTitle) {
    return {
      success: false,
      message: 'Please specify a book title. Example: "start The Great Gatsby"',
    };
  }

  try {
    // Search for the book
    const book = await prisma.book.findFirst({
      where: {
        title: {
          contains: bookTitle,
        },
      },
    });

    if (!book) {
      return {
        success: false,
        message: `Couldn't find a book matching "${bookTitle}". Check the title or add it to your library first.`,
      };
    }

    // Check if already reading
    const existingProgress = await prisma.readingProgress.findFirst({
      where: { bookId: book.id },
    });

    if (existingProgress?.status === 'READING') {
      return {
        success: false,
        message: `You're already reading "${book.title}". Current progress: ${Math.round(existingProgress.progressPercent)}%`,
      };
    }

    // Create or update reading progress
    await prisma.readingProgress.upsert({
      where: {
        bookId_userId: {
          bookId: book.id,
          userId: 'default',
        },
      },
      create: {
        bookId: book.id,
        status: 'READING',
        currentPage: 0,
        progressPercent: 0,
        totalPages: book.pages,
        startedAt: new Date(),
      },
      update: {
        status: 'READING',
        currentPage: 0,
        progressPercent: 0,
        startedAt: new Date(),
        completedAt: null,
      },
    });

    return {
      success: true,
      message: `Started reading "${book.title}"${book.pages ? ` (${book.pages} pages)` : ''}. Good luck!`,
      data: { bookId: book.id, title: book.title },
    };
  } catch (error) {
    console.error('Error starting book:', error);
    return {
      success: false,
      message: 'Sorry, there was an error starting the book. Please try again.',
    };
  }
}

/**
 * Handle finish book command
 */
export async function handleFinishBook(
  params: IntentParameters,
  context?: ConversationContext
): Promise<HandlerResponse> {
  const { bookTitle, bookId } = params;
  const targetBookId = bookId || context?.lastBookId;

  try {
    let bookProgress;

    if (targetBookId) {
      bookProgress = await prisma.readingProgress.findFirst({
        where: { bookId: targetBookId, status: 'READING' },
        include: { book: true },
      });
    } else if (bookTitle) {
      bookProgress = await prisma.readingProgress.findFirst({
        where: {
          status: 'READING',
          book: {
            title: {
              contains: bookTitle,
            },
          },
        },
        include: { book: true },
      });
    } else {
      // Get the most recently updated reading book
      bookProgress = await prisma.readingProgress.findFirst({
        where: { status: 'READING' },
        orderBy: { updatedAt: 'desc' },
        include: { book: true },
      });
    }

    if (!bookProgress) {
      return {
        success: false,
        message: bookTitle
          ? `Couldn't find "${bookTitle}" in your currently reading list.`
          : 'No active book found to finish.',
      };
    }

    // Mark as completed
    await prisma.readingProgress.update({
      where: { id: bookProgress.id },
      data: {
        status: 'COMPLETED',
        progressPercent: 100,
        currentPage: bookProgress.book.pages || bookProgress.currentPage,
        completedAt: new Date(),
      },
    });

    return {
      success: true,
      message: `Congratulations on finishing "${bookProgress.book.title}"! That's awesome!`,
      data: { bookId: bookProgress.bookId, title: bookProgress.book.title },
    };
  } catch (error) {
    console.error('Error finishing book:', error);
    return {
      success: false,
      message: 'Sorry, there was an error marking the book as finished. Please try again.',
    };
  }
}

/**
 * Handle get status command
 */
export async function handleGetStatus(context?: ConversationContext): Promise<HandlerResponse> {
  try {
    const targetBookId = context?.lastBookId;

    if (targetBookId) {
      const progress = await prisma.readingProgress.findFirst({
        where: { bookId: targetBookId },
        include: { book: true },
      });

      if (progress) {
        const summary: BookSummary = {
          id: progress.book.id,
          title: progress.book.title,
          author: progress.book.author,
          pages: progress.book.pages,
          currentPage: progress.currentPage,
          progressPercent: progress.progressPercent,
          status: progress.status,
        };

        return {
          success: true,
          message: formatBookSummary(summary),
          data: { book: summary },
        };
      }
    }

    // Get current reading book
    const currentBook = await prisma.readingProgress.findFirst({
      where: { status: 'READING' },
      orderBy: { updatedAt: 'desc' },
      include: { book: true },
    });

    if (!currentBook) {
      return {
        success: true,
        message: 'You\'re not currently reading any books. Start one with "start [book title]"',
      };
    }

    const summary: BookSummary = {
      id: currentBook.book.id,
      title: currentBook.book.title,
      author: currentBook.book.author,
      pages: currentBook.book.pages,
      currentPage: currentBook.currentPage,
      progressPercent: currentBook.progressPercent,
      status: currentBook.status,
    };

    return {
      success: true,
      message: `Currently reading: ${formatBookSummary(summary)}`,
      data: { book: summary },
    };
  } catch (error) {
    console.error('Error getting status:', error);
    return {
      success: false,
      message: 'Sorry, there was an error getting your status. Please try again.',
    };
  }
}

/**
 * Handle list reading command
 */
export async function handleListReading(): Promise<HandlerResponse> {
  try {
    const readingBooks = await prisma.readingProgress.findMany({
      where: { status: 'READING' },
      include: { book: true },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    if (readingBooks.length === 0) {
      return {
        success: true,
        message: 'You\'re not currently reading any books. Start one with "start [book title]"',
      };
    }

    const bookList = readingBooks.map((progress, index) => {
      const pct = Math.round(progress.progressPercent);
      return `${index + 1}. "${progress.book.title}" - ${pct}%`;
    }).join('\n');

    return {
      success: true,
      message: `Currently reading (${readingBooks.length}):\n${bookList}`,
      data: { count: readingBooks.length },
    };
  } catch (error) {
    console.error('Error listing books:', error);
    return {
      success: false,
      message: 'Sorry, there was an error getting your reading list. Please try again.',
    };
  }
}

/**
 * Handle search book command
 * Searches title, author, genre, and description
 */
export async function handleSearchBook(params: IntentParameters): Promise<HandlerResponse> {
  const { query, genre, author } = params;
  const searchTerm = query || genre || author;

  if (!searchTerm) {
    return {
      success: false,
      message: 'Please specify what to search for. Example: "find Harry Potter" or "fantasy books"',
    };
  }

  try {
    // Search across title, author, genre, and description
    const books = await prisma.book.findMany({
      where: {
        OR: [
          { title: { contains: searchTerm } },
          { author: { contains: searchTerm } },
          { genre: { contains: searchTerm } },
          { description: { contains: searchTerm } },
        ],
      },
      select: {
        id: true,
        title: true,
        author: true,
        genre: true,
        pages: true,
        read: true,
        ratingOverall: true,
      },
      orderBy: [
        { ratingOverall: 'desc' },
        { title: 'asc' },
      ],
      take: 5,
    });

    // Get total count
    const totalCount = await prisma.book.count({
      where: {
        OR: [
          { title: { contains: searchTerm } },
          { author: { contains: searchTerm } },
          { genre: { contains: searchTerm } },
          { description: { contains: searchTerm } },
        ],
      },
    });

    if (books.length === 0) {
      return {
        success: true,
        message: `No books found matching "${searchTerm}". Try a different search term.`,
      };
    }

    const bookList = books.map((book, index) => {
      const status = book.read === 'Read' ? '✓' : book.read === 'Reading' ? '📖' : '';
      const rating = book.ratingOverall ? ` ★${book.ratingOverall}` : '';
      const author = book.author ? ` - ${book.author.length > 15 ? book.author.slice(0, 15) + '...' : book.author}` : '';
      return `${index + 1}. ${status}${book.title.length > 25 ? book.title.slice(0, 25) + '...' : book.title}${rating}${author}`;
    }).join('\n');

    const moreMsg = totalCount > 5 ? `\nReply MORE for more results.` : '';

    return {
      success: true,
      message: `Found ${totalCount} book(s) matching "${searchTerm}":\n${bookList}${moreMsg}`,
      data: {
        books: books.map(b => ({ id: b.id, title: b.title })),
        totalCount,
        shown: books.length,
      },
    };
  } catch (error) {
    console.error('Error searching books:', error);
    return {
      success: false,
      message: 'Sorry, there was an error searching. Please try again.',
    };
  }
}

/**
 * Handle get stats command
 */
export async function handleGetStats(): Promise<HandlerResponse> {
  try {
    const [readingCount, completedCount, recentSessions] = await Promise.all([
      prisma.readingProgress.count({ where: { status: 'READING' } }),
      prisma.readingProgress.count({ where: { status: 'COMPLETED' } }),
      prisma.readingSession.findMany({
        take: 5,
        orderBy: { startTime: 'desc' },
        include: { book: true },
      }),
    ]);

    // Calculate total pages read from sessions
    const totalPagesResult = await prisma.readingSession.aggregate({
      _sum: { pagesRead: true },
    });

    const totalPages = totalPagesResult._sum.pagesRead || 0;

    const stats: ReadingStatsSummary = {
      booksReading: readingCount,
      booksCompleted: completedCount,
      totalPagesRead: totalPages,
      currentStreak: 0, // Would need streak tracking logic
      recentlyRead: recentSessions.map(s => s.book.title),
    };

    const message = [
      'Your Reading Stats:',
      `Books completed: ${stats.booksCompleted}`,
      `Currently reading: ${stats.booksReading}`,
      `Total pages read: ${stats.totalPagesRead.toLocaleString()}`,
    ].join('\n');

    return {
      success: true,
      message,
      data: { stats },
    };
  } catch (error) {
    console.error('Error getting stats:', error);
    return {
      success: false,
      message: 'Sorry, there was an error getting your stats. Please try again.',
    };
  }
}

/**
 * Handle help command
 */
export function handleHelp(): HandlerResponse {
  const helpText = [
    'Bookshelf SMS Commands:',
    '',
    'Progress: "page 150" or "50%"',
    'Start: "start [book title]"',
    'Finish: "finished [book]"',
    'Search: "find Harry Potter"',
    'History: "What X books have I read?"',
    'Suggest: "recommend fantasy"',
    'Picks: "Drewberts Picks"',
    'Status: "what am I reading?"',
    'Stats: "my stats"',
    '',
    'Just ask naturally!',
    'Anything Drew would say, goes... :)',
  ].join('\n');

  return {
    success: true,
    message: helpText,
  };
}

/**
 * Handle unknown command - try searching and be helpful
 */
export async function handleUnknown(rawMessage: string): Promise<HandlerResponse> {
  const trimmed = rawMessage.trim();
  const wordCount = trimmed.split(/\s+/).length;

  // For any message up to 5 words, try searching the library
  // This catches things like "Harry Potter", "Brandon Sanderson", "business books"
  if (wordCount <= 5 && trimmed.length >= 2) {
    const searchResult = await handleSearchBook({ query: trimmed });
    // If we found books, return the search result
    if (searchResult.success && searchResult.data?.books &&
        (searchResult.data.books as Array<unknown>).length > 0) {
      return searchResult;
    }
  }

  // Provide a helpful response with suggestions
  const suggestions = [
    'Try: "search [title]" to find books',
    '"page 50" to update progress',
    '"recommend fantasy" for suggestions',
    '"help" for all commands',
  ];

  return {
    success: false,
    message: `I couldn't find anything for "${trimmed.substring(0, 25)}${trimmed.length > 25 ? '...' : ''}"\n\n${suggestions.join('\n')}`,
  };
}
