import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

type RouteContext = {
  params: Promise<{ genre: string }>;
};

/**
 * GET /api/recommendations/genre/[genre]
 * Returns books in the same genre with pagination and optional read status filter
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { genre } = await context.params;

    if (!genre || genre.trim().length === 0) {
      return NextResponse.json({ error: "Genre is required" }, { status: 400 });
    }

    // Decode URL-encoded genre
    const decodedGenre = decodeURIComponent(genre);

    const { searchParams } = new URL(request.url);
    const readStatus = searchParams.get("readStatus"); // "read", "unread", "all"
    const sortBy = searchParams.get("sortBy") || "rating"; // "rating", "date", "title"
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;

    // Exclude specific book if requested
    const excludeId = searchParams.get("excludeId");

    // Build where clause
    const whereClause: Prisma.BookWhereInput = {
      genre: { contains: decodedGenre },
    };

    // Apply read status filter
    if (readStatus === "read") {
      whereClause.read = { in: ["Read", "Finished"] };
    } else if (readStatus === "unread") {
      whereClause.OR = [
        { read: null },
        { read: "Unread" },
        { read: "" },
      ];
    }
    // "all" or undefined: no additional filter

    // Exclude specific book if requested
    if (excludeId) {
      const excludeIdNum = parseInt(excludeId, 10);
      if (!isNaN(excludeIdNum)) {
        whereClause.id = { not: excludeIdNum };
      }
    }

    // Build orderBy clause
    let orderBy: Prisma.BookOrderByWithRelationInput[];
    switch (sortBy) {
      case "title":
        orderBy = [{ title: sortOrder }];
        break;
      case "date":
        orderBy = [{ dateFinished: sortOrder }, { createdAt: sortOrder }];
        break;
      case "author":
        orderBy = [{ author: sortOrder }, { title: "asc" }];
        break;
      case "rating":
      default:
        orderBy = [
          { ratingOverall: sortOrder },
          { rating: sortOrder },
          { createdAt: "desc" },
        ];
        break;
    }

    // Execute queries in parallel
    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where: whereClause,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.book.count({ where: whereClause }),
    ]);

    // Calculate genre statistics
    const allGenreBooks = await prisma.book.findMany({
      where: { genre: { contains: decodedGenre } },
      select: {
        read: true,
        ratingOverall: true,
        rating: true,
      },
    });

    const stats = {
      totalInGenre: allGenreBooks.length,
      readCount: allGenreBooks.filter((b) => b.read === "Read" || b.read === "Finished").length,
      unreadCount: allGenreBooks.filter((b) => !b.read || b.read === "Unread" || b.read === "").length,
      averageRating: 0,
    };

    const ratedBooks = allGenreBooks.filter((b) => b.ratingOverall || b.rating);
    if (ratedBooks.length > 0) {
      const totalRating = ratedBooks.reduce((sum, b) => {
        return sum + (b.ratingOverall || b.rating || 0);
      }, 0);
      stats.averageRating = Math.round((totalRating / ratedBooks.length) * 10) / 10;
    }

    return NextResponse.json(
      {
        recommendations: books,
        source: "genre",
        genre: decodedGenre,
        stats,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + books.length < total,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching books by genre:", error);
    return NextResponse.json(
      { error: "Failed to fetch books by genre" },
      { status: 500 }
    );
  }
}
