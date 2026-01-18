/**
 * Query Builder Utility
 *
 * Helpers for building Prisma where clauses from parsed filters.
 * Supports genre matching, rating comparisons, page count filters, date ranges.
 */

import { Prisma } from "@prisma/client";

/**
 * Filter options for building book queries
 */
export interface BookFilterOptions {
  /** Filter by reading status (unread, reading, read/finished) */
  status?: "unread" | "reading" | "read" | "finished" | "dnf";
  /** Filter by genre (partial match, comma-separated genres) */
  genre?: string;
  /** Minimum rating (inclusive) */
  minRating?: number;
  /** Maximum rating (inclusive) */
  maxRating?: number;
  /** Maximum page count */
  maxPages?: number;
  /** Minimum page count */
  minPages?: number;
  /** Filter by author (partial match) */
  author?: string;
  /** Exclude these book IDs */
  excludeIds?: number[];
  /** Date finished after (ISO string or Date) */
  finishedAfter?: string | Date;
  /** Date finished before (ISO string or Date) */
  finishedBefore?: string | Date;
  /** Year finished */
  yearFinished?: number;
}

/**
 * Sort options for book queries
 */
export interface BookSortOptions {
  field: "rating" | "pages" | "title" | "author" | "dateFinished" | "createdAt";
  direction: "asc" | "desc";
}

/**
 * Build Prisma where clause from filter options
 */
export function buildBookWhereClause(
  filters: BookFilterOptions
): Prisma.BookWhereInput {
  const conditions: Prisma.BookWhereInput[] = [];

  // Status filter
  if (filters.status) {
    conditions.push(buildStatusCondition(filters.status));
  }

  // Genre filter (handles comma-separated genres)
  if (filters.genre) {
    conditions.push(buildGenreCondition(filters.genre));
  }

  // Author filter
  if (filters.author) {
    conditions.push({
      author: { contains: filters.author },
    });
  }

  // Rating filters
  if (filters.minRating !== undefined || filters.maxRating !== undefined) {
    conditions.push(buildRatingCondition(filters.minRating, filters.maxRating));
  }

  // Page count filters
  if (filters.minPages !== undefined || filters.maxPages !== undefined) {
    const pageCondition: Prisma.BookWhereInput = {};
    if (filters.maxPages !== undefined) {
      pageCondition.pages = { ...pageCondition.pages as object, lte: filters.maxPages };
    }
    if (filters.minPages !== undefined) {
      pageCondition.pages = { ...pageCondition.pages as object, gte: filters.minPages };
    }
    conditions.push(pageCondition);
  }

  // Exclude IDs
  if (filters.excludeIds && filters.excludeIds.length > 0) {
    conditions.push({
      id: { notIn: filters.excludeIds },
    });
  }

  // Date finished filters
  if (filters.finishedAfter || filters.finishedBefore || filters.yearFinished) {
    conditions.push(buildDateFinishedCondition(
      filters.finishedAfter,
      filters.finishedBefore,
      filters.yearFinished
    ));
  }

  if (conditions.length === 0) {
    return {};
  }

  return { AND: conditions };
}

/**
 * Build status condition for unread/reading/read
 */
export function buildStatusCondition(
  status: "unread" | "reading" | "read" | "finished" | "dnf"
): Prisma.BookWhereInput {
  switch (status) {
    case "unread":
      return {
        OR: [
          { read: null },
          { read: "" },
          { read: "Unread" },
        ],
      };
    case "reading":
      return { read: "Reading" };
    case "read":
    case "finished":
      return {
        OR: [
          { read: "Read" },
          { read: "Finished" },
        ],
      };
    case "dnf":
      return { read: "DNF" };
    default:
      return {};
  }
}

/**
 * Build genre condition (handles partial matches on comma-separated genres)
 */
export function buildGenreCondition(genre: string): Prisma.BookWhereInput {
  // Handle multiple genres (OR condition)
  const genres = genre.split(",").map(g => g.trim()).filter(Boolean);

  if (genres.length === 1) {
    return { genre: { contains: genres[0] } };
  }

  return {
    OR: genres.map(g => ({ genre: { contains: g } })),
  };
}

/**
 * Build rating condition (supports both ratingOverall and legacy rating)
 */
export function buildRatingCondition(
  minRating?: number,
  maxRating?: number
): Prisma.BookWhereInput {
  const overallCondition: Prisma.FloatNullableFilter = {};
  const legacyCondition: Prisma.IntNullableFilter = {};

  if (minRating !== undefined) {
    overallCondition.gte = minRating;
    legacyCondition.gte = Math.floor(minRating);
  }
  if (maxRating !== undefined) {
    overallCondition.lte = maxRating;
    legacyCondition.lte = Math.ceil(maxRating);
  }

  // Check either new or legacy rating
  return {
    OR: [
      { ratingOverall: overallCondition },
      { rating: legacyCondition },
    ],
  };
}

/**
 * Build date finished condition
 */
export function buildDateFinishedCondition(
  after?: string | Date,
  before?: string | Date,
  year?: number
): Prisma.BookWhereInput {
  if (year) {
    // Match year prefix in dateFinished string
    return {
      dateFinished: { startsWith: year.toString() },
    };
  }

  // For date ranges, we use string comparisons since dateFinished is VARCHAR
  const conditions: Prisma.BookWhereInput[] = [];

  if (after) {
    const afterStr = typeof after === "string" ? after : after.toISOString().split("T")[0];
    conditions.push({ dateFinished: { gte: afterStr } });
  }

  if (before) {
    const beforeStr = typeof before === "string" ? before : before.toISOString().split("T")[0];
    conditions.push({ dateFinished: { lte: beforeStr } });
  }

  if (conditions.length === 0) {
    return {};
  }

  return { AND: conditions };
}

/**
 * Build orderBy clause from sort options
 */
export function buildOrderBy(
  sort?: BookSortOptions
): Prisma.BookOrderByWithRelationInput[] {
  if (!sort) {
    // Default sort: by rating desc, then title asc
    return [{ ratingOverall: "desc" }, { title: "asc" }];
  }

  const orderBy: Prisma.BookOrderByWithRelationInput = {};

  switch (sort.field) {
    case "rating":
      orderBy.ratingOverall = sort.direction;
      break;
    case "pages":
      orderBy.pages = sort.direction;
      break;
    case "title":
      orderBy.title = sort.direction;
      break;
    case "author":
      orderBy.author = sort.direction;
      break;
    case "dateFinished":
      orderBy.dateFinished = sort.direction;
      break;
    case "createdAt":
      orderBy.createdAt = sort.direction;
      break;
  }

  return [orderBy];
}

/**
 * Parse a filter string into BookFilterOptions
 * Handles natural language like "unread fantasy under 300 pages"
 */
export function parseFilterString(input: string): BookFilterOptions {
  const filters: BookFilterOptions = {};
  const lowerInput = input.toLowerCase();

  // Status detection
  if (lowerInput.includes("unread") || lowerInput.includes("haven't read") || lowerInput.includes("not read")) {
    filters.status = "unread";
  } else if (lowerInput.includes("reading") || lowerInput.includes("currently reading")) {
    filters.status = "reading";
  } else if (lowerInput.includes("finished") || lowerInput.includes("completed") || lowerInput.includes("read ")) {
    filters.status = "read";
  } else if (lowerInput.includes("dnf") || lowerInput.includes("did not finish")) {
    filters.status = "dnf";
  }

  // Page count - under X pages
  const underPagesMatch = lowerInput.match(/under\s+(\d+)\s*pages?/i);
  if (underPagesMatch) {
    filters.maxPages = parseInt(underPagesMatch[1], 10);
  }

  // Page count - over X pages
  const overPagesMatch = lowerInput.match(/over\s+(\d+)\s*pages?/i);
  if (overPagesMatch) {
    filters.minPages = parseInt(overPagesMatch[1], 10);
  }

  // Page count - less than X pages
  const lessThanMatch = lowerInput.match(/less\s+than\s+(\d+)\s*pages?/i);
  if (lessThanMatch) {
    filters.maxPages = parseInt(lessThanMatch[1], 10);
  }

  // Page count - more than X pages
  const moreThanMatch = lowerInput.match(/more\s+than\s+(\d+)\s*pages?/i);
  if (moreThanMatch) {
    filters.minPages = parseInt(moreThanMatch[1], 10);
  }

  // Rating - X+ stars
  const ratingPlusMatch = lowerInput.match(/(\d+)\+?\s*stars?/i);
  if (ratingPlusMatch) {
    filters.minRating = parseInt(ratingPlusMatch[1], 10);
  }

  // Rating - 5-star only
  const fiveStarMatch = lowerInput.match(/5[-\s]?star(?:\s+only)?/i);
  if (fiveStarMatch) {
    filters.minRating = 5;
    filters.maxRating = 5;
  }

  // Rating - highly rated
  if (lowerInput.includes("highly rated") || lowerInput.includes("top rated")) {
    filters.minRating = 4;
  }

  // Genre detection (common genres)
  const genres = [
    "fantasy", "sci-fi", "science fiction", "mystery", "thriller", "romance",
    "horror", "literary fiction", "historical fiction", "non-fiction", "nonfiction",
    "biography", "memoir", "self-help", "young adult", "ya", "dystopian",
    "adventure", "comedy", "humor", "drama", "classic", "contemporary",
  ];

  for (const genre of genres) {
    if (lowerInput.includes(genre)) {
      // Map some aliases
      let mappedGenre = genre;
      if (genre === "sci-fi") mappedGenre = "science fiction";
      if (genre === "ya") mappedGenre = "young adult";
      if (genre === "nonfiction") mappedGenre = "non-fiction";

      filters.genre = mappedGenre;
      break;
    }
  }

  // Short book
  if (lowerInput.includes("short") && !filters.maxPages) {
    filters.maxPages = 250;
  }

  // Long book
  if (lowerInput.includes("long") && !filters.minPages) {
    filters.minPages = 400;
  }

  // Year finished
  const yearMatch = lowerInput.match(/(?:read\s+in|from|finished\s+in)\s+(\d{4})/i);
  if (yearMatch) {
    filters.yearFinished = parseInt(yearMatch[1], 10);
  }

  return filters;
}

/**
 * Fuzzy match for book titles
 * Returns a score (higher is better match)
 */
export function fuzzyMatchTitle(title: string, query: string): number {
  const normalizedTitle = title.toLowerCase().replace(/[^\w\s]/g, "");
  const normalizedQuery = query.toLowerCase().replace(/[^\w\s]/g, "");

  // Exact match
  if (normalizedTitle === normalizedQuery) return 100;

  // Contains full query
  if (normalizedTitle.includes(normalizedQuery)) return 80;

  // Word match
  const queryWords = normalizedQuery.split(/\s+/);
  const titleWords = normalizedTitle.split(/\s+/);

  let matchedWords = 0;
  for (const qw of queryWords) {
    if (titleWords.some(tw => tw.includes(qw) || qw.includes(tw))) {
      matchedWords++;
    }
  }

  if (matchedWords === queryWords.length) return 70;
  if (matchedWords > 0) return 40 + (matchedWords / queryWords.length) * 30;

  // First letters match (e.g., "lotr" for "Lord of the Rings")
  const initials = titleWords.map(w => w[0]).join("");
  if (initials.includes(normalizedQuery) || normalizedQuery.includes(initials)) {
    return 50;
  }

  return 0;
}

/**
 * Find best matching books for a query
 */
export async function findBooksByFuzzyTitle(
  prisma: { book: { findMany: (args: Prisma.BookFindManyArgs) => Promise<Prisma.BookGetPayload<{}>[]> } },
  query: string,
  limit: number = 5
): Promise<Array<Prisma.BookGetPayload<{}> & { matchScore: number }>> {
  // First try exact/partial match via Prisma
  const candidates = await prisma.book.findMany({
    where: {
      OR: [
        { title: { contains: query } },
        // Also search by words in the query
        ...query.split(/\s+/).filter(w => w.length > 2).map(word => ({
          title: { contains: word },
        })),
      ],
    },
    take: 50, // Get more candidates for scoring
  });

  // Score and rank
  const scored = candidates.map(book => ({
    ...book,
    matchScore: fuzzyMatchTitle(book.title, query),
  }));

  scored.sort((a, b) => b.matchScore - a.matchScore);

  // Filter out zero scores and limit results
  return scored.filter(b => b.matchScore > 0).slice(0, limit);
}
