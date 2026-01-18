import { vi } from 'vitest';

// Type definitions for mock data
export interface MockBook {
  id: number;
  title: string;
  img: string;
  height: number;
  read: string | null;
  dateStarted: string | null;
  dateFinished: string | null;
  author: string | null;
  pages: number | null;
  genre: string | null;
  description: string | null;
  ratingWriting: number | null;
  ratingPlot: number | null;
  ratingCharacters: number | null;
  ratingPacing: number | null;
  ratingWorldBuilding: number | null;
  ratingEnjoyment: number | null;
  ratingRecommend: number | null;
  ratingOverall: number | null;
  ratingOverrideManual: boolean;
  shelf: number;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockReadingProgress {
  id: number;
  bookId: number;
  currentPage: number;
  progressPercent: number;
  status: 'not_started' | 'reading' | 'completed' | 'on_hold';
  createdAt: Date;
  updatedAt: Date;
}

export interface MockReadingSession {
  id: number;
  bookId: number;
  startTime: Date;
  endTime: Date | null;
  pagesRead: number;
  durationMinutes: number;
  createdAt: Date;
}

export interface MockReadingGoal {
  id: number;
  type: 'books_per_month' | 'books_per_year' | 'pages_per_day';
  target: number;
  current: number;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockReadingStreak {
  id: number;
  currentStreak: number;
  longestStreak: number;
  lastReadDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Factory functions for creating mock data
export function createMockBook(overrides: Partial<MockBook> = {}): MockBook {
  return {
    id: 1,
    title: 'Test Book',
    img: '/test-cover.jpg',
    height: 200,
    read: null,
    dateStarted: null,
    dateFinished: null,
    author: 'Test Author',
    pages: 300,
    genre: 'Fiction',
    description: 'A test book description',
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
    position: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

export function createMockReadingProgress(
  overrides: Partial<MockReadingProgress> = {}
): MockReadingProgress {
  return {
    id: 1,
    bookId: 1,
    currentPage: 0,
    progressPercent: 0,
    status: 'not_started',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

export function createMockReadingSession(
  overrides: Partial<MockReadingSession> = {}
): MockReadingSession {
  return {
    id: 1,
    bookId: 1,
    startTime: new Date('2024-01-01T10:00:00'),
    endTime: null,
    pagesRead: 0,
    durationMinutes: 0,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

export function createMockReadingGoal(
  overrides: Partial<MockReadingGoal> = {}
): MockReadingGoal {
  return {
    id: 1,
    type: 'books_per_month',
    target: 4,
    current: 0,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

export function createMockReadingStreak(
  overrides: Partial<MockReadingStreak> = {}
): MockReadingStreak {
  return {
    id: 1,
    currentStreak: 0,
    longestStreak: 0,
    lastReadDate: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

// Mock Prisma client
export const mockPrismaClient = {
  book: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    aggregate: vi.fn(),
    count: vi.fn(),
  },
  readingProgress: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
  readingSession: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    aggregate: vi.fn(),
  },
  readingGoal: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  readingStreak: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
  setting: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  $transaction: vi.fn((callback) => callback(mockPrismaClient)),
  $connect: vi.fn(),
  $disconnect: vi.fn(),
};

// Reset all mocks
export function resetPrismaMocks() {
  Object.values(mockPrismaClient).forEach((model) => {
    if (typeof model === 'object' && model !== null) {
      Object.values(model).forEach((method) => {
        if (typeof method === 'function' && 'mockReset' in method) {
          (method as ReturnType<typeof vi.fn>).mockReset();
        }
      });
    }
  });
}

export default mockPrismaClient;
