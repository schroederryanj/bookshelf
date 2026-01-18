import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

/**
 * GET /api/recommendations/favorites
 * Analyzes user's highest-rated books (4+ stars) and recommends unread books
 * matching those patterns
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const minRating = parseFloat(searchParams.get("minRating") || "4");
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get("limit") || "8")));

    // Fetch highly-rated books (4+ stars)
    const favoriteBooks = await prisma.book.findMany({
      where: {
        OR: [
          { ratingOverall: { gte: minRating } },
          { rating: { gte: Math.round(minRating) } },
        ],
      },
      select: {
        id: true,
        genre: true,
        author: true,
        ratingOverall: true,
        rating: true,
      },
    });

    if (favoriteBooks.length === 0) {
      return NextResponse.json(
        {
          recommendations: [],
          source: "favorites",
          analysis: {
            favoriteCount: 0,
            topGenres: [],
            topAuthors: [],
          },
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          },
        }
      );
    }

    // Analyze favorite books for patterns
    const genreCount: Record<string, number> = {};
    const authorCount: Record<string, number> = {};
    const favoriteIds = new Set(favoriteBooks.map((b) => b.id));

    favoriteBooks.forEach((book) => {
      // Count genres
      if (book.genre) {
        const genres = book.genre.split(",").map((g) => g.trim()).filter(Boolean);
        genres.forEach((genre) => {
          genreCount[genre] = (genreCount[genre] || 0) + 1;
        });
      }

      // Count authors
      if (book.author) {
        authorCount[book.author] = (authorCount[book.author] || 0) + 1;
      }
    });

    // Sort and get top patterns
    const topGenres = Object.entries(genreCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre]) => genre);

    const topAuthors = Object.entries(authorCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([author]) => author);

    // Build query for recommendations
    const orConditions: Prisma.BookWhereInput[] = [];

    // Match by top genres
    topGenres.forEach((genre) => {
      orConditions.push({ genre: { contains: genre } });
    });

    // Match by top authors
    topAuthors.forEach((author) => {
      orConditions.push({ author: { contains: author } });
    });

    if (orConditions.length === 0) {
      return NextResponse.json(
        {
          recommendations: [],
          source: "favorites",
          analysis: {
            favoriteCount: favoriteBooks.length,
            topGenres: [],
            topAuthors: [],
          },
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          },
        }
      );
    }

    // Fetch recommended books (unread or not yet finished)
    const candidates = await prisma.book.findMany({
      where: {
        AND: [
          { OR: orConditions },
          // Exclude already highly-rated books and books marked as read/finished
          {
            OR: [
              { read: null },
              { read: "Unread" },
              { read: "" },
            ],
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 50, // Fetch more for scoring
    });

    // Filter out favorites and score candidates
    const scoredCandidates = candidates
      .filter((book) => !favoriteIds.has(book.id))
      .map((book) => {
        let score = 0;

        // Score for genre matches
        if (book.genre) {
          const bookGenres = book.genre.split(",").map((g) => g.trim());
          topGenres.forEach((topGenre, idx) => {
            if (bookGenres.some((bg) => bg.toLowerCase().includes(topGenre.toLowerCase()))) {
              // Higher weight for more common genres in favorites
              score += (topGenres.length - idx) * 2;
            }
          });
        }

        // Score for author matches
        if (book.author) {
          topAuthors.forEach((topAuthor, idx) => {
            if (book.author!.toLowerCase().includes(topAuthor.toLowerCase())) {
              score += (topAuthors.length - idx) * 1.5;
            }
          });
        }

        return { book, score };
      });

    // Sort by score and take top recommendations
    scoredCandidates.sort((a, b) => b.score - a.score);
    const recommendations = scoredCandidates.slice(0, limit).map((item) => item.book);

    return NextResponse.json(
      {
        recommendations,
        source: "favorites",
        analysis: {
          favoriteCount: favoriteBooks.length,
          topGenres,
          topAuthors,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching favorite-based recommendations:", error);
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 }
    );
  }
}
