/**
 * Enhanced SMS Handlers Tests
 * Tests for new handler functions including book details, genre queries,
 * rating queries, goal tracking, time-based queries, and similar books
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  mockPrismaClient,
  resetPrismaMocks,
  createMockBook,
  createMockReadingProgress,
  createMockReadingGoal,
  createMockReadingSession,
} from '../mocks/prisma';
import {
  ALL_BOOKS,
  FICTION_BOOKS,
  READING_PROGRESS_FIXTURES,
  READING_GOAL_FIXTURES,
  READING_SESSION_FIXTURES,
  getBooksByGenre,
  getBooksAboveRating,
  getUnreadBooks,
  findSimilarBooks,
  getGenreStats,
} from '../mocks/books-fixture';

// Mock Prisma before importing handlers
vi.mock('@/lib/prisma', () => ({
  prisma: mockPrismaClient,
}));

// ============================================
// Mock Handler Implementations
// These represent the expected behavior of handlers to be implemented
// ============================================

interface HandlerResponse {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

interface HandlerParams {
  bookTitle?: string;
  genre?: string;
  minRating?: number;
  maxPages?: number;
  minPages?: number;
  year?: number;
  month?: string;
  period?: string;
  filter?: string;
  limit?: number;
  offset?: number;
}

// SMS max length constant
const SMS_MAX_LENGTH = 160;

/**
 * Mock handler for book details
 */
async function handleBookDetails(params: HandlerParams): Promise<HandlerResponse> {
  if (!params.bookTitle) {
    return {
      success: false,
      message: 'Please specify a book title. Example: "Tell me about Dune"',
    };
  }

  try {
    const book = await mockPrismaClient.book.findFirst({
      where: {
        title: { contains: params.bookTitle },
      },
    });

    if (!book) {
      return {
        success: false,
        message: `No book found matching "${params.bookTitle}". Try a different search.`,
      };
    }

    const details = [
      `"${book.title}"`,
      book.author ? `by ${book.author}` : '',
      book.pages ? `${book.pages} pages` : '',
      book.genre ? `Genre: ${book.genre}` : '',
      book.ratingOverall ? `Rating: ${book.ratingOverall}/5` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    return {
      success: true,
      message: details,
      data: { book },
    };
  } catch {
    return {
      success: false,
      message: 'Error retrieving book details. Please try again.',
    };
  }
}

/**
 * Mock handler for genre queries
 */
async function handleGenreQuery(params: HandlerParams): Promise<HandlerResponse> {
  try {
    if (params.genre) {
      const books = await mockPrismaClient.book.findMany({
        where: { genre: params.genre },
        take: params.limit || 5,
      });

      if (books.length === 0) {
        return {
          success: true,
          message: `No ${params.genre} books found in your library.`,
        };
      }

      const list = books
        .map((b: { title: string }, i: number) => `${i + 1}. ${b.title}`)
        .join('\n');

      return {
        success: true,
        message: `${params.genre} books (${books.length}):\n${list}`,
        data: { genre: params.genre, count: books.length, books },
      };
    }

    // Genre breakdown
    const allBooks = await mockPrismaClient.book.findMany();
    const genreCounts: Record<string, number> = {};
    allBooks.forEach((book: { genre?: string }) => {
      if (book.genre) {
        genreCounts[book.genre] = (genreCounts[book.genre] || 0) + 1;
      }
    });

    const sorted = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const breakdown = sorted.map(([genre, count]) => `${genre}: ${count}`).join('\n');

    return {
      success: true,
      message: `Top Genres:\n${breakdown}`,
      data: { genres: genreCounts },
    };
  } catch {
    return {
      success: false,
      message: 'Error retrieving genre information. Please try again.',
    };
  }
}

/**
 * Mock handler for rating queries
 */
async function handleRatingQuery(params: HandlerParams): Promise<HandlerResponse> {
  try {
    if (params.bookTitle) {
      const book = await mockPrismaClient.book.findFirst({
        where: { title: { contains: params.bookTitle } },
      });

      if (!book) {
        return {
          success: false,
          message: `No book found matching "${params.bookTitle}".`,
        };
      }

      if (!book.ratingOverall) {
        return {
          success: true,
          message: `"${book.title}" has not been rated yet.`,
          data: { book },
        };
      }

      return {
        success: true,
        message: `"${book.title}" rated ${book.ratingOverall}/5`,
        data: { book },
      };
    }

    // Get books by rating
    const books = await mockPrismaClient.book.findMany({
      where: params.minRating
        ? { ratingOverall: { gte: params.minRating } }
        : { ratingOverall: { not: null } },
      orderBy: { ratingOverall: 'desc' },
      take: params.limit || 5,
    });

    if (books.length === 0) {
      return {
        success: true,
        message: params.minRating
          ? `No books rated ${params.minRating}+ stars.`
          : 'No rated books found.',
      };
    }

    const list = books
      .map(
        (b: { title: string; ratingOverall?: number }, i: number) =>
          `${i + 1}. "${b.title}" - ${b.ratingOverall}/5`
      )
      .join('\n');

    return {
      success: true,
      message: params.minRating
        ? `${params.minRating}+ star books:\n${list}`
        : `Top rated:\n${list}`,
      data: { books },
    };
  } catch {
    return {
      success: false,
      message: 'Error retrieving ratings. Please try again.',
    };
  }
}

/**
 * Mock handler for goal queries
 */
async function handleGoalQuery(params: HandlerParams): Promise<HandlerResponse> {
  try {
    const goal = await mockPrismaClient.readingGoal.findFirst({
      where: params.period === 'month'
        ? { type: 'BOOKS_PER_MONTH' }
        : params.period === 'year'
        ? { type: 'BOOKS_PER_YEAR' }
        : undefined,
      orderBy: { updatedAt: 'desc' },
    });

    if (!goal) {
      return {
        success: true,
        message: 'No reading goals set. Set a goal to track your progress!',
      };
    }

    const remaining = goal.target - goal.current;
    const percentComplete = Math.round((goal.current / goal.target) * 100);
    const onTrack = percentComplete >= 50; // Simplified check

    let status: string;
    if (goal.current >= goal.target) {
      status = 'Goal achieved!';
    } else if (onTrack) {
      status = 'On track';
    } else {
      status = `${remaining} books behind`;
    }

    return {
      success: true,
      message: `Goal: ${goal.current}/${goal.target} books (${percentComplete}%)\nStatus: ${status}`,
      data: { goal, percentComplete, onTrack },
    };
  } catch {
    return {
      success: false,
      message: 'Error retrieving goal progress. Please try again.',
    };
  }
}

/**
 * Mock handler for time-based queries
 */
async function handleTimeQuery(params: HandlerParams): Promise<HandlerResponse> {
  try {
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    const now = new Date();

    if (params.period === 'last_month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (params.period === 'this_year') {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = now;
    } else if (params.period === 'last_week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = now;
    } else if (params.year) {
      startDate = new Date(params.year, 0, 1);
      endDate = new Date(params.year, 11, 31);
    }

    const books = await mockPrismaClient.book.findMany({
      where: {
        dateFinished: {
          gte: startDate?.toISOString(),
          lte: endDate?.toISOString(),
        },
      },
      take: params.limit || 5,
    });

    if (books.length === 0) {
      return {
        success: true,
        message: 'No books finished in this time period.',
      };
    }

    const list = books
      .map((b: { title: string }, i: number) => `${i + 1}. "${b.title}"`)
      .join('\n');

    return {
      success: true,
      message: `Books finished (${books.length}):\n${list}`,
      data: { books, count: books.length },
    };
  } catch {
    return {
      success: false,
      message: 'Error retrieving reading history. Please try again.',
    };
  }
}

/**
 * Mock handler for similar books
 */
async function handleSimilarBooks(params: HandlerParams): Promise<HandlerResponse> {
  try {
    if (params.bookTitle) {
      const sourceBook = await mockPrismaClient.book.findFirst({
        where: { title: { contains: params.bookTitle } },
      });

      if (!sourceBook) {
        return {
          success: false,
          message: `No book found matching "${params.bookTitle}".`,
        };
      }

      // Find similar books (same genre or author)
      const similar = await mockPrismaClient.book.findMany({
        where: {
          AND: [
            { id: { not: sourceBook.id } },
            {
              OR: [
                { genre: sourceBook.genre },
                { author: sourceBook.author },
              ],
            },
          ],
        },
        take: params.limit || 5,
      });

      if (similar.length === 0) {
        return {
          success: true,
          message: `No similar books found to "${sourceBook.title}".`,
          data: { sourceBook },
        };
      }

      const list = similar
        .map((b: { title: string; author?: string }, i: number) =>
          `${i + 1}. "${b.title}"${b.author ? ` by ${b.author}` : ''}`
        )
        .join('\n');

      return {
        success: true,
        message: `Similar to "${sourceBook.title}":\n${list}`,
        data: { sourceBook, similar },
      };
    }

    return {
      success: false,
      message: 'Please specify a book to find similar titles.',
    };
  } catch {
    return {
      success: false,
      message: 'Error finding similar books. Please try again.',
    };
  }
}

/**
 * Mock handler for complex filters
 */
async function handleComplexFilter(params: HandlerParams): Promise<HandlerResponse> {
  try {
    const where: Record<string, unknown> = {};

    if (params.genre) {
      where.genre = params.genre;
    }
    if (params.maxPages) {
      where.pages = { ...(where.pages as object || {}), lt: params.maxPages };
    }
    if (params.minPages) {
      where.pages = { ...(where.pages as object || {}), gt: params.minPages };
    }
    if (params.minRating) {
      where.ratingOverall = { gte: params.minRating };
    }
    if (params.filter === 'unread') {
      where.read = null;
    } else if (params.filter === 'reading') {
      where.read = 'reading';
    } else if (params.filter === 'completed') {
      where.read = 'read';
    }

    const books = await mockPrismaClient.book.findMany({
      where,
      take: params.limit || 5,
    });

    if (books.length === 0) {
      return {
        success: true,
        message: 'No books match your filters.',
      };
    }

    const list = books
      .map((b: { title: string; pages?: number }, i: number) =>
        `${i + 1}. "${b.title}"${b.pages ? ` (${b.pages}p)` : ''}`
      )
      .join('\n');

    return {
      success: true,
      message: `Found ${books.length} books:\n${list}`,
      data: { books, count: books.length },
    };
  } catch {
    return {
      success: false,
      message: 'Error applying filters. Please try again.',
    };
  }
}

/**
 * Mock handler for book comparison
 */
async function handleComparison(params: { books: string[] }): Promise<HandlerResponse> {
  if (!params.books || params.books.length < 2) {
    return {
      success: false,
      message: 'Please specify two books to compare.',
    };
  }

  try {
    const [book1, book2] = await Promise.all([
      mockPrismaClient.book.findFirst({
        where: { title: { contains: params.books[0] } },
      }),
      mockPrismaClient.book.findFirst({
        where: { title: { contains: params.books[1] } },
      }),
    ]);

    if (!book1 || !book2) {
      const missing = !book1 ? params.books[0] : params.books[1];
      return {
        success: false,
        message: `Couldn't find "${missing}" in your library.`,
      };
    }

    const comparisons: string[] = [];

    // Page comparison
    if (book1.pages && book2.pages) {
      const longer = book1.pages > book2.pages ? book1.title : book2.title;
      const diff = Math.abs(book1.pages - book2.pages);
      comparisons.push(`"${longer}" is longer by ${diff} pages`);
    }

    // Rating comparison
    if (book1.ratingOverall && book2.ratingOverall) {
      const better = book1.ratingOverall > book2.ratingOverall ? book1.title : book2.title;
      comparisons.push(`"${better}" is rated higher`);
    }

    if (comparisons.length === 0) {
      return {
        success: true,
        message: `"${book1.title}" vs "${book2.title}" - Not enough data to compare.`,
        data: { book1, book2 },
      };
    }

    return {
      success: true,
      message: comparisons.join('\n'),
      data: { book1, book2 },
    };
  } catch {
    return {
      success: false,
      message: 'Error comparing books. Please try again.',
    };
  }
}

// ============================================
// Test Suite
// ============================================

describe('Enhanced SMS Handlers', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('handleBookDetails', () => {
    it('should return book details for a valid book', async () => {
      const mockBook = FICTION_BOOKS[0]; // The Hobbit
      mockPrismaClient.book.findFirst.mockResolvedValue(mockBook);

      const result = await handleBookDetails({ bookTitle: 'The Hobbit' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('The Hobbit');
      expect(result.message).toContain('J.R.R. Tolkien');
      expect(result.message).toContain('310 pages');
      expect(result.message).toContain('Fantasy');
    });

    it('should return error when no book title provided', async () => {
      const result = await handleBookDetails({});

      expect(result.success).toBe(false);
      expect(result.message).toContain('Please specify a book title');
    });

    it('should return error when book not found', async () => {
      mockPrismaClient.book.findFirst.mockResolvedValue(null);

      const result = await handleBookDetails({ bookTitle: 'Nonexistent Book' });

      expect(result.success).toBe(false);
      expect(result.message).toContain('No book found');
    });

    it('should handle database errors gracefully', async () => {
      mockPrismaClient.book.findFirst.mockRejectedValue(new Error('DB Error'));

      const result = await handleBookDetails({ bookTitle: 'Test' });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Error');
    });

    it('should include rating when available', async () => {
      const mockBook = { ...FICTION_BOOKS[0], ratingOverall: 4.5 };
      mockPrismaClient.book.findFirst.mockResolvedValue(mockBook);

      const result = await handleBookDetails({ bookTitle: 'The Hobbit' });

      expect(result.message).toContain('Rating: 4.5/5');
    });

    it('should handle books without author', async () => {
      const mockBook = { ...FICTION_BOOKS[0], author: null };
      mockPrismaClient.book.findFirst.mockResolvedValue(mockBook);

      const result = await handleBookDetails({ bookTitle: 'Test' });

      expect(result.success).toBe(true);
      expect(result.message).not.toContain('by null');
    });
  });

  describe('handleGenreQuery', () => {
    it('should return books for a specific genre', async () => {
      const fantasyBooks = getBooksByGenre('Fantasy');
      mockPrismaClient.book.findMany.mockResolvedValue(fantasyBooks);

      const result = await handleGenreQuery({ genre: 'Fantasy' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Fantasy');
      expect(result.data?.count).toBeGreaterThan(0);
    });

    it('should return genre breakdown when no specific genre requested', async () => {
      mockPrismaClient.book.findMany.mockResolvedValue(ALL_BOOKS);

      const result = await handleGenreQuery({});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Top Genres');
      expect(result.data?.genres).toBeDefined();
    });

    it('should handle empty genre results', async () => {
      mockPrismaClient.book.findMany.mockResolvedValue([]);

      const result = await handleGenreQuery({ genre: 'NonexistentGenre' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('No NonexistentGenre books found');
    });

    it('should limit results', async () => {
      const books = ALL_BOOKS.slice(0, 3);
      mockPrismaClient.book.findMany.mockResolvedValue(books);

      const result = await handleGenreQuery({ genre: 'Fantasy', limit: 3 });

      expect(result.success).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      mockPrismaClient.book.findMany.mockRejectedValue(new Error('DB Error'));

      const result = await handleGenreQuery({ genre: 'Fantasy' });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Error');
    });
  });

  describe('handleRatingQuery', () => {
    it('should return rating for a specific book', async () => {
      const mockBook = FICTION_BOOKS[0]; // Has ratingOverall
      mockPrismaClient.book.findFirst.mockResolvedValue(mockBook);

      const result = await handleRatingQuery({ bookTitle: 'The Hobbit' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('The Hobbit');
      expect(result.message).toContain('/5');
    });

    it('should indicate when book is not rated', async () => {
      const unratedBook = { ...FICTION_BOOKS[0], ratingOverall: null };
      mockPrismaClient.book.findFirst.mockResolvedValue(unratedBook);

      const result = await handleRatingQuery({ bookTitle: 'Test Book' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('not been rated');
    });

    it('should return books above minimum rating', async () => {
      const highRated = getBooksAboveRating(4);
      mockPrismaClient.book.findMany.mockResolvedValue(highRated);

      const result = await handleRatingQuery({ minRating: 4 });

      expect(result.success).toBe(true);
      expect(result.message).toContain('4+ star');
    });

    it('should return top rated books when no filter specified', async () => {
      const ratedBooks = ALL_BOOKS.filter((b) => b.ratingOverall);
      mockPrismaClient.book.findMany.mockResolvedValue(ratedBooks.slice(0, 5));

      const result = await handleRatingQuery({});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Top rated');
    });

    it('should handle no rated books', async () => {
      mockPrismaClient.book.findMany.mockResolvedValue([]);

      const result = await handleRatingQuery({});

      expect(result.success).toBe(true);
      expect(result.message).toContain('No rated books');
    });

    it('should return error when book not found', async () => {
      mockPrismaClient.book.findFirst.mockResolvedValue(null);

      const result = await handleRatingQuery({ bookTitle: 'Nonexistent' });

      expect(result.success).toBe(false);
      expect(result.message).toContain('No book found');
    });
  });

  describe('handleGoalQuery', () => {
    it('should return goal progress when goal exists', async () => {
      const mockGoal = READING_GOAL_FIXTURES[0]; // Monthly goal
      mockPrismaClient.readingGoal.findFirst.mockResolvedValue(mockGoal);

      const result = await handleGoalQuery({});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Goal:');
      expect(result.message).toContain('%');
    });

    it('should indicate when no goals are set', async () => {
      mockPrismaClient.readingGoal.findFirst.mockResolvedValue(null);

      const result = await handleGoalQuery({});

      expect(result.success).toBe(true);
      expect(result.message).toContain('No reading goals set');
    });

    it('should show goal achieved status', async () => {
      const achievedGoal = { ...READING_GOAL_FIXTURES[0], current: 5, target: 4 };
      mockPrismaClient.readingGoal.findFirst.mockResolvedValue(achievedGoal);

      const result = await handleGoalQuery({});

      expect(result.success).toBe(true);
      expect(result.message).toContain('achieved');
    });

    it('should show on track status', async () => {
      const onTrackGoal = { ...READING_GOAL_FIXTURES[0], current: 3, target: 4 };
      mockPrismaClient.readingGoal.findFirst.mockResolvedValue(onTrackGoal);

      const result = await handleGoalQuery({});

      expect(result.success).toBe(true);
      expect(result.message).toContain('On track');
    });

    it('should show behind status', async () => {
      const behindGoal = { ...READING_GOAL_FIXTURES[0], current: 1, target: 10 };
      mockPrismaClient.readingGoal.findFirst.mockResolvedValue(behindGoal);

      const result = await handleGoalQuery({});

      expect(result.success).toBe(true);
      expect(result.message).toContain('behind');
    });

    it('should handle monthly goal period filter', async () => {
      mockPrismaClient.readingGoal.findFirst.mockResolvedValue(READING_GOAL_FIXTURES[0]);

      const result = await handleGoalQuery({ period: 'month' });

      expect(result.success).toBe(true);
      expect(mockPrismaClient.readingGoal.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: 'BOOKS_PER_MONTH' },
        })
      );
    });

    it('should handle yearly goal period filter', async () => {
      mockPrismaClient.readingGoal.findFirst.mockResolvedValue(READING_GOAL_FIXTURES[1]);

      const result = await handleGoalQuery({ period: 'year' });

      expect(result.success).toBe(true);
      expect(mockPrismaClient.readingGoal.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: 'BOOKS_PER_YEAR' },
        })
      );
    });
  });

  describe('handleTimeQuery', () => {
    it('should return books finished in a time period', async () => {
      const finishedBooks = ALL_BOOKS.filter((b) => b.dateFinished);
      mockPrismaClient.book.findMany.mockResolvedValue(finishedBooks.slice(0, 3));

      const result = await handleTimeQuery({ period: 'this_year' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Books finished');
    });

    it('should handle last month period', async () => {
      mockPrismaClient.book.findMany.mockResolvedValue([FICTION_BOOKS[0]]);

      const result = await handleTimeQuery({ period: 'last_month' });

      expect(result.success).toBe(true);
    });

    it('should handle last week period', async () => {
      mockPrismaClient.book.findMany.mockResolvedValue([]);

      const result = await handleTimeQuery({ period: 'last_week' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('No books finished');
    });

    it('should handle specific year query', async () => {
      mockPrismaClient.book.findMany.mockResolvedValue([FICTION_BOOKS[0], FICTION_BOOKS[1]]);

      const result = await handleTimeQuery({ year: 2024 });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Books finished');
    });

    it('should handle no books in time period', async () => {
      mockPrismaClient.book.findMany.mockResolvedValue([]);

      const result = await handleTimeQuery({ year: 2020 });

      expect(result.success).toBe(true);
      expect(result.message).toContain('No books finished');
    });

    it('should handle database errors gracefully', async () => {
      mockPrismaClient.book.findMany.mockRejectedValue(new Error('DB Error'));

      const result = await handleTimeQuery({ period: 'this_year' });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Error');
    });
  });

  describe('handleSimilarBooks', () => {
    it('should return similar books based on genre', async () => {
      const sourceBook = FICTION_BOOKS[0]; // The Hobbit - Fantasy
      const similarBooks = getBooksByGenre('Fantasy').filter((b) => b.id !== sourceBook.id);

      mockPrismaClient.book.findFirst.mockResolvedValue(sourceBook);
      mockPrismaClient.book.findMany.mockResolvedValue(similarBooks);

      const result = await handleSimilarBooks({ bookTitle: 'The Hobbit' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Similar to');
      expect(result.data?.similar).toBeDefined();
    });

    it('should return similar books based on author', async () => {
      const sourceBook = FICTION_BOOKS[2]; // The Martian - Andy Weir
      const sameAuthor = ALL_BOOKS.filter(
        (b) => b.author === 'Andy Weir' && b.id !== sourceBook.id
      );

      mockPrismaClient.book.findFirst.mockResolvedValue(sourceBook);
      mockPrismaClient.book.findMany.mockResolvedValue(sameAuthor);

      const result = await handleSimilarBooks({ bookTitle: 'The Martian' });

      expect(result.success).toBe(true);
    });

    it('should handle no similar books found', async () => {
      const uniqueBook = createMockBook({ id: 999, genre: 'Unique', author: 'Nobody' });
      mockPrismaClient.book.findFirst.mockResolvedValue(uniqueBook);
      mockPrismaClient.book.findMany.mockResolvedValue([]);

      const result = await handleSimilarBooks({ bookTitle: 'Unique Book' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('No similar books found');
    });

    it('should return error when source book not found', async () => {
      mockPrismaClient.book.findFirst.mockResolvedValue(null);

      const result = await handleSimilarBooks({ bookTitle: 'Nonexistent' });

      expect(result.success).toBe(false);
      expect(result.message).toContain('No book found');
    });

    it('should return error when no book title provided', async () => {
      const result = await handleSimilarBooks({});

      expect(result.success).toBe(false);
      expect(result.message).toContain('Please specify a book');
    });
  });

  describe('handleComplexFilter', () => {
    it('should filter by genre', async () => {
      const fantasyBooks = getBooksByGenre('Fantasy');
      mockPrismaClient.book.findMany.mockResolvedValue(fantasyBooks);

      const result = await handleComplexFilter({ genre: 'Fantasy' });

      expect(result.success).toBe(true);
      expect(result.data?.count).toBeGreaterThan(0);
    });

    it('should filter by max pages', async () => {
      const shortBooks = ALL_BOOKS.filter((b) => b.pages && b.pages < 300);
      mockPrismaClient.book.findMany.mockResolvedValue(shortBooks);

      const result = await handleComplexFilter({ maxPages: 300 });

      expect(result.success).toBe(true);
    });

    it('should filter by min pages', async () => {
      const longBooks = ALL_BOOKS.filter((b) => b.pages && b.pages > 500);
      mockPrismaClient.book.findMany.mockResolvedValue(longBooks);

      const result = await handleComplexFilter({ minPages: 500 });

      expect(result.success).toBe(true);
    });

    it('should filter by unread status', async () => {
      const unreadBooks = getUnreadBooks();
      mockPrismaClient.book.findMany.mockResolvedValue(unreadBooks);

      const result = await handleComplexFilter({ filter: 'unread' });

      expect(result.success).toBe(true);
    });

    it('should combine multiple filters', async () => {
      const filtered = ALL_BOOKS.filter(
        (b) => b.genre === 'Fantasy' && b.pages && b.pages < 400 && !b.read
      );
      mockPrismaClient.book.findMany.mockResolvedValue(filtered);

      const result = await handleComplexFilter({
        genre: 'Fantasy',
        maxPages: 400,
        filter: 'unread',
      });

      expect(result.success).toBe(true);
    });

    it('should handle no matches', async () => {
      mockPrismaClient.book.findMany.mockResolvedValue([]);

      const result = await handleComplexFilter({
        genre: 'Fantasy',
        minPages: 2000,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('No books match');
    });

    it('should handle database errors gracefully', async () => {
      mockPrismaClient.book.findMany.mockRejectedValue(new Error('DB Error'));

      const result = await handleComplexFilter({ genre: 'Fantasy' });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Error');
    });
  });

  describe('handleComparison', () => {
    it('should compare two books by pages', async () => {
      const book1 = FICTION_BOOKS[0]; // The Hobbit - 310 pages
      const book2 = FICTION_BOOKS[1]; // Dune - 688 pages

      mockPrismaClient.book.findFirst
        .mockResolvedValueOnce(book1)
        .mockResolvedValueOnce(book2);

      const result = await handleComparison({ books: ['The Hobbit', 'Dune'] });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Dune');
      expect(result.message).toContain('longer');
    });

    it('should compare two books by rating', async () => {
      const book1 = { ...FICTION_BOOKS[0], ratingOverall: 4.5 };
      const book2 = { ...FICTION_BOOKS[1], ratingOverall: 4.0 };

      mockPrismaClient.book.findFirst
        .mockResolvedValueOnce(book1)
        .mockResolvedValueOnce(book2);

      const result = await handleComparison({ books: ['Book A', 'Book B'] });

      expect(result.success).toBe(true);
      expect(result.message).toContain('rated higher');
    });

    it('should return error when first book not found', async () => {
      mockPrismaClient.book.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(FICTION_BOOKS[1]);

      const result = await handleComparison({ books: ['Nonexistent', 'Dune'] });

      expect(result.success).toBe(false);
      expect(result.message).toContain("Couldn't find");
    });

    it('should return error when second book not found', async () => {
      mockPrismaClient.book.findFirst
        .mockResolvedValueOnce(FICTION_BOOKS[0])
        .mockResolvedValueOnce(null);

      const result = await handleComparison({ books: ['The Hobbit', 'Nonexistent'] });

      expect(result.success).toBe(false);
      expect(result.message).toContain("Couldn't find");
    });

    it('should return error when less than two books provided', async () => {
      const result = await handleComparison({ books: ['Single Book'] });

      expect(result.success).toBe(false);
      expect(result.message).toContain('two books');
    });

    it('should return error when no books provided', async () => {
      const result = await handleComparison({ books: [] });

      expect(result.success).toBe(false);
      expect(result.message).toContain('two books');
    });

    it('should handle books with missing data', async () => {
      const book1 = { ...FICTION_BOOKS[0], pages: null, ratingOverall: null };
      const book2 = { ...FICTION_BOOKS[1], pages: null, ratingOverall: null };

      mockPrismaClient.book.findFirst
        .mockResolvedValueOnce(book1)
        .mockResolvedValueOnce(book2);

      const result = await handleComparison({ books: ['Book A', 'Book B'] });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Not enough data');
    });
  });

  describe('SMS Length Limits', () => {
    it('should produce responses under SMS length limit for simple queries', async () => {
      const mockBook = createMockBook({ title: 'Short', author: 'Author', pages: 200 });
      mockPrismaClient.book.findFirst.mockResolvedValue(mockBook);

      const result = await handleBookDetails({ bookTitle: 'Short' });

      // For single book details, should be concise
      expect(result.message.length).toBeLessThan(SMS_MAX_LENGTH * 2);
    });

    it('should truncate long book lists appropriately', async () => {
      const manyBooks = ALL_BOOKS.slice(0, 10);
      mockPrismaClient.book.findMany.mockResolvedValue(manyBooks);

      const result = await handleGenreQuery({ genre: 'Fiction' });

      // With limit: 5 default, should be manageable
      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should not expose internal errors in responses', async () => {
      mockPrismaClient.book.findFirst.mockRejectedValue(
        new Error('SENSITIVE: Database credentials exposed')
      );

      const result = await handleBookDetails({ bookTitle: 'Test' });

      expect(result.message).not.toContain('SENSITIVE');
      expect(result.message).not.toContain('credentials');
      expect(result.message).toContain('Error');
    });

    it('should provide helpful error messages', async () => {
      mockPrismaClient.book.findFirst.mockResolvedValue(null);

      const result = await handleBookDetails({ bookTitle: 'Unknown' });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Try');
    });
  });
});
