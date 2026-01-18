import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ author: string }>;
};

/**
 * GET /api/recommendations/author/[author]
 * Returns other books by the same author, sorted by rating
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { author } = await context.params;

    if (!author || author.trim().length === 0) {
      return NextResponse.json({ error: "Author name is required" }, { status: 400 });
    }

    // Decode URL-encoded author name
    const decodedAuthor = decodeURIComponent(author);

    const { searchParams } = new URL(request.url);
    const excludeId = searchParams.get("excludeId");
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));

    // Build where clause
    const whereClause: {
      author: { contains: string };
      id?: { not: number };
    } = {
      author: { contains: decodedAuthor },
    };

    // Exclude specific book if requested
    if (excludeId) {
      const excludeIdNum = parseInt(excludeId, 10);
      if (!isNaN(excludeIdNum)) {
        whereClause.id = { not: excludeIdNum };
      }
    }

    // Fetch books by author
    const books = await prisma.book.findMany({
      where: whereClause,
      orderBy: [
        { ratingOverall: "desc" },
        { rating: "desc" },
        { dateFinished: "desc" },
        { createdAt: "desc" },
      ],
      take: limit,
    });

    // Calculate author statistics
    const stats = {
      totalBooks: books.length,
      readCount: books.filter((b) => b.read === "Read" || b.read === "Finished").length,
      averageRating: 0,
    };

    const ratedBooks = books.filter((b) => b.ratingOverall || b.rating);
    if (ratedBooks.length > 0) {
      const totalRating = ratedBooks.reduce((sum, b) => {
        return sum + (b.ratingOverall || b.rating || 0);
      }, 0);
      stats.averageRating = Math.round((totalRating / ratedBooks.length) * 10) / 10;
    }

    return NextResponse.json(
      {
        recommendations: books,
        source: "author",
        author: decodedAuthor,
        stats,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching books by author:", error);
    return NextResponse.json(
      { error: "Failed to fetch books by author" },
      { status: 500 }
    );
  }
}
