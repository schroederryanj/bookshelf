/**
 * Query Builder Tests
 * Tests for parsing SMS filters and generating Prisma queries
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ALL_BOOKS, FICTION_BOOKS } from '../mocks/books-fixture';

// ============================================
// Query Builder Types
// ============================================

interface ParsedFilters {
  genre?: string;
  author?: string;
  readStatus?: 'unread' | 'reading' | 'completed' | 'all';
  minPages?: number;
  maxPages?: number;
  minRating?: number;
  maxRating?: number;
  year?: number;
  month?: number;
  sortBy?: 'title' | 'author' | 'pages' | 'rating' | 'dateFinished' | 'dateStarted';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

interface PrismaWhereClause {
  genre?: string | { contains?: string; equals?: string };
  author?: string | { contains?: string };
  read?: string | null | { not?: null };
  pages?: { gte?: number; lte?: number; gt?: number; lt?: number };
  ratingOverall?: { gte?: number; lte?: number; not?: null } | null;
  dateFinished?: { gte?: string; lte?: string; not?: null } | null;
  AND?: PrismaWhereClause[];
  OR?: PrismaWhereClause[];
}

interface PrismaQuery {
  where?: PrismaWhereClause;
  orderBy?: Record<string, 'asc' | 'desc'>;
  take?: number;
  skip?: number;
}

// ============================================
// Filter Parser Implementation
// ============================================

/**
 * Parse natural language filters from SMS message
 */
function parseFilters(message: string): ParsedFilters {
  const filters: ParsedFilters = {};
  const lowerMessage = message.toLowerCase();

  // Genre extraction
  const genrePatterns: Record<string, string[]> = {
    'Fantasy': ['fantasy', 'fantasies'],
    'Science Fiction': ['sci-fi', 'scifi', 'science fiction', 'sf'],
    'Mystery': ['mystery', 'mysteries', 'detective'],
    'Romance': ['romance', 'romantic'],
    'Horror': ['horror', 'scary'],
    'Thriller': ['thriller', 'suspense'],
    'Historical Fiction': ['historical fiction', 'historical'],
    'Literary Fiction': ['literary', 'literature'],
    'Non-Fiction': ['non-fiction', 'nonfiction'],
    'Self-Help': ['self-help', 'selfhelp', 'self help'],
    'Biography': ['biography', 'biographies', 'memoir'],
    'History': ['history'],
    'Science': ['science'],
  };

  for (const [genre, patterns] of Object.entries(genrePatterns)) {
    if (patterns.some(p => lowerMessage.includes(p))) {
      filters.genre = genre;
      break;
    }
  }

  // Read status extraction
  if (/unread|haven't read|not read|unstarted/.test(lowerMessage)) {
    filters.readStatus = 'unread';
  } else if (/reading|in progress|currently|ongoing/.test(lowerMessage)) {
    filters.readStatus = 'reading';
  } else if (/finished|completed|done|read/.test(lowerMessage) &&
             !/unread|haven't read/.test(lowerMessage)) {
    filters.readStatus = 'completed';
  }

  // Page count extraction
  const underPagesMatch = lowerMessage.match(/under\s+(\d+)\s*(?:pages?)?/);
  if (underPagesMatch) {
    filters.maxPages = parseInt(underPagesMatch[1], 10);
  }

  const overPagesMatch = lowerMessage.match(/over\s+(\d+)\s*(?:pages?)?/);
  if (overPagesMatch) {
    filters.minPages = parseInt(overPagesMatch[1], 10);
  }

  const lessThanMatch = lowerMessage.match(/(?:less than|fewer than|<)\s*(\d+)\s*(?:pages?)?/);
  if (lessThanMatch) {
    filters.maxPages = parseInt(lessThanMatch[1], 10);
  }

  const moreThanMatch = lowerMessage.match(/(?:more than|greater than|>)\s*(\d+)\s*(?:pages?)?/);
  if (moreThanMatch) {
    filters.minPages = parseInt(moreThanMatch[1], 10);
  }

  // Short/Long keywords (including shortest/longest)
  if (/\bshort(?:est)?\b/.test(lowerMessage)) {
    filters.maxPages = filters.maxPages || 200;
  }
  if (/\blong(?:est)?\b/.test(lowerMessage)) {
    filters.minPages = filters.minPages || 500;
  }

  // Rating extraction
  const starMatch = lowerMessage.match(/(\d)[\s-]*star/);
  if (starMatch) {
    const rating = parseInt(starMatch[1], 10);
    if (/above|over|at least|minimum/.test(lowerMessage)) {
      filters.minRating = rating;
    } else if (/below|under|at most|maximum/.test(lowerMessage)) {
      filters.maxRating = rating;
    } else {
      // Exact rating or "X-star books" = minimum X
      filters.minRating = rating;
    }
  }

  const ratingMatch = lowerMessage.match(/rated?\s*(?:above|over|>=?)\s*(\d(?:\.\d)?)/);
  if (ratingMatch) {
    filters.minRating = parseFloat(ratingMatch[1]);
  }

  // Year extraction
  const yearMatch = lowerMessage.match(/(?:in|from|during)\s+(20\d{2})/);
  if (yearMatch) {
    filters.year = parseInt(yearMatch[1], 10);
  }

  // Month extraction
  const monthPatterns: Record<string, number> = {
    'january': 1, 'jan': 1,
    'february': 2, 'feb': 2,
    'march': 3, 'mar': 3,
    'april': 4, 'apr': 4,
    'may': 5,
    'june': 6, 'jun': 6,
    'july': 7, 'jul': 7,
    'august': 8, 'aug': 8,
    'september': 9, 'sep': 9, 'sept': 9,
    'october': 10, 'oct': 10,
    'november': 11, 'nov': 11,
    'december': 12, 'dec': 12,
  };

  for (const [monthName, monthNum] of Object.entries(monthPatterns)) {
    if (lowerMessage.includes(monthName)) {
      filters.month = monthNum;
      break;
    }
  }

  // Sort extraction
  if (/(?:sort|order)\s*(?:by)?\s*(?:title|name)/i.test(lowerMessage)) {
    filters.sortBy = 'title';
  } else if (/(?:sort|order)\s*(?:by)?\s*(?:author)/i.test(lowerMessage)) {
    filters.sortBy = 'author';
  } else if (/(?:sort|order)\s*(?:by)?\s*(?:pages?|length)/i.test(lowerMessage)) {
    filters.sortBy = 'pages';
  } else if (/(?:sort|order)\s*(?:by)?\s*(?:rating)/i.test(lowerMessage)) {
    filters.sortBy = 'rating';
  } else if (/shortest|longest/.test(lowerMessage)) {
    filters.sortBy = 'pages';
  } else if (/highest|best|top/.test(lowerMessage)) {
    filters.sortBy = 'rating';
    filters.sortOrder = 'desc';
  } else if (/lowest|worst/.test(lowerMessage)) {
    filters.sortBy = 'rating';
    filters.sortOrder = 'asc';
  }

  // Sort order
  if (/ascending|asc\b|a-z/.test(lowerMessage)) {
    filters.sortOrder = 'asc';
  } else if (/descending|desc\b|z-a/.test(lowerMessage)) {
    filters.sortOrder = 'desc';
  }

  // Special sort keywords
  if (/shortest/.test(lowerMessage)) {
    filters.sortOrder = 'asc';
  } else if (/longest/.test(lowerMessage)) {
    filters.sortOrder = 'desc';
  }

  // Limit extraction
  const limitMatch = lowerMessage.match(/(?:top|first|show)\s+(\d+)/);
  if (limitMatch) {
    filters.limit = parseInt(limitMatch[1], 10);
  }

  // Author extraction
  const authorMatch = message.match(/by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
  if (authorMatch && !genrePatterns['Fantasy'].some(g => authorMatch[1].toLowerCase().includes(g))) {
    filters.author = authorMatch[1];
  }

  return filters;
}

/**
 * Build Prisma query from parsed filters
 */
function buildPrismaQuery(filters: ParsedFilters): PrismaQuery {
  const query: PrismaQuery = {};
  const where: PrismaWhereClause = {};

  // Genre filter
  if (filters.genre) {
    where.genre = filters.genre;
  }

  // Author filter
  if (filters.author) {
    where.author = { contains: filters.author };
  }

  // Read status filter
  if (filters.readStatus) {
    switch (filters.readStatus) {
      case 'unread':
        where.read = null;
        break;
      case 'reading':
        where.read = 'reading';
        break;
      case 'completed':
        where.read = 'read';
        break;
    }
  }

  // Page count filters
  if (filters.minPages !== undefined || filters.maxPages !== undefined) {
    where.pages = {};
    if (filters.minPages !== undefined) {
      where.pages.gte = filters.minPages;
    }
    if (filters.maxPages !== undefined) {
      where.pages.lte = filters.maxPages;
    }
  }

  // Rating filters
  if (filters.minRating !== undefined || filters.maxRating !== undefined) {
    where.ratingOverall = { not: null };
    if (filters.minRating !== undefined) {
      where.ratingOverall = { ...(where.ratingOverall as object), gte: filters.minRating };
    }
    if (filters.maxRating !== undefined) {
      where.ratingOverall = { ...(where.ratingOverall as object), lte: filters.maxRating };
    }
  }

  // Date filters
  if (filters.year) {
    const startOfYear = `${filters.year}-01-01`;
    const endOfYear = `${filters.year}-12-31`;
    where.dateFinished = { gte: startOfYear, lte: endOfYear };
  }

  if (filters.month && !filters.year) {
    // Use current year if only month specified
    const currentYear = new Date().getFullYear();
    const monthStr = filters.month.toString().padStart(2, '0');
    const startOfMonth = `${currentYear}-${monthStr}-01`;
    const endOfMonth = `${currentYear}-${monthStr}-31`;
    where.dateFinished = { gte: startOfMonth, lte: endOfMonth };
  }

  if (Object.keys(where).length > 0) {
    query.where = where;
  }

  // Sorting
  if (filters.sortBy) {
    const sortField = filters.sortBy === 'rating' ? 'ratingOverall' : filters.sortBy;
    query.orderBy = { [sortField]: filters.sortOrder || 'desc' };
  }

  // Pagination
  if (filters.limit) {
    query.take = filters.limit;
  }

  if (filters.offset) {
    query.skip = filters.offset;
  }

  return query;
}

/**
 * Combine multiple filter conditions with AND
 */
function combineFilters(filters: PrismaWhereClause[]): PrismaWhereClause {
  if (filters.length === 0) return {};
  if (filters.length === 1) return filters[0];
  return { AND: filters };
}

/**
 * Combine multiple filter conditions with OR
 */
function combineFiltersOr(filters: PrismaWhereClause[]): PrismaWhereClause {
  if (filters.length === 0) return {};
  if (filters.length === 1) return filters[0];
  return { OR: filters };
}

// ============================================
// Tests
// ============================================

describe('Filter Parser', () => {
  describe('Genre Extraction', () => {
    it('should extract "fantasy" genre', () => {
      const filters = parseFilters('Show me fantasy books');
      expect(filters.genre).toBe('Fantasy');
    });

    it('should extract "sci-fi" as Science Fiction', () => {
      const filters = parseFilters('List my sci-fi collection');
      expect(filters.genre).toBe('Science Fiction');
    });

    it('should extract "mystery" genre', () => {
      const filters = parseFilters('Mystery novels');
      expect(filters.genre).toBe('Mystery');
    });

    it('should extract "romance" genre', () => {
      const filters = parseFilters('Romance books');
      expect(filters.genre).toBe('Romance');
    });

    it('should extract "horror" genre', () => {
      const filters = parseFilters('Scary horror stories');
      expect(filters.genre).toBe('Horror');
    });

    it('should extract "non-fiction" genre', () => {
      const filters = parseFilters('Non-fiction reads');
      expect(filters.genre).toBe('Non-Fiction');
    });

    it('should extract "self-help" genre', () => {
      const filters = parseFilters('Self-help guides');
      expect(filters.genre).toBe('Self-Help');
    });

    it('should extract "biography" genre', () => {
      const filters = parseFilters('Biographies I own');
      expect(filters.genre).toBe('Biography');
    });

    it('should handle case insensitivity', () => {
      const filters = parseFilters('FANTASY BOOKS');
      expect(filters.genre).toBe('Fantasy');
    });
  });

  describe('Read Status Extraction', () => {
    it('should extract "unread" status', () => {
      const filters = parseFilters('Unread books');
      expect(filters.readStatus).toBe('unread');
    });

    it('should extract "reading" status', () => {
      const filters = parseFilters('Books in progress');
      expect(filters.readStatus).toBe('reading');
    });

    it('should extract "completed" status', () => {
      const filters = parseFilters('Finished books');
      expect(filters.readStatus).toBe('completed');
    });

    it('should handle "haven\'t read" as unread', () => {
      const filters = parseFilters("Books I haven't read");
      expect(filters.readStatus).toBe('unread');
    });

    it('should handle "currently reading"', () => {
      const filters = parseFilters('Currently reading');
      expect(filters.readStatus).toBe('reading');
    });

    it('should not confuse "unread" with "read"', () => {
      const filters = parseFilters('Unread mystery novels');
      expect(filters.readStatus).toBe('unread');
    });
  });

  describe('Page Count Extraction', () => {
    it('should extract "under X pages"', () => {
      const filters = parseFilters('Books under 300 pages');
      expect(filters.maxPages).toBe(300);
    });

    it('should extract "over X pages"', () => {
      const filters = parseFilters('Books over 500 pages');
      expect(filters.minPages).toBe(500);
    });

    it('should extract "less than X pages"', () => {
      const filters = parseFilters('Less than 200 pages');
      expect(filters.maxPages).toBe(200);
    });

    it('should extract "more than X pages"', () => {
      const filters = parseFilters('More than 400 pages');
      expect(filters.minPages).toBe(400);
    });

    it('should handle "short" keyword', () => {
      const filters = parseFilters('Short books');
      expect(filters.maxPages).toBe(200);
    });

    it('should handle "long" keyword', () => {
      const filters = parseFilters('Long novels');
      expect(filters.minPages).toBe(500);
    });

    it('should extract page count without "pages" word', () => {
      const filters = parseFilters('Under 250');
      expect(filters.maxPages).toBe(250);
    });

    it('should handle "< X" notation', () => {
      const filters = parseFilters('< 150 pages');
      expect(filters.maxPages).toBe(150);
    });

    it('should handle "> X" notation', () => {
      const filters = parseFilters('> 600 pages');
      expect(filters.minPages).toBe(600);
    });
  });

  describe('Rating Extraction', () => {
    it('should extract "5-star" rating', () => {
      const filters = parseFilters('5-star books');
      expect(filters.minRating).toBe(5);
    });

    it('should extract "4 star" rating', () => {
      const filters = parseFilters('4 star reads');
      expect(filters.minRating).toBe(4);
    });

    it('should extract "above 3 stars"', () => {
      const filters = parseFilters('Books above 3 stars');
      expect(filters.minRating).toBe(3);
    });

    it('should extract "rated over X"', () => {
      const filters = parseFilters('Rated over 4.5');
      expect(filters.minRating).toBe(4.5);
    });

    it('should extract "below 3 stars"', () => {
      const filters = parseFilters('Books below 3 stars');
      expect(filters.maxRating).toBe(3);
    });
  });

  describe('Year Extraction', () => {
    it('should extract "in YYYY"', () => {
      const filters = parseFilters('Books read in 2024');
      expect(filters.year).toBe(2024);
    });

    it('should extract "from YYYY"', () => {
      const filters = parseFilters('Books from 2023');
      expect(filters.year).toBe(2023);
    });

    it('should not extract non-year numbers', () => {
      const filters = parseFilters('5-star books');
      expect(filters.year).toBeUndefined();
    });
  });

  describe('Month Extraction', () => {
    it('should extract full month name', () => {
      const filters = parseFilters('Books from January');
      expect(filters.month).toBe(1);
    });

    it('should extract abbreviated month', () => {
      const filters = parseFilters('Finished in Dec');
      expect(filters.month).toBe(12);
    });

    it('should handle case insensitivity', () => {
      const filters = parseFilters('MARCH reads');
      expect(filters.month).toBe(3);
    });

    it('should extract September variations', () => {
      const filters1 = parseFilters('September books');
      const filters2 = parseFilters('Sept reads');
      const filters3 = parseFilters('Sep novels');

      expect(filters1.month).toBe(9);
      expect(filters2.month).toBe(9);
      expect(filters3.month).toBe(9);
    });
  });

  describe('Sort Extraction', () => {
    it('should extract "sort by title"', () => {
      const filters = parseFilters('Sort by title');
      expect(filters.sortBy).toBe('title');
    });

    it('should extract "order by pages"', () => {
      const filters = parseFilters('Order by pages');
      expect(filters.sortBy).toBe('pages');
    });

    it('should extract "sort by rating"', () => {
      const filters = parseFilters('Sort by rating');
      expect(filters.sortBy).toBe('rating');
    });

    it('should extract "highest rated"', () => {
      const filters = parseFilters('Highest rated books');
      expect(filters.sortBy).toBe('rating');
      expect(filters.sortOrder).toBe('desc');
    });

    it('should extract "lowest rated"', () => {
      const filters = parseFilters('Lowest rated books');
      expect(filters.sortBy).toBe('rating');
      expect(filters.sortOrder).toBe('asc');
    });

    it('should extract "shortest"', () => {
      const filters = parseFilters('Shortest books');
      expect(filters.sortBy).toBe('pages');
      expect(filters.sortOrder).toBe('asc');
    });

    it('should extract "longest"', () => {
      const filters = parseFilters('Longest novels');
      expect(filters.sortBy).toBe('pages');
      expect(filters.sortOrder).toBe('desc');
    });

    it('should extract ascending order', () => {
      const filters = parseFilters('A-Z order');
      expect(filters.sortOrder).toBe('asc');
    });

    it('should extract descending order', () => {
      const filters = parseFilters('Z-A order');
      expect(filters.sortOrder).toBe('desc');
    });
  });

  describe('Limit Extraction', () => {
    it('should extract "top N"', () => {
      const filters = parseFilters('Top 10 books');
      expect(filters.limit).toBe(10);
    });

    it('should extract "first N"', () => {
      const filters = parseFilters('First 5 results');
      expect(filters.limit).toBe(5);
    });

    it('should extract "show N"', () => {
      const filters = parseFilters('Show 3 books');
      expect(filters.limit).toBe(3);
    });
  });

  describe('Author Extraction', () => {
    it('should extract "by Author Name"', () => {
      const filters = parseFilters('Books by Stephen King');
      expect(filters.author).toBe('Stephen King');
    });

    it('should extract single name author', () => {
      const filters = parseFilters('by Tolkien');
      expect(filters.author).toBe('Tolkien');
    });
  });

  describe('Combined Filters', () => {
    it('should extract multiple filters', () => {
      const filters = parseFilters('Unread fantasy under 300 pages');

      expect(filters.readStatus).toBe('unread');
      expect(filters.genre).toBe('Fantasy');
      expect(filters.maxPages).toBe(300);
    });

    it('should extract genre, rating, and sort', () => {
      const filters = parseFilters('Top 5 highest rated sci-fi');

      expect(filters.genre).toBe('Science Fiction');
      expect(filters.sortBy).toBe('rating');
      expect(filters.sortOrder).toBe('desc');
      expect(filters.limit).toBe(5);
    });

    it('should extract year, genre, and status', () => {
      const filters = parseFilters('Finished mystery novels in 2024');

      expect(filters.readStatus).toBe('completed');
      expect(filters.genre).toBe('Mystery');
      expect(filters.year).toBe(2024);
    });
  });
});

describe('Prisma Query Builder', () => {
  describe('Genre Queries', () => {
    it('should build genre filter', () => {
      const query = buildPrismaQuery({ genre: 'Fantasy' });

      expect(query.where?.genre).toBe('Fantasy');
    });
  });

  describe('Author Queries', () => {
    it('should build author contains filter', () => {
      const query = buildPrismaQuery({ author: 'Tolkien' });

      expect(query.where?.author).toEqual({ contains: 'Tolkien' });
    });
  });

  describe('Read Status Queries', () => {
    it('should build unread filter', () => {
      const query = buildPrismaQuery({ readStatus: 'unread' });

      expect(query.where?.read).toBeNull();
    });

    it('should build reading filter', () => {
      const query = buildPrismaQuery({ readStatus: 'reading' });

      expect(query.where?.read).toBe('reading');
    });

    it('should build completed filter', () => {
      const query = buildPrismaQuery({ readStatus: 'completed' });

      expect(query.where?.read).toBe('read');
    });
  });

  describe('Page Count Queries', () => {
    it('should build minPages filter', () => {
      const query = buildPrismaQuery({ minPages: 300 });

      expect(query.where?.pages).toEqual({ gte: 300 });
    });

    it('should build maxPages filter', () => {
      const query = buildPrismaQuery({ maxPages: 200 });

      expect(query.where?.pages).toEqual({ lte: 200 });
    });

    it('should combine min and max pages', () => {
      const query = buildPrismaQuery({ minPages: 100, maxPages: 300 });

      expect(query.where?.pages).toEqual({ gte: 100, lte: 300 });
    });
  });

  describe('Rating Queries', () => {
    it('should build minRating filter', () => {
      const query = buildPrismaQuery({ minRating: 4 });

      expect(query.where?.ratingOverall).toEqual({ not: null, gte: 4 });
    });

    it('should build maxRating filter', () => {
      const query = buildPrismaQuery({ maxRating: 3 });

      expect(query.where?.ratingOverall).toEqual({ not: null, lte: 3 });
    });

    it('should combine min and max rating', () => {
      const query = buildPrismaQuery({ minRating: 3, maxRating: 4 });

      expect(query.where?.ratingOverall).toEqual({ not: null, gte: 3, lte: 4 });
    });
  });

  describe('Date Queries', () => {
    it('should build year filter', () => {
      const query = buildPrismaQuery({ year: 2024 });

      expect(query.where?.dateFinished).toEqual({
        gte: '2024-01-01',
        lte: '2024-12-31',
      });
    });

    it('should build month filter with current year', () => {
      const currentYear = new Date().getFullYear();
      const query = buildPrismaQuery({ month: 6 });

      expect(query.where?.dateFinished).toEqual({
        gte: `${currentYear}-06-01`,
        lte: `${currentYear}-06-31`,
      });
    });
  });

  describe('Sort Queries', () => {
    it('should build sort by title', () => {
      const query = buildPrismaQuery({ sortBy: 'title', sortOrder: 'asc' });

      expect(query.orderBy).toEqual({ title: 'asc' });
    });

    it('should build sort by rating descending', () => {
      const query = buildPrismaQuery({ sortBy: 'rating', sortOrder: 'desc' });

      expect(query.orderBy).toEqual({ ratingOverall: 'desc' });
    });

    it('should default to descending order', () => {
      const query = buildPrismaQuery({ sortBy: 'pages' });

      expect(query.orderBy).toEqual({ pages: 'desc' });
    });
  });

  describe('Pagination Queries', () => {
    it('should build limit', () => {
      const query = buildPrismaQuery({ limit: 10 });

      expect(query.take).toBe(10);
    });

    it('should build offset', () => {
      const query = buildPrismaQuery({ offset: 5 });

      expect(query.skip).toBe(5);
    });

    it('should combine limit and offset', () => {
      const query = buildPrismaQuery({ limit: 10, offset: 20 });

      expect(query.take).toBe(10);
      expect(query.skip).toBe(20);
    });
  });

  describe('Combined Queries', () => {
    it('should build complex query with multiple filters', () => {
      const query = buildPrismaQuery({
        genre: 'Fantasy',
        readStatus: 'unread',
        maxPages: 300,
        sortBy: 'pages',
        sortOrder: 'asc',
        limit: 5,
      });

      expect(query.where?.genre).toBe('Fantasy');
      expect(query.where?.read).toBeNull();
      expect(query.where?.pages).toEqual({ lte: 300 });
      expect(query.orderBy).toEqual({ pages: 'asc' });
      expect(query.take).toBe(5);
    });

    it('should handle empty filters', () => {
      const query = buildPrismaQuery({});

      expect(query.where).toBeUndefined();
      expect(query.orderBy).toBeUndefined();
      expect(query.take).toBeUndefined();
    });
  });
});

describe('Filter Combination', () => {
  describe('AND Combination', () => {
    it('should combine two filters with AND', () => {
      const filter1: PrismaWhereClause = { genre: 'Fantasy' };
      const filter2: PrismaWhereClause = { read: null };

      const combined = combineFilters([filter1, filter2]);

      expect(combined.AND).toHaveLength(2);
      expect(combined.AND?.[0]).toEqual(filter1);
      expect(combined.AND?.[1]).toEqual(filter2);
    });

    it('should return single filter if only one provided', () => {
      const filter: PrismaWhereClause = { genre: 'Fantasy' };

      const combined = combineFilters([filter]);

      expect(combined).toEqual(filter);
      expect(combined.AND).toBeUndefined();
    });

    it('should return empty object for no filters', () => {
      const combined = combineFilters([]);

      expect(combined).toEqual({});
    });
  });

  describe('OR Combination', () => {
    it('should combine two filters with OR', () => {
      const filter1: PrismaWhereClause = { genre: 'Fantasy' };
      const filter2: PrismaWhereClause = { genre: 'Science Fiction' };

      const combined = combineFiltersOr([filter1, filter2]);

      expect(combined.OR).toHaveLength(2);
    });

    it('should return single filter if only one provided', () => {
      const filter: PrismaWhereClause = { genre: 'Fantasy' };

      const combined = combineFiltersOr([filter]);

      expect(combined).toEqual(filter);
    });
  });
});

describe('End-to-End Query Building', () => {
  it('should parse and build query for "unread fantasy under 300 pages"', () => {
    const filters = parseFilters('Unread fantasy under 300 pages');
    const query = buildPrismaQuery(filters);

    expect(query.where?.genre).toBe('Fantasy');
    expect(query.where?.read).toBeNull();
    expect(query.where?.pages).toEqual({ lte: 300 });
  });

  it('should parse and build query for "top 5 highest rated sci-fi"', () => {
    const filters = parseFilters('Top 5 highest rated sci-fi');
    const query = buildPrismaQuery(filters);

    expect(query.where?.genre).toBe('Science Fiction');
    expect(query.orderBy).toEqual({ ratingOverall: 'desc' });
    expect(query.take).toBe(5);
  });

  it('should parse and build query for "short mystery novels"', () => {
    const filters = parseFilters('Short mystery novels');
    const query = buildPrismaQuery(filters);

    expect(query.where?.genre).toBe('Mystery');
    expect(query.where?.pages).toEqual({ lte: 200 });
  });

  it('should parse and build query for "5-star books from 2024"', () => {
    const filters = parseFilters('5-star books from 2024');
    const query = buildPrismaQuery(filters);

    expect(query.where?.ratingOverall).toEqual({ not: null, gte: 5 });
    expect(query.where?.dateFinished).toEqual({
      gte: '2024-01-01',
      lte: '2024-12-31',
    });
  });

  it('should parse and build query for "longest fantasy novels"', () => {
    const filters = parseFilters('Longest fantasy novels');
    const query = buildPrismaQuery(filters);

    expect(query.where?.genre).toBe('Fantasy');
    expect(query.where?.pages).toEqual({ gte: 500 });
    expect(query.orderBy).toEqual({ pages: 'desc' });
  });
});

describe('Edge Cases', () => {
  it('should handle empty message', () => {
    const filters = parseFilters('');
    expect(filters).toEqual({});
  });

  it('should handle message with no filters', () => {
    const filters = parseFilters('Hello there');
    expect(filters).toEqual({});
  });

  it('should handle very long messages', () => {
    const longMessage = 'Fantasy ' + 'a'.repeat(1000);
    const filters = parseFilters(longMessage);
    expect(filters.genre).toBe('Fantasy');
  });

  it('should handle special characters', () => {
    const filters = parseFilters('Sci-fi books!!?');
    expect(filters.genre).toBe('Science Fiction');
  });

  it('should handle multiple spaces', () => {
    const filters = parseFilters('Under    300   pages');
    expect(filters.maxPages).toBe(300);
  });

  it('should handle mixed case', () => {
    const filters = parseFilters('FANTASY UNDER 300 PAGES');
    expect(filters.genre).toBe('Fantasy');
    expect(filters.maxPages).toBe(300);
  });
});
