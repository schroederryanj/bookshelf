import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

type RouteContext = {
  params: Promise<{ bookId: string }>;
};

/**
 * GET /api/recommendations/similar/[bookId]
 * Returns books similar to a given book based on genre (primary) and author (secondary)
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { bookId } = await context.params;
    const id = parseInt(bookId, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid book ID" }, { status: 400 });
    }

    // Fetch the source book
    const sourceBook = await prisma.book.findUnique({
      where: { id },
    });

    if (!sourceBook) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Parse genres from comma-separated string
    const sourceGenres = sourceBook.genre
      ? sourceBook.genre.split(",").map((g) => g.trim()).filter(Boolean)
      : [];

    // Build query for similar books
    const orConditions: Prisma.BookWhereInput[] = [];

    // Primary matching: genres
    if (sourceGenres.length > 0) {
      sourceGenres.forEach((genre) => {
        orConditions.push({ genre: { contains: genre } });
      });
    }

    // Secondary matching: same author
    if (sourceBook.author) {
      orConditions.push({ author: { contains: sourceBook.author } });
    }

    if (orConditions.length === 0) {
      // No criteria to match, return empty recommendations
      return NextResponse.json(
        {
          recommendations: [],
          source: "similar",
          sourceBook: {
            id: sourceBook.id,
            title: sourceBook.title,
            author: sourceBook.author,
            genre: sourceBook.genre,
          },
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          },
        }
      );
    }

    // Fetch similar books, excluding the source book
    const similarBooks = await prisma.book.findMany({
      where: {
        AND: [
          { id: { not: id } },
          { OR: orConditions },
        ],
      },
      orderBy: [
        { ratingOverall: "desc" },
        { rating: "desc" },
        { createdAt: "desc" },
      ],
      take: 20, // Fetch more to allow scoring
    });

    // Score and rank results
    // Genre matches score higher than author-only matches
    const scoredBooks = similarBooks.map((book) => {
      let score = 0;

      // Score for genre matches
      if (book.genre && sourceGenres.length > 0) {
        const bookGenres = book.genre.split(",").map((g) => g.trim());
        const genreMatches = sourceGenres.filter((sg) =>
          bookGenres.some((bg) => bg.toLowerCase().includes(sg.toLowerCase()))
        ).length;
        score += genreMatches * 3; // Weight genre matches highly
      }

      // Score for author match
      if (book.author && sourceBook.author) {
        if (book.author.toLowerCase() === sourceBook.author.toLowerCase()) {
          score += 2;
        } else if (book.author.toLowerCase().includes(sourceBook.author.toLowerCase())) {
          score += 1;
        }
      }

      // Bonus for higher ratings
      if (book.ratingOverall) {
        score += book.ratingOverall * 0.5;
      } else if (book.rating) {
        score += book.rating * 0.5;
      }

      return { book, score };
    });

    // Sort by score descending, take top 8
    scoredBooks.sort((a, b) => b.score - a.score);
    const recommendations = scoredBooks.slice(0, 8).map((item) => item.book);

    return NextResponse.json(
      {
        recommendations,
        source: "similar",
        sourceBook: {
          id: sourceBook.id,
          title: sourceBook.title,
          author: sourceBook.author,
          genre: sourceBook.genre,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching similar books:", error);
    return NextResponse.json(
      { error: "Failed to fetch similar books" },
      { status: 500 }
    );
  }
}
