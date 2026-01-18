/**
 * Compare Books Handler
 *
 * Compare two books by various attributes:
 * - Page count (which is longer)
 * - Rating (which is better rated)
 * - Genre comparison
 *
 * Examples:
 * - "Which is longer, Dune or LOTR?"
 * - "Compare Dune and Foundation"
 * - "Is Mistborn better rated than Stormlight?"
 */

import { prisma } from "@/lib/prisma";
import {
  CommandHandler,
  errorResult,
  successResult,
  truncate,
} from "./types";
import { fuzzyMatchTitle } from "../utils/query-builder";

interface BookComparison {
  id: number;
  title: string;
  author: string | null;
  pages: number | null;
  ratingOverall: number | null;
  rating: number | null;
  genre: string | null;
  read: string | null;
}

/**
 * Main compare handler
 */
export const compareHandler: CommandHandler = async (intent, context) => {
  try {
    const book1Query = intent.params.book1 as string | undefined;
    const book2Query = intent.params.book2 as string | undefined;
    const comparisonType = intent.params.type as string | undefined;

    if (!book1Query || !book2Query) {
      return errorResult(
        "Please specify two books to compare. Example: compare Dune and Foundation"
      );
    }

    console.log(`[compare-handler] Comparing "${book1Query}" and "${book2Query}"`);

    // Find both books
    const [book1, book2] = await Promise.all([
      findBestMatchingBook(book1Query),
      findBestMatchingBook(book2Query),
    ]);

    if (!book1) {
      return successResult(`Could not find a book matching "${truncate(book1Query, 25)}".`);
    }

    if (!book2) {
      return successResult(`Could not find a book matching "${truncate(book2Query, 25)}".`);
    }

    // If same book was matched twice
    if (book1.id === book2.id) {
      return successResult(
        `Both queries matched the same book: "${truncate(book1.title, 40)}". Try more specific titles.`
      );
    }

    // Determine comparison type
    const type = determineComparisonType(comparisonType, context.rawMessage || "");

    switch (type) {
      case "pages":
        return compareByPages(book1, book2);
      case "rating":
        return compareByRating(book1, book2);
      case "genre":
        return compareByGenre(book1, book2);
      default:
        return compareAll(book1, book2);
    }
  } catch (error) {
    console.error("[compare-handler] Error:", error);
    return errorResult("Sorry, comparison failed. Please try again.", error);
  }
};

/**
 * Find the best matching book for a query
 */
async function findBestMatchingBook(query: string): Promise<BookComparison | null> {
  // Get candidates using partial matching
  const candidates = await prisma.book.findMany({
    where: {
      OR: [
        { title: { contains: query } },
        // Also search individual words for longer queries
        ...query.split(/\s+/)
          .filter(w => w.length > 2)
          .slice(0, 3)
          .map(word => ({ title: { contains: word } })),
      ],
    },
    select: {
      id: true,
      title: true,
      author: true,
      pages: true,
      ratingOverall: true,
      rating: true,
      genre: true,
      read: true,
    },
    take: 20,
  });

  if (candidates.length === 0) {
    return null;
  }

  // Score and find best match
  let bestMatch: BookComparison | null = null;
  let bestScore = 0;

  for (const book of candidates) {
    const score = fuzzyMatchTitle(book.title, query);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = book;
    }
  }

  return bestMatch;
}

/**
 * Determine comparison type from params or message
 */
function determineComparisonType(
  explicit?: string,
  rawMessage?: string
): "pages" | "rating" | "genre" | "all" {
  if (explicit) {
    if (explicit.includes("page") || explicit.includes("long")) return "pages";
    if (explicit.includes("rat") || explicit.includes("better") || explicit.includes("score")) return "rating";
    if (explicit.includes("genre")) return "genre";
  }

  const lower = (rawMessage || "").toLowerCase();

  if (lower.includes("longer") || lower.includes("shorter") || lower.includes("pages") || lower.includes("length")) {
    return "pages";
  }

  if (lower.includes("better") || lower.includes("rating") || lower.includes("rated") || lower.includes("score")) {
    return "rating";
  }

  if (lower.includes("genre") || lower.includes("similar") || lower.includes("same type")) {
    return "genre";
  }

  return "all";
}

/**
 * Compare books by page count
 */
function compareByPages(book1: BookComparison, book2: BookComparison) {
  const name1 = truncate(book1.title, 30);
  const name2 = truncate(book2.title, 30);

  if (!book1.pages && !book2.pages) {
    return successResult(`Neither book has page count info. ${name1} vs ${name2}`);
  }

  if (!book1.pages) {
    return successResult(`${name2}: ${book2.pages} pages. ${name1}: unknown pages.`);
  }

  if (!book2.pages) {
    return successResult(`${name1}: ${book1.pages} pages. ${name2}: unknown pages.`);
  }

  const diff = Math.abs(book1.pages - book2.pages);
  const longer = book1.pages > book2.pages ? book1 : book2;
  const shorter = book1.pages > book2.pages ? book2 : book1;

  return successResult(
    `${truncate(longer.title, 30)} is longer (${longer.pages} pages) vs ${truncate(shorter.title, 25)} (${shorter.pages} pages). Diff: ${diff} pages.`,
    {
      winner: longer.id,
      diff,
      comparison: "pages",
    }
  );
}

/**
 * Compare books by rating
 */
function compareByRating(book1: BookComparison, book2: BookComparison) {
  const name1 = truncate(book1.title, 30);
  const name2 = truncate(book2.title, 30);

  const rating1 = book1.ratingOverall ?? book1.rating ?? null;
  const rating2 = book2.ratingOverall ?? book2.rating ?? null;

  if (rating1 === null && rating2 === null) {
    return successResult(`Neither book is rated yet. ${name1} vs ${name2}`);
  }

  if (rating1 === null) {
    return successResult(`${name2}: ${rating2}/5. ${name1}: not rated.`);
  }

  if (rating2 === null) {
    return successResult(`${name1}: ${rating1}/5. ${name2}: not rated.`);
  }

  if (rating1 === rating2) {
    return successResult(`Tied! Both rated ${rating1}/5. ${name1} vs ${name2}`);
  }

  const better = rating1 > rating2 ? book1 : book2;
  const worse = rating1 > rating2 ? book2 : book1;
  const betterRating = Math.max(rating1, rating2);
  const worseRating = Math.min(rating1, rating2);

  return successResult(
    `${truncate(better.title, 30)} is rated higher (${betterRating}/5) vs ${truncate(worse.title, 25)} (${worseRating}/5).`,
    {
      winner: better.id,
      comparison: "rating",
    }
  );
}

/**
 * Compare books by genre
 */
function compareByGenre(book1: BookComparison, book2: BookComparison) {
  const name1 = truncate(book1.title, 25);
  const name2 = truncate(book2.title, 25);

  const genres1 = book1.genre?.split(",").map(g => g.trim()).filter(Boolean) || [];
  const genres2 = book2.genre?.split(",").map(g => g.trim()).filter(Boolean) || [];

  if (genres1.length === 0 && genres2.length === 0) {
    return successResult(`Neither book has genre info.`);
  }

  // Find common genres
  const common = genres1.filter(g1 =>
    genres2.some(g2 => g2.toLowerCase() === g1.toLowerCase())
  );

  const lines: string[] = [];

  if (common.length > 0) {
    lines.push(`Both: ${common.slice(0, 2).join(", ")}`);
  } else {
    lines.push("No shared genres.");
  }

  if (genres1.length > 0) {
    lines.push(`${name1}: ${genres1.slice(0, 2).join(", ")}`);
  }

  if (genres2.length > 0) {
    lines.push(`${name2}: ${genres2.slice(0, 2).join(", ")}`);
  }

  return successResult(lines.join("\n"), {
    commonGenres: common,
    comparison: "genre",
  });
}

/**
 * Full comparison of both books
 */
function compareAll(book1: BookComparison, book2: BookComparison) {
  const lines: string[] = [];

  // Book 1 summary
  const rating1 = book1.ratingOverall ?? book1.rating;
  const status1 = book1.read === "Read" ? "[Read]" : book1.read === "Reading" ? "[Reading]" : "";
  lines.push(`1. ${truncate(book1.title, 35)} ${status1}`);
  lines.push(`   ${book1.pages || "?"} pg | ${rating1 ? `${rating1}/5` : "unrated"}`);

  // Book 2 summary
  const rating2 = book2.ratingOverall ?? book2.rating;
  const status2 = book2.read === "Read" ? "[Read]" : book2.read === "Reading" ? "[Reading]" : "";
  lines.push(`2. ${truncate(book2.title, 35)} ${status2}`);
  lines.push(`   ${book2.pages || "?"} pg | ${rating2 ? `${rating2}/5` : "unrated"}`);

  // Quick comparison
  if (book1.pages && book2.pages) {
    const longer = book1.pages > book2.pages ? "1" : "2";
    lines.push(`Longer: #${longer}`);
  }

  if (rating1 && rating2) {
    if (rating1 > rating2) lines.push("Higher rated: #1");
    else if (rating2 > rating1) lines.push("Higher rated: #2");
    else lines.push("Same rating");
  }

  return successResult(lines.join("\n"), {
    book1: { id: book1.id, title: book1.title },
    book2: { id: book2.id, title: book2.title },
  });
}

/**
 * Handler for "which is longer" type questions
 */
export const whichIsLongerHandler: CommandHandler = async (intent, context) => {
  return compareHandler(
    { ...intent, params: { ...intent.params, type: "pages" } },
    context
  );
};

/**
 * Handler for "which is better" type questions
 */
export const whichIsBetterHandler: CommandHandler = async (intent, context) => {
  return compareHandler(
    { ...intent, params: { ...intent.params, type: "rating" } },
    context
  );
};
