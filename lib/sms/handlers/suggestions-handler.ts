/**
 * Smart Suggestions Handler
 *
 * Provide intelligent book recommendations based on:
 * - User's rating patterns (prefer highly-rated genres)
 * - Page count preferences
 * - Favorite authors
 *
 * Examples:
 * - "What should I read next?"
 * - "Recommend something based on my favorites"
 * - "What's a good short book?"
 * - "Suggest a quick read"
 */

import { prisma } from "@/lib/prisma";
import {
  CommandHandler,
  errorResult,
  successResult,
  truncate,
} from "./types";
import { buildStatusCondition } from "../utils/query-builder";

interface GenrePreference {
  genre: string;
  avgRating: number;
  count: number;
}

interface AuthorPreference {
  author: string;
  avgRating: number;
  count: number;
}

interface BookCandidate {
  id: number;
  title: string;
  author: string | null;
  genre: string | null;
  pages: number | null;
  ratingOverall: number | null;
  score: number;
}

/**
 * Main smart suggestions handler
 * "What should I read next?"
 */
export const smartSuggestionsHandler: CommandHandler = async (_intent, _context) => {
  try {
    // Analyze user's preferences
    const [genrePrefs, authorPrefs, pagePrefs] = await Promise.all([
      analyzeGenrePreferences(),
      analyzeAuthorPreferences(),
      analyzePagePreferences(),
    ]);

    console.log("[suggestions-handler] Preferences:", {
      topGenres: genrePrefs.slice(0, 3).map(g => g.genre),
      topAuthors: authorPrefs.slice(0, 3).map(a => a.author),
      avgPages: pagePrefs.avgPages,
    });

    // Get unread book candidates
    const candidates = await getUnreadCandidates();

    if (candidates.length === 0) {
      return successResult(
        "No unread books in your library! Time to add some new books."
      );
    }

    // Score candidates based on preferences
    const scored = scoreCandidates(candidates, genrePrefs, authorPrefs, pagePrefs);

    // Get top suggestions
    const topSuggestions = scored.slice(0, 3);

    if (topSuggestions.length === 0) {
      return successResult("Couldn't find good matches. Try adding more rated books!");
    }

    const lines = ["For you to read next:"];

    topSuggestions.forEach((book, idx) => {
      const author = book.author ? ` - ${truncate(book.author, 15)}` : "";
      const pages = book.pages ? ` (${book.pages}p)` : "";
      lines.push(`${idx + 1}. ${truncate(book.title, 30)}${author}${pages}`);
    });

    // Add reasoning
    if (genrePrefs.length > 0) {
      const topGenre = genrePrefs[0].genre;
      lines.push(`(Based on your love of ${topGenre})`);
    }

    return successResult(lines.join("\n"), {
      suggestions: topSuggestions.map(b => ({ id: b.id, title: b.title })),
      topGenres: genrePrefs.slice(0, 3).map(g => g.genre),
    });
  } catch (error) {
    console.error("[suggestions-handler] Error:", error);
    return errorResult("Sorry, couldn't generate suggestions.", error);
  }
};

/**
 * Favorites-based suggestions handler
 * "Recommend something based on my favorites"
 */
export const favoritesBasedHandler: CommandHandler = async (_intent, _context) => {
  try {
    // Get top-rated books (4+ stars)
    const favorites = await prisma.book.findMany({
      where: {
        OR: [
          { ratingOverall: { gte: 4 } },
          { rating: { gte: 4 } },
        ],
      },
      select: {
        id: true,
        title: true,
        author: true,
        genre: true,
      },
      orderBy: [
        { ratingOverall: "desc" },
        { rating: "desc" },
      ],
      take: 20,
    });

    if (favorites.length === 0) {
      return successResult(
        "No highly-rated books yet! Rate some books to get personalized suggestions."
      );
    }

    // Extract patterns from favorites
    const genreCount: Record<string, number> = {};
    const authorCount: Record<string, number> = {};

    favorites.forEach(book => {
      if (book.genre) {
        book.genre.split(",").forEach(g => {
          const genre = g.trim();
          genreCount[genre] = (genreCount[genre] || 0) + 1;
        });
      }
      if (book.author) {
        authorCount[book.author] = (authorCount[book.author] || 0) + 1;
      }
    });

    const topGenres = Object.entries(genreCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([g]) => g);

    const topAuthors = Object.entries(authorCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([a]) => a);

    // Find matching unread books
    const conditions = [
      ...topGenres.map(g => ({ genre: { contains: g } })),
      ...topAuthors.map(a => ({ author: { contains: a } })),
    ];

    const suggestions = await prisma.book.findMany({
      where: {
        AND: [
          { OR: conditions },
          buildStatusCondition("unread"),
          { id: { notIn: favorites.map(f => f.id) } },
        ],
      },
      select: {
        id: true,
        title: true,
        author: true,
        genre: true,
        pages: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Score suggestions
    const scored = suggestions.map(book => {
      let score = 0;
      if (book.genre) {
        topGenres.forEach((tg, idx) => {
          if (book.genre!.toLowerCase().includes(tg.toLowerCase())) {
            score += (3 - idx) * 2;
          }
        });
      }
      if (book.author) {
        topAuthors.forEach((ta, idx) => {
          if (book.author!.toLowerCase().includes(ta.toLowerCase())) {
            score += (3 - idx) * 1.5;
          }
        });
      }
      return { ...book, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const topSuggestions = scored.slice(0, 3);

    if (topSuggestions.length === 0) {
      return successResult(
        `You love ${topGenres[0] || "reading"}! Add more books in that genre.`
      );
    }

    const lines = ["Based on your favorites:"];
    topSuggestions.forEach((book, idx) => {
      const author = book.author ? ` - ${truncate(book.author, 15)}` : "";
      lines.push(`${idx + 1}. ${truncate(book.title, 35)}${author}`);
    });

    if (topGenres[0]) {
      lines.push(`(You rate ${topGenres[0]} highly)`);
    }

    return successResult(lines.join("\n"), {
      topGenres,
      topAuthors,
      count: topSuggestions.length,
    });
  } catch (error) {
    console.error("[suggestions-handler] Error:", error);
    return errorResult("Sorry, couldn't analyze favorites.", error);
  }
};

/**
 * Quick/short read handler
 * "What's a good short book?" / "Suggest a quick read"
 */
export const quickReadHandler: CommandHandler = async (intent, _context) => {
  try {
    const maxPages = (intent.params.maxPages as number | undefined) || 250;

    // Get highly-rated short unread books
    const candidates = await prisma.book.findMany({
      where: {
        AND: [
          buildStatusCondition("unread"),
          { pages: { not: null, lte: maxPages } },
        ],
      },
      select: {
        id: true,
        title: true,
        author: true,
        genre: true,
        pages: true,
        ratingOverall: true,
      },
      orderBy: [
        { ratingOverall: "desc" },
        { pages: "asc" },
      ],
      take: 20,
    });

    if (candidates.length === 0) {
      return successResult(
        `No unread books under ${maxPages} pages. Try: "short books including read"`
      );
    }

    // Prefer books with ratings, but include unrated
    const withRatings = candidates.filter(b => b.ratingOverall !== null);
    const suggestions = withRatings.length >= 3 ? withRatings : candidates;

    const topSuggestions = suggestions.slice(0, 3);

    const lines = [`Quick reads (under ${maxPages}p):`];
    topSuggestions.forEach((book, idx) => {
      const rating = book.ratingOverall ? ` (${book.ratingOverall}/5)` : "";
      lines.push(`${idx + 1}. ${truncate(book.title, 30)} - ${book.pages}p${rating}`);
    });

    return successResult(lines.join("\n"), {
      maxPages,
      count: topSuggestions.length,
    });
  } catch (error) {
    console.error("[suggestions-handler] Error:", error);
    return errorResult("Sorry, couldn't find quick reads.", error);
  }
};

/**
 * Epic/long read handler
 * "Suggest a long book" / "What's a good epic?"
 */
export const epicReadHandler: CommandHandler = async (intent, _context) => {
  try {
    const minPages = (intent.params.minPages as number | undefined) || 500;

    // Get highly-rated long unread books
    const candidates = await prisma.book.findMany({
      where: {
        AND: [
          buildStatusCondition("unread"),
          { pages: { not: null, gte: minPages } },
        ],
      },
      select: {
        id: true,
        title: true,
        author: true,
        genre: true,
        pages: true,
        ratingOverall: true,
      },
      orderBy: [
        { ratingOverall: "desc" },
        { pages: "desc" },
      ],
      take: 10,
    });

    if (candidates.length === 0) {
      return successResult(`No unread books over ${minPages} pages.`);
    }

    const topSuggestions = candidates.slice(0, 3);

    const lines = [`Epic reads (${minPages}+ pages):`];
    topSuggestions.forEach((book, idx) => {
      const author = book.author ? ` - ${truncate(book.author, 12)}` : "";
      const rating = book.ratingOverall ? ` (${book.ratingOverall}/5)` : "";
      lines.push(`${idx + 1}. ${truncate(book.title, 25)}${author} ${book.pages}p${rating}`);
    });

    return successResult(lines.join("\n"), {
      minPages,
      count: topSuggestions.length,
    });
  } catch (error) {
    console.error("[suggestions-handler] Error:", error);
    return errorResult("Sorry, couldn't find epic reads.", error);
  }
};

/**
 * Random unread book suggestion
 * "Pick a random book for me"
 */
export const randomBookHandler: CommandHandler = async (_intent, _context) => {
  try {
    // Get all unread books
    const unreadBooks = await prisma.book.findMany({
      where: buildStatusCondition("unread"),
      select: {
        id: true,
        title: true,
        author: true,
        pages: true,
        genre: true,
      },
    });

    if (unreadBooks.length === 0) {
      return successResult("No unread books to pick from!");
    }

    // Pick a random one
    const randomIndex = Math.floor(Math.random() * unreadBooks.length);
    const picked = unreadBooks[randomIndex];

    const lines = [
      "Random pick:",
      truncate(picked.title, 50),
    ];

    if (picked.author) {
      lines.push(`by ${truncate(picked.author, 30)}`);
    }

    const meta = [];
    if (picked.pages) meta.push(`${picked.pages} pages`);
    if (picked.genre) meta.push(truncate(picked.genre, 25));

    if (meta.length > 0) {
      lines.push(meta.join(" | "));
    }

    lines.push(`(1 of ${unreadBooks.length} unread books)`);

    return successResult(lines.join("\n"), {
      book: { id: picked.id, title: picked.title },
      totalUnread: unreadBooks.length,
    });
  } catch (error) {
    console.error("[suggestions-handler] Error:", error);
    return errorResult("Sorry, couldn't pick a random book.", error);
  }
};

/**
 * Mood-based suggestion handler
 * "Suggest something lighthearted" / "I want something adventurous"
 */
export const moodBasedHandler: CommandHandler = async (intent, _context) => {
  try {
    const mood = (intent.params.mood as string | undefined) || "any";

    // Map moods to genres
    const moodToGenres: Record<string, string[]> = {
      lighthearted: ["comedy", "humor", "romance", "cozy"],
      adventurous: ["adventure", "fantasy", "action", "thriller"],
      thoughtful: ["literary fiction", "philosophy", "memoir", "non-fiction"],
      escapist: ["fantasy", "science fiction", "sci-fi"],
      thrilling: ["thriller", "mystery", "suspense", "horror"],
      romantic: ["romance", "love", "relationship"],
      inspiring: ["biography", "memoir", "self-help", "motivational"],
      dark: ["horror", "thriller", "dystopian", "dark"],
    };

    const targetGenres = moodToGenres[mood.toLowerCase()] || [];

    if (targetGenres.length === 0) {
      return successResult(
        `Unknown mood "${mood}". Try: lighthearted, adventurous, thoughtful, thrilling, romantic, inspiring`
      );
    }

    // Find matching unread books
    const candidates = await prisma.book.findMany({
      where: {
        AND: [
          buildStatusCondition("unread"),
          {
            OR: targetGenres.map(g => ({ genre: { contains: g } })),
          },
        ],
      },
      select: {
        id: true,
        title: true,
        author: true,
        genre: true,
        pages: true,
        ratingOverall: true,
      },
      orderBy: [
        { ratingOverall: "desc" },
      ],
      take: 10,
    });

    if (candidates.length === 0) {
      return successResult(
        `No ${mood} books found. Add some ${targetGenres[0]} books!`
      );
    }

    const topSuggestions = candidates.slice(0, 3);

    const lines = [`For a ${mood} mood:`];
    topSuggestions.forEach((book, idx) => {
      const author = book.author ? ` - ${truncate(book.author, 15)}` : "";
      lines.push(`${idx + 1}. ${truncate(book.title, 32)}${author}`);
    });

    return successResult(lines.join("\n"), {
      mood,
      matchedGenres: targetGenres,
      count: topSuggestions.length,
    });
  } catch (error) {
    console.error("[suggestions-handler] Error:", error);
    return errorResult("Sorry, couldn't find mood-based suggestions.", error);
  }
};

// Helper functions

async function analyzeGenrePreferences(): Promise<GenrePreference[]> {
  const ratedBooks = await prisma.book.findMany({
    where: {
      OR: [
        { ratingOverall: { not: null } },
        { rating: { not: null } },
      ],
      genre: { not: null },
    },
    select: {
      genre: true,
      ratingOverall: true,
      rating: true,
    },
  });

  const genreStats: Record<string, { total: number; count: number }> = {};

  ratedBooks.forEach(book => {
    const rating = book.ratingOverall ?? book.rating ?? 0;
    if (book.genre) {
      book.genre.split(",").forEach(g => {
        const genre = g.trim();
        if (!genreStats[genre]) {
          genreStats[genre] = { total: 0, count: 0 };
        }
        genreStats[genre].total += rating;
        genreStats[genre].count += 1;
      });
    }
  });

  return Object.entries(genreStats)
    .filter(([, stats]) => stats.count >= 2) // Need at least 2 books
    .map(([genre, stats]) => ({
      genre,
      avgRating: stats.total / stats.count,
      count: stats.count,
    }))
    .sort((a, b) => b.avgRating - a.avgRating);
}

async function analyzeAuthorPreferences(): Promise<AuthorPreference[]> {
  const ratedBooks = await prisma.book.findMany({
    where: {
      OR: [
        { ratingOverall: { not: null } },
        { rating: { not: null } },
      ],
      author: { not: null },
    },
    select: {
      author: true,
      ratingOverall: true,
      rating: true,
    },
  });

  const authorStats: Record<string, { total: number; count: number }> = {};

  ratedBooks.forEach(book => {
    const rating = book.ratingOverall ?? book.rating ?? 0;
    if (book.author) {
      if (!authorStats[book.author]) {
        authorStats[book.author] = { total: 0, count: 0 };
      }
      authorStats[book.author].total += rating;
      authorStats[book.author].count += 1;
    }
  });

  return Object.entries(authorStats)
    .filter(([, stats]) => stats.count >= 2) // Need at least 2 books
    .map(([author, stats]) => ({
      author,
      avgRating: stats.total / stats.count,
      count: stats.count,
    }))
    .sort((a, b) => b.avgRating - a.avgRating);
}

async function analyzePagePreferences(): Promise<{ avgPages: number; preferShort: boolean }> {
  const readBooks = await prisma.book.findMany({
    where: {
      read: { in: ["Read", "Finished"] },
      pages: { not: null },
    },
    select: { pages: true },
  });

  if (readBooks.length === 0) {
    return { avgPages: 300, preferShort: false };
  }

  const totalPages = readBooks.reduce((sum, b) => sum + (b.pages || 0), 0);
  const avgPages = Math.round(totalPages / readBooks.length);

  return {
    avgPages,
    preferShort: avgPages < 300,
  };
}

async function getUnreadCandidates(): Promise<BookCandidate[]> {
  const books = await prisma.book.findMany({
    where: buildStatusCondition("unread"),
    select: {
      id: true,
      title: true,
      author: true,
      genre: true,
      pages: true,
      ratingOverall: true,
    },
    take: 100,
  });

  return books.map(b => ({ ...b, score: 0 }));
}

function scoreCandidates(
  candidates: BookCandidate[],
  genrePrefs: GenrePreference[],
  authorPrefs: AuthorPreference[],
  pagePrefs: { avgPages: number; preferShort: boolean }
): BookCandidate[] {
  const topGenres = genrePrefs.slice(0, 5);
  const topAuthors = authorPrefs.slice(0, 5);

  candidates.forEach(book => {
    let score = 0;

    // Genre matching
    if (book.genre) {
      const bookGenres = book.genre.split(",").map(g => g.trim().toLowerCase());
      topGenres.forEach((pref, idx) => {
        if (bookGenres.some(bg => bg.includes(pref.genre.toLowerCase()))) {
          // Weight by preference rank and average rating
          score += (5 - idx) * pref.avgRating;
        }
      });
    }

    // Author matching
    if (book.author) {
      topAuthors.forEach((pref, idx) => {
        if (book.author!.toLowerCase().includes(pref.author.toLowerCase())) {
          score += (5 - idx) * pref.avgRating * 0.8;
        }
      });
    }

    // Page count preference
    if (book.pages) {
      const diff = Math.abs(book.pages - pagePrefs.avgPages);
      // Closer to preferred length = higher score
      score += Math.max(0, 5 - diff / 100);
    }

    book.score = score;
  });

  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}
