/**
 * Recommendations Handler - Get personalized book recommendations
 */

import { prisma } from "@/lib/prisma";
import {
  CommandHandler,
  errorResult,
  successResult,
  truncate,
} from "./types";

/**
 * Get personalized recommendations based on reading history
 */
export const recommendationsHandler: CommandHandler = async (intent, _context) => {
  try {
    const genre = intent.params.genre as string | undefined;
    const limit = Math.min((intent.params.limit as number | undefined) || 3, 5);

    // If genre specified, get recommendations from that genre
    if (genre) {
      return getGenreRecommendations(genre, limit);
    }

    // Otherwise, get recommendations based on favorites
    return getFavoriteBasedRecommendations(limit);
  } catch (error) {
    return errorResult("Sorry, couldn't get recommendations. Try again.", error);
  }
};

async function getGenreRecommendations(genre: string, limit: number) {
  // Find unread books in the specified genre
  const books = await prisma.book.findMany({
    where: {
      genre: { contains: genre },
      OR: [
        { read: null },
        { read: "Unread" },
        { read: "" },
      ],
    },
    select: {
      id: true,
      title: true,
      author: true,
      ratingOverall: true,
      rating: true,
    },
    orderBy: [
      { ratingOverall: "desc" },
      { rating: "desc" },
      { createdAt: "desc" },
    ],
    take: limit,
  });

  if (books.length === 0) {
    // Check if we have any books in this genre at all
    const genreCount = await prisma.book.count({
      where: { genre: { contains: genre } },
    });

    if (genreCount === 0) {
      return successResult(`No books found in "${truncate(genre, 20)}" genre. Try: recommend fantasy`);
    }

    return successResult(`You've read all ${genreCount} books in "${truncate(genre, 15)}"! Add more or try another genre.`);
  }

  const lines = books.map((book, idx) => {
    const author = book.author ? ` - ${truncate(book.author, 15)}` : "";
    return `${idx + 1}. ${truncate(book.title, 35)}${author}`;
  });

  const header = `${genre} recommendations:`;
  return successResult([header, ...lines].join("\n"), {
    genre,
    count: books.length,
  });
}

async function getFavoriteBasedRecommendations(limit: number) {
  // Get highly-rated books to understand preferences
  const favoriteBooks = await prisma.book.findMany({
    where: {
      OR: [
        { ratingOverall: { gte: 4 } },
        { rating: { gte: 4 } },
      ],
    },
    select: {
      id: true,
      genre: true,
      author: true,
    },
  });

  if (favoriteBooks.length === 0) {
    // No rated books, just return popular unread books
    return getPopularUnreadBooks(limit);
  }

  // Analyze favorite patterns
  const genreCount: Record<string, number> = {};
  const authorCount: Record<string, number> = {};
  const favoriteIds = new Set(favoriteBooks.map(b => b.id));

  favoriteBooks.forEach(book => {
    if (book.genre) {
      const genres = book.genre.split(",").map(g => g.trim()).filter(Boolean);
      genres.forEach(g => {
        genreCount[g] = (genreCount[g] || 0) + 1;
      });
    }
    if (book.author) {
      authorCount[book.author] = (authorCount[book.author] || 0) + 1;
    }
  });

  // Get top genres and authors
  const topGenres = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([g]) => g);

  const topAuthors = Object.entries(authorCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([a]) => a);

  // Build search conditions
  const conditions: { genre?: { contains: string }; author?: { contains: string } }[] = [];
  topGenres.forEach(g => conditions.push({ genre: { contains: g } }));
  topAuthors.forEach(a => conditions.push({ author: { contains: a } }));

  if (conditions.length === 0) {
    return getPopularUnreadBooks(limit);
  }

  // Find matching unread books
  const candidates = await prisma.book.findMany({
    where: {
      AND: [
        { OR: conditions },
        {
          OR: [
            { read: null },
            { read: "Unread" },
            { read: "" },
          ],
        },
        { id: { notIn: Array.from(favoriteIds) } },
      ],
    },
    select: {
      id: true,
      title: true,
      author: true,
      genre: true,
    },
    take: 20,
  });

  // Score candidates
  const scored = candidates.map(book => {
    let score = 0;
    if (book.genre) {
      const bookGenres = book.genre.split(",").map(g => g.trim().toLowerCase());
      topGenres.forEach((tg, idx) => {
        if (bookGenres.some(bg => bg.includes(tg.toLowerCase()))) {
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
    return { book, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const recommendations = scored.slice(0, limit).map(s => s.book);

  if (recommendations.length === 0) {
    return getPopularUnreadBooks(limit);
  }

  const lines = recommendations.map((book, idx) => {
    const author = book.author ? ` - ${truncate(book.author, 15)}` : "";
    return `${idx + 1}. ${truncate(book.title, 35)}${author}`;
  });

  const genreHint = topGenres[0] ? ` (based on ${topGenres[0]})` : "";
  const header = `For you${genreHint}:`;
  return successResult([header, ...lines].join("\n"), {
    topGenres,
    count: recommendations.length,
  });
}

async function getPopularUnreadBooks(limit: number) {
  const books = await prisma.book.findMany({
    where: {
      OR: [
        { read: null },
        { read: "Unread" },
        { read: "" },
      ],
    },
    select: {
      id: true,
      title: true,
      author: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  if (books.length === 0) {
    return successResult("No unread books! Add some books or check your reading list.");
  }

  const lines = books.map((book, idx) => {
    const author = book.author ? ` - ${truncate(book.author, 15)}` : "";
    return `${idx + 1}. ${truncate(book.title, 35)}${author}`;
  });

  return successResult(["From your library:", ...lines].join("\n"));
}

/**
 * Get recommendations by specific author
 */
export const authorRecommendationsHandler: CommandHandler = async (intent, _context) => {
  try {
    const author = intent.params.author as string | undefined;
    const limit = Math.min((intent.params.limit as number | undefined) || 3, 5);

    if (!author) {
      return errorResult("Please specify an author. Example: recommend author Brandon Sanderson");
    }

    const books = await prisma.book.findMany({
      where: {
        author: { contains: author },
        OR: [
          { read: null },
          { read: "Unread" },
          { read: "" },
        ],
      },
      select: {
        id: true,
        title: true,
        ratingOverall: true,
      },
      orderBy: [
        { ratingOverall: "desc" },
        { createdAt: "desc" },
      ],
      take: limit,
    });

    if (books.length === 0) {
      // Check if we have any books by this author
      const authorCount = await prisma.book.count({
        where: { author: { contains: author } },
      });

      if (authorCount === 0) {
        return successResult(`No books by "${truncate(author, 25)}" in your library.`);
      }

      return successResult(`You've read all books by "${truncate(author, 25)}"! Nice!`);
    }

    const lines = books.map((book, idx) => {
      return `${idx + 1}. ${truncate(book.title, 45)}`;
    });

    return successResult([`By ${truncate(author, 20)}:`, ...lines].join("\n"));
  } catch (error) {
    return errorResult("Sorry, couldn't get author recommendations.", error);
  }
};
