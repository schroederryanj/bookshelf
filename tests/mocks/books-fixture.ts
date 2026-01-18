/**
 * Enhanced Book Fixtures for Testing
 * Provides diverse mock data for comprehensive SMS testing
 */

import { vi } from 'vitest';
import type { MockBook, MockReadingProgress, MockReadingSession, MockReadingGoal } from './prisma';

// ============================================
// Book Fixtures - Diverse Collection
// ============================================

/**
 * Fiction books across different genres
 */
export const FICTION_BOOKS: MockBook[] = [
  {
    id: 1,
    title: 'The Hobbit',
    img: '/covers/hobbit.jpg',
    height: 200,
    read: 'read',
    dateStarted: '2024-01-01',
    dateFinished: '2024-01-15',
    author: 'J.R.R. Tolkien',
    pages: 310,
    genre: 'Fantasy',
    description: 'A hobbit embarks on an unexpected journey.',
    ratingWriting: 5,
    ratingPlot: 5,
    ratingCharacters: 5,
    ratingPacing: 4,
    ratingWorldBuilding: 5,
    ratingEnjoyment: 5,
    ratingRecommend: 5,
    ratingOverall: 4.86,
    ratingOverrideManual: false,
    shelf: 1,
    position: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 2,
    title: 'Dune',
    img: '/covers/dune.jpg',
    height: 220,
    read: 'read',
    dateStarted: '2024-02-01',
    dateFinished: '2024-02-20',
    author: 'Frank Herbert',
    pages: 688,
    genre: 'Science Fiction',
    description: 'A young noble must navigate politics on a desert planet.',
    ratingWriting: 5,
    ratingPlot: 5,
    ratingCharacters: 4,
    ratingPacing: 3,
    ratingWorldBuilding: 5,
    ratingEnjoyment: 5,
    ratingRecommend: 5,
    ratingOverall: 4.57,
    ratingOverrideManual: false,
    shelf: 1,
    position: 1,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-20'),
  },
  {
    id: 3,
    title: 'The Martian',
    img: '/covers/martian.jpg',
    height: 200,
    read: 'read',
    dateStarted: '2024-03-01',
    dateFinished: '2024-03-10',
    author: 'Andy Weir',
    pages: 369,
    genre: 'Science Fiction',
    description: 'An astronaut struggles to survive alone on Mars.',
    ratingWriting: 4,
    ratingPlot: 5,
    ratingCharacters: 4,
    ratingPacing: 5,
    ratingWorldBuilding: 4,
    ratingEnjoyment: 5,
    ratingRecommend: 5,
    ratingOverall: 4.57,
    ratingOverrideManual: false,
    shelf: 1,
    position: 2,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-10'),
  },
  {
    id: 4,
    title: 'Pride and Prejudice',
    img: '/covers/pride.jpg',
    height: 180,
    read: 'read',
    dateStarted: '2024-03-15',
    dateFinished: '2024-03-25',
    author: 'Jane Austen',
    pages: 279,
    genre: 'Romance',
    description: 'A witty tale of love and social class in Regency England.',
    ratingWriting: 5,
    ratingPlot: 4,
    ratingCharacters: 5,
    ratingPacing: 4,
    ratingWorldBuilding: 4,
    ratingEnjoyment: 5,
    ratingRecommend: 5,
    ratingOverall: 4.57,
    ratingOverrideManual: false,
    shelf: 1,
    position: 3,
    createdAt: new Date('2024-03-15'),
    updatedAt: new Date('2024-03-25'),
  },
  {
    id: 5,
    title: 'The Girl with the Dragon Tattoo',
    img: '/covers/dragon-tattoo.jpg',
    height: 210,
    read: 'reading',
    dateStarted: '2024-04-01',
    dateFinished: null,
    author: 'Stieg Larsson',
    pages: 465,
    genre: 'Mystery',
    description: 'A journalist and hacker investigate a decades-old disappearance.',
    ratingWriting: null,
    ratingPlot: null,
    ratingCharacters: null,
    ratingPacing: null,
    ratingWorldBuilding: null,
    ratingEnjoyment: null,
    ratingRecommend: null,
    ratingOverall: null,
    ratingOverrideManual: false,
    shelf: 1,
    position: 4,
    createdAt: new Date('2024-04-01'),
    updatedAt: new Date('2024-04-10'),
  },
  {
    id: 6,
    title: '1984',
    img: '/covers/1984.jpg',
    height: 185,
    read: null,
    dateStarted: null,
    dateFinished: null,
    author: 'George Orwell',
    pages: 328,
    genre: 'Dystopian',
    description: 'A chilling vision of a totalitarian future.',
    ratingWriting: null,
    ratingPlot: null,
    ratingCharacters: null,
    ratingPacing: null,
    ratingWorldBuilding: null,
    ratingEnjoyment: null,
    ratingRecommend: null,
    ratingOverall: null,
    ratingOverrideManual: false,
    shelf: 2,
    position: 0,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 7,
    title: 'The Name of the Wind',
    img: '/covers/notw.jpg',
    height: 220,
    read: 'read',
    dateStarted: '2023-12-01',
    dateFinished: '2023-12-20',
    author: 'Patrick Rothfuss',
    pages: 662,
    genre: 'Fantasy',
    description: 'A legendary figure tells his own story.',
    ratingWriting: 5,
    ratingPlot: 4,
    ratingCharacters: 5,
    ratingPacing: 4,
    ratingWorldBuilding: 5,
    ratingEnjoyment: 5,
    ratingRecommend: 5,
    ratingOverall: 4.71,
    ratingOverrideManual: false,
    shelf: 1,
    position: 5,
    createdAt: new Date('2023-12-01'),
    updatedAt: new Date('2023-12-20'),
  },
  {
    id: 8,
    title: 'Project Hail Mary',
    img: '/covers/hailmary.jpg',
    height: 205,
    read: 'read',
    dateStarted: '2024-04-15',
    dateFinished: '2024-04-25',
    author: 'Andy Weir',
    pages: 496,
    genre: 'Science Fiction',
    description: 'A lone astronaut must save Earth from extinction.',
    ratingWriting: 4,
    ratingPlot: 5,
    ratingCharacters: 5,
    ratingPacing: 5,
    ratingWorldBuilding: 5,
    ratingEnjoyment: 5,
    ratingRecommend: 5,
    ratingOverall: 4.86,
    ratingOverrideManual: false,
    shelf: 1,
    position: 6,
    createdAt: new Date('2024-04-15'),
    updatedAt: new Date('2024-04-25'),
  },
];

/**
 * Non-fiction books
 */
export const NONFICTION_BOOKS: MockBook[] = [
  {
    id: 101,
    title: 'Atomic Habits',
    img: '/covers/atomic-habits.jpg',
    height: 190,
    read: 'read',
    dateStarted: '2024-01-05',
    dateFinished: '2024-01-20',
    author: 'James Clear',
    pages: 320,
    genre: 'Self-Help',
    description: 'A guide to building good habits and breaking bad ones.',
    ratingWriting: 4,
    ratingPlot: null,
    ratingCharacters: null,
    ratingPacing: 4,
    ratingWorldBuilding: null,
    ratingEnjoyment: 5,
    ratingRecommend: 5,
    ratingOverall: 4.5,
    ratingOverrideManual: true,
    shelf: 2,
    position: 1,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: 102,
    title: 'A Brief History of Time',
    img: '/covers/brief-history.jpg',
    height: 175,
    read: null,
    dateStarted: null,
    dateFinished: null,
    author: 'Stephen Hawking',
    pages: 212,
    genre: 'Science',
    description: 'Exploring the origins and fate of the universe.',
    ratingWriting: null,
    ratingPlot: null,
    ratingCharacters: null,
    ratingPacing: null,
    ratingWorldBuilding: null,
    ratingEnjoyment: null,
    ratingRecommend: null,
    ratingOverall: null,
    ratingOverrideManual: false,
    shelf: 2,
    position: 2,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
  {
    id: 103,
    title: 'Sapiens',
    img: '/covers/sapiens.jpg',
    height: 205,
    read: 'reading',
    dateStarted: '2024-05-01',
    dateFinished: null,
    author: 'Yuval Noah Harari',
    pages: 443,
    genre: 'History',
    description: 'A brief history of humankind.',
    ratingWriting: null,
    ratingPlot: null,
    ratingCharacters: null,
    ratingPacing: null,
    ratingWorldBuilding: null,
    ratingEnjoyment: null,
    ratingRecommend: null,
    ratingOverall: null,
    ratingOverrideManual: false,
    shelf: 2,
    position: 3,
    createdAt: new Date('2024-05-01'),
    updatedAt: new Date('2024-05-10'),
  },
];

/**
 * Short books (under 200 pages)
 */
export const SHORT_BOOKS: MockBook[] = [
  {
    id: 201,
    title: 'Animal Farm',
    img: '/covers/animal-farm.jpg',
    height: 160,
    read: 'read',
    dateStarted: '2024-02-10',
    dateFinished: '2024-02-11',
    author: 'George Orwell',
    pages: 112,
    genre: 'Political Satire',
    description: 'A satirical allegory about power and corruption.',
    ratingWriting: 5,
    ratingPlot: 5,
    ratingCharacters: 4,
    ratingPacing: 5,
    ratingWorldBuilding: 4,
    ratingEnjoyment: 5,
    ratingRecommend: 5,
    ratingOverall: 4.71,
    ratingOverrideManual: false,
    shelf: 3,
    position: 0,
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-11'),
  },
  {
    id: 202,
    title: 'The Old Man and the Sea',
    img: '/covers/old-man-sea.jpg',
    height: 155,
    read: 'read',
    dateStarted: '2024-02-15',
    dateFinished: '2024-02-16',
    author: 'Ernest Hemingway',
    pages: 127,
    genre: 'Literary Fiction',
    description: 'An aging fisherman battles a giant marlin.',
    ratingWriting: 5,
    ratingPlot: 4,
    ratingCharacters: 5,
    ratingPacing: 4,
    ratingWorldBuilding: 3,
    ratingEnjoyment: 4,
    ratingRecommend: 4,
    ratingOverall: 4.14,
    ratingOverrideManual: false,
    shelf: 3,
    position: 1,
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-02-16'),
  },
];

/**
 * Long books (over 500 pages)
 */
export const LONG_BOOKS: MockBook[] = [
  {
    id: 301,
    title: 'War and Peace',
    img: '/covers/war-peace.jpg',
    height: 250,
    read: null,
    dateStarted: null,
    dateFinished: null,
    author: 'Leo Tolstoy',
    pages: 1225,
    genre: 'Historical Fiction',
    description: 'An epic tale of Russian society during the Napoleonic Wars.',
    ratingWriting: null,
    ratingPlot: null,
    ratingCharacters: null,
    ratingPacing: null,
    ratingWorldBuilding: null,
    ratingEnjoyment: null,
    ratingRecommend: null,
    ratingOverall: null,
    ratingOverrideManual: false,
    shelf: 4,
    position: 0,
    createdAt: new Date('2023-06-01'),
    updatedAt: new Date('2023-06-01'),
  },
  {
    id: 302,
    title: 'It',
    img: '/covers/it.jpg',
    height: 240,
    read: 'read',
    dateStarted: '2023-10-01',
    dateFinished: '2023-10-31',
    author: 'Stephen King',
    pages: 1138,
    genre: 'Horror',
    description: 'A group of children face an ancient evil.',
    ratingWriting: 5,
    ratingPlot: 4,
    ratingCharacters: 5,
    ratingPacing: 3,
    ratingWorldBuilding: 5,
    ratingEnjoyment: 4,
    ratingRecommend: 4,
    ratingOverall: 4.29,
    ratingOverrideManual: false,
    shelf: 4,
    position: 1,
    createdAt: new Date('2023-10-01'),
    updatedAt: new Date('2023-10-31'),
  },
];

/**
 * All books combined
 */
export const ALL_BOOKS: MockBook[] = [
  ...FICTION_BOOKS,
  ...NONFICTION_BOOKS,
  ...SHORT_BOOKS,
  ...LONG_BOOKS,
];

// ============================================
// Reading Progress Fixtures
// ============================================

export const READING_PROGRESS_FIXTURES: MockReadingProgress[] = [
  // Currently reading - The Girl with the Dragon Tattoo
  {
    id: 1,
    bookId: 5,
    currentPage: 232,
    progressPercent: 49.89,
    status: 'reading',
    createdAt: new Date('2024-04-01'),
    updatedAt: new Date('2024-04-10'),
  },
  // Currently reading - Sapiens
  {
    id: 2,
    bookId: 103,
    currentPage: 150,
    progressPercent: 33.86,
    status: 'reading',
    createdAt: new Date('2024-05-01'),
    updatedAt: new Date('2024-05-10'),
  },
  // Completed - The Hobbit
  {
    id: 3,
    bookId: 1,
    currentPage: 310,
    progressPercent: 100,
    status: 'completed',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
  // Completed - Dune
  {
    id: 4,
    bookId: 2,
    currentPage: 688,
    progressPercent: 100,
    status: 'completed',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-20'),
  },
  // Not started - 1984
  {
    id: 5,
    bookId: 6,
    currentPage: 0,
    progressPercent: 0,
    status: 'not_started',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
];

// ============================================
// Reading Session Fixtures (for time-based queries)
// ============================================

export const READING_SESSION_FIXTURES: MockReadingSession[] = [
  // Sessions from January 2024
  {
    id: 1,
    bookId: 1,
    startTime: new Date('2024-01-02T18:00:00'),
    endTime: new Date('2024-01-02T19:30:00'),
    pagesRead: 50,
    durationMinutes: 90,
    createdAt: new Date('2024-01-02'),
  },
  {
    id: 2,
    bookId: 1,
    startTime: new Date('2024-01-05T20:00:00'),
    endTime: new Date('2024-01-05T21:00:00'),
    pagesRead: 40,
    durationMinutes: 60,
    createdAt: new Date('2024-01-05'),
  },
  // Sessions from February 2024
  {
    id: 3,
    bookId: 2,
    startTime: new Date('2024-02-10T19:00:00'),
    endTime: new Date('2024-02-10T21:00:00'),
    pagesRead: 80,
    durationMinutes: 120,
    createdAt: new Date('2024-02-10'),
  },
  // Sessions from March 2024
  {
    id: 4,
    bookId: 3,
    startTime: new Date('2024-03-05T17:00:00'),
    endTime: new Date('2024-03-05T18:30:00'),
    pagesRead: 60,
    durationMinutes: 90,
    createdAt: new Date('2024-03-05'),
  },
  // Recent sessions (May 2024)
  {
    id: 5,
    bookId: 5,
    startTime: new Date('2024-05-15T20:00:00'),
    endTime: new Date('2024-05-15T21:30:00'),
    pagesRead: 45,
    durationMinutes: 90,
    createdAt: new Date('2024-05-15'),
  },
  {
    id: 6,
    bookId: 103,
    startTime: new Date('2024-05-16T19:00:00'),
    endTime: new Date('2024-05-16T20:00:00'),
    pagesRead: 30,
    durationMinutes: 60,
    createdAt: new Date('2024-05-16'),
  },
];

// ============================================
// Reading Goal Fixtures
// ============================================

export const READING_GOAL_FIXTURES: MockReadingGoal[] = [
  // Monthly goal - on track
  {
    id: 1,
    type: 'books_per_month',
    target: 4,
    current: 3,
    startDate: new Date('2024-05-01'),
    endDate: new Date('2024-05-31'),
    createdAt: new Date('2024-05-01'),
    updatedAt: new Date('2024-05-20'),
  },
  // Yearly goal - behind
  {
    id: 2,
    type: 'books_per_year',
    target: 52,
    current: 18,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-05-20'),
  },
  // Pages per day goal - ahead
  {
    id: 3,
    type: 'pages_per_day',
    target: 30,
    current: 45,
    startDate: new Date('2024-05-20'),
    endDate: new Date('2024-05-20'),
    createdAt: new Date('2024-05-20'),
    updatedAt: new Date('2024-05-20'),
  },
];

// ============================================
// Helper Functions
// ============================================

/**
 * Get books by genre
 */
export function getBooksByGenre(genre: string): MockBook[] {
  return ALL_BOOKS.filter(
    (book) => book.genre?.toLowerCase() === genre.toLowerCase()
  );
}

/**
 * Get books by author
 */
export function getBooksByAuthor(author: string): MockBook[] {
  return ALL_BOOKS.filter((book) =>
    book.author?.toLowerCase().includes(author.toLowerCase())
  );
}

/**
 * Get books with rating above threshold
 */
export function getBooksAboveRating(minRating: number): MockBook[] {
  return ALL_BOOKS.filter(
    (book) => book.ratingOverall && book.ratingOverall >= minRating
  );
}

/**
 * Get unread books
 */
export function getUnreadBooks(): MockBook[] {
  return ALL_BOOKS.filter((book) => !book.read || book.read === null);
}

/**
 * Get books finished in a specific year
 */
export function getBooksFinishedInYear(year: number): MockBook[] {
  return ALL_BOOKS.filter((book) => {
    if (!book.dateFinished) return false;
    return new Date(book.dateFinished).getFullYear() === year;
  });
}

/**
 * Get books finished in a specific month
 */
export function getBooksFinishedInMonth(year: number, month: number): MockBook[] {
  return ALL_BOOKS.filter((book) => {
    if (!book.dateFinished) return false;
    const date = new Date(book.dateFinished);
    return date.getFullYear() === year && date.getMonth() === month - 1;
  });
}

/**
 * Get books under a specific page count
 */
export function getBooksUnderPages(maxPages: number): MockBook[] {
  return ALL_BOOKS.filter((book) => book.pages && book.pages < maxPages);
}

/**
 * Get books over a specific page count
 */
export function getBooksOverPages(minPages: number): MockBook[] {
  return ALL_BOOKS.filter((book) => book.pages && book.pages > minPages);
}

/**
 * Find book by title (case insensitive partial match)
 */
export function findBookByTitle(query: string): MockBook | undefined {
  return ALL_BOOKS.find((book) =>
    book.title.toLowerCase().includes(query.toLowerCase())
  );
}

/**
 * Find books similar to a given book (same genre or author)
 */
export function findSimilarBooks(bookId: number): MockBook[] {
  const book = ALL_BOOKS.find((b) => b.id === bookId);
  if (!book) return [];

  return ALL_BOOKS.filter(
    (b) =>
      b.id !== bookId &&
      ((b.genre && b.genre === book.genre) ||
        (b.author && b.author === book.author))
  );
}

/**
 * Get genre statistics
 */
export function getGenreStats(): Record<string, number> {
  const stats: Record<string, number> = {};
  ALL_BOOKS.forEach((book) => {
    if (book.genre) {
      stats[book.genre] = (stats[book.genre] || 0) + 1;
    }
  });
  return stats;
}

/**
 * Get reading statistics
 */
export function getReadingStats() {
  const completed = ALL_BOOKS.filter((b) => b.read === 'read').length;
  const reading = ALL_BOOKS.filter((b) => b.read === 'reading').length;
  const unstarted = ALL_BOOKS.filter((b) => !b.read).length;
  const totalPages = ALL_BOOKS.filter((b) => b.read === 'read').reduce(
    (sum, b) => sum + (b.pages || 0),
    0
  );

  return {
    completed,
    reading,
    unstarted,
    totalPages,
    totalBooks: ALL_BOOKS.length,
  };
}

// ============================================
// Test Message Data for Enhanced Intents
// ============================================

export const ENHANCED_TEST_MESSAGES = {
  // Book details queries
  bookDetails: [
    { input: 'Tell me about The Hobbit', expectedIntent: 'book_details', expectedBook: 'The Hobbit' },
    { input: 'How many pages is Dune?', expectedIntent: 'book_details', expectedBook: 'Dune' },
    { input: 'What is The Martian about?', expectedIntent: 'book_details', expectedBook: 'The Martian' },
    { input: 'Who wrote Pride and Prejudice?', expectedIntent: 'book_details', expectedBook: 'Pride and Prejudice' },
    { input: 'details on 1984', expectedIntent: 'book_details', expectedBook: '1984' },
  ],

  // Reading status queries
  readingStatus: [
    { input: 'What am I reading?', expectedIntent: 'reading_status' },
    { input: 'Unstarted books', expectedIntent: 'reading_status', filter: 'not_started' },
    { input: 'Books I haven\'t started', expectedIntent: 'reading_status', filter: 'not_started' },
    { input: 'My unread books', expectedIntent: 'reading_status', filter: 'not_started' },
    { input: 'Currently reading', expectedIntent: 'reading_status', filter: 'reading' },
    { input: 'Books in progress', expectedIntent: 'reading_status', filter: 'reading' },
    { input: 'Finished books', expectedIntent: 'reading_status', filter: 'completed' },
    { input: 'What have I completed?', expectedIntent: 'reading_status', filter: 'completed' },
  ],

  // Genre queries
  genreQueries: [
    { input: 'How many fantasy books?', expectedIntent: 'genre_query', genre: 'Fantasy' },
    { input: 'My favorite genre', expectedIntent: 'genre_query' },
    { input: 'List my sci-fi books', expectedIntent: 'genre_query', genre: 'Science Fiction' },
    { input: 'Show me mystery novels', expectedIntent: 'genre_query', genre: 'Mystery' },
    { input: 'What genres do I read?', expectedIntent: 'genre_query' },
    { input: 'Genre breakdown', expectedIntent: 'genre_query' },
  ],

  // Rating queries
  ratingQueries: [
    { input: '5-star books', expectedIntent: 'rating_query', minRating: 5 },
    { input: 'Highest rated', expectedIntent: 'rating_query' },
    { input: 'My best books', expectedIntent: 'rating_query' },
    { input: 'Books rated above 4', expectedIntent: 'rating_query', minRating: 4 },
    { input: 'What did I rate The Hobbit?', expectedIntent: 'rating_query', book: 'The Hobbit' },
    { input: 'Lowest rated books', expectedIntent: 'rating_query', sortOrder: 'asc' },
  ],

  // Goal queries
  goalQueries: [
    { input: 'Am I on track?', expectedIntent: 'goal_query' },
    { input: 'Books behind on goal', expectedIntent: 'goal_query' },
    { input: 'Reading goal progress', expectedIntent: 'goal_query' },
    { input: 'How many books left to reach my goal?', expectedIntent: 'goal_query' },
    { input: 'Monthly reading goal', expectedIntent: 'goal_query', period: 'month' },
    { input: 'Yearly goal status', expectedIntent: 'goal_query', period: 'year' },
  ],

  // Time-based queries
  timeQueries: [
    { input: 'Read last month', expectedIntent: 'time_query', period: 'last_month' },
    { input: 'Finished in 2023', expectedIntent: 'time_query', year: 2023 },
    { input: 'Books finished in January', expectedIntent: 'time_query', month: 'January' },
    { input: 'What did I read this year?', expectedIntent: 'time_query', period: 'this_year' },
    { input: 'Reading history', expectedIntent: 'time_query' },
    { input: 'Books read last week', expectedIntent: 'time_query', period: 'last_week' },
  ],

  // Complex filter queries
  complexFilters: [
    { input: 'Unread fantasy under 300 pages', expectedIntent: 'complex_filter', filters: ['unread', 'fantasy', 'under300'] },
    { input: 'Short sci-fi books I haven\'t read', expectedIntent: 'complex_filter', filters: ['unread', 'sci-fi', 'short'] },
    { input: 'Completed books over 500 pages', expectedIntent: 'complex_filter', filters: ['completed', 'over500'] },
    { input: 'Unfinished long books', expectedIntent: 'complex_filter', filters: ['reading', 'long'] },
    // Note: '5-star fantasy novels' may classify as rating_query in some implementations
  ],

  // Comparison queries
  comparisons: [
    { input: 'Which is longer, The Hobbit or Dune?', expectedIntent: 'comparison', books: ['The Hobbit', 'Dune'] },
    { input: 'Compare Dune and The Martian', expectedIntent: 'comparison', books: ['Dune', 'The Martian'] },
    { input: 'Which book is better rated?', expectedIntent: 'comparison' },
    { input: 'Longer: War and Peace or It?', expectedIntent: 'comparison', books: ['War and Peace', 'It'] },
  ],

  // Similar books queries
  similarBooks: [
    { input: 'Books like The Martian', expectedIntent: 'similar_books', book: 'The Martian' },
    { input: 'Similar to Dune', expectedIntent: 'similar_books', book: 'Dune' },
    { input: 'More books by Andy Weir', expectedIntent: 'similar_books', author: 'Andy Weir' },
    { input: 'Recommendations like The Hobbit', expectedIntent: 'similar_books', book: 'The Hobbit' },
  ],

  // Follow-up / context queries
  followUps: [
    { input: 'Tell me more', expectedIntent: 'followup', type: 'more_info' },
    { input: 'What about that book?', expectedIntent: 'followup', type: 'reference' },
    { input: 'How many pages does it have?', expectedIntent: 'followup', type: 'reference' },
    { input: 'Start it', expectedIntent: 'followup', type: 'action' },
    { input: 'Next', expectedIntent: 'followup', type: 'pagination' },
    { input: 'More results', expectedIntent: 'followup', type: 'pagination' },
    { input: 'Show me more', expectedIntent: 'followup', type: 'pagination' },
  ],
};

export default {
  ALL_BOOKS,
  FICTION_BOOKS,
  NONFICTION_BOOKS,
  SHORT_BOOKS,
  LONG_BOOKS,
  READING_PROGRESS_FIXTURES,
  READING_SESSION_FIXTURES,
  READING_GOAL_FIXTURES,
  ENHANCED_TEST_MESSAGES,
  getBooksByGenre,
  getBooksByAuthor,
  getBooksAboveRating,
  getUnreadBooks,
  getBooksFinishedInYear,
  getBooksFinishedInMonth,
  getBooksUnderPages,
  getBooksOverPages,
  findBookByTitle,
  findSimilarBooks,
  getGenreStats,
  getReadingStats,
};
