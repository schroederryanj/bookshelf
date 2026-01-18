import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

type SortableField = "createdAt" | "dateFinished" | "rating" | "author" | "pages" | "title" | "ratingOverall";
type SortOrder = "asc" | "desc";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Legacy params (backward compatibility)
    const read = searchParams.get("read");
    const author = searchParams.get("author");
    const genreParam = searchParams.get("genre");

    // New filtering params
    const rating = searchParams.get("rating");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // Sorting params
    const sortBy = searchParams.get("sortBy") as SortableField | null;
    const sortOrder = (searchParams.get("sortOrder") || "desc") as SortOrder;

    // Random book
    const random = searchParams.get("random") === "true";

    // Pagination params with sensible defaults
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const skip = (page - 1) * limit;

    // Build where clause dynamically
    const where: Prisma.BookWhereInput = {};

    // Legacy read filter (backward compatibility)
    if (read) {
      where.read = read;
    }

    // Status filter (supports: Reading, Unread, Read, Finished)
    if (status) {
      where.read = status;
    }

    // Legacy author filter (backward compatibility)
    if (author) {
      where.author = { contains: author };
    }

    // Genre filter - supports comma-separated values for multiple genres
    if (genreParam) {
      const genres = genreParam.split(",").map(g => g.trim());
      if (genres.length === 1) {
        where.genre = { contains: genres[0] };
      } else {
        where.OR = genres.map(g => ({
          genre: { contains: g }
        }));
      }
    }

    // Rating filter - supports "5", "4+", "unrated"
    if (rating) {
      if (rating === "unrated") {
        where.AND = [
          { ratingOverall: null },
          { rating: null }
        ];
      } else if (rating.endsWith("+")) {
        const minRating = parseFloat(rating.slice(0, -1));
        where.OR = [
          { ratingOverall: { gte: minRating } },
          { rating: { gte: Math.round(minRating) } }
        ];
      } else {
        const exactRating = parseFloat(rating);
        where.OR = [
          { ratingOverall: { gte: exactRating, lt: exactRating + 1 } },
          { rating: Math.round(exactRating) }
        ];
      }
    }

    // Search filter - searches across title, author, and description
    if (search) {
      const searchConditions: Prisma.BookWhereInput[] = [
        { title: { contains: search } },
        { author: { contains: search } },
        { description: { contains: search } }
      ];

      // Combine with existing OR conditions if any
      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions }
        ];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    // Handle random book request
    if (random) {
      const count = await prisma.book.count({ where });
      if (count === 0) {
        return NextResponse.json({
          book: null,
          total: 0
        });
      }

      const randomSkip = Math.floor(Math.random() * count);
      const book = await prisma.book.findFirst({
        where,
        skip: randomSkip,
      });

      return NextResponse.json({
        book,
        total: count
      });
    }

    // Build orderBy clause
    let orderBy: Prisma.BookOrderByWithRelationInput | Prisma.BookOrderByWithRelationInput[] = { position: "asc" };

    if (sortBy) {
      // Handle sorting based on field type
      switch (sortBy) {
        case "dateFinished":
          orderBy = { dateFinished: sortOrder };
          break;
        case "ratingOverall":
          orderBy = { ratingOverall: sortOrder };
          break;
        case "rating":
          orderBy = { rating: sortOrder };
          break;
        case "author":
          orderBy = { author: sortOrder };
          break;
        case "title":
          orderBy = { title: sortOrder };
          break;
        case "pages":
          orderBy = { pages: sortOrder };
          break;
        case "createdAt":
          orderBy = { createdAt: sortOrder };
          break;
        default:
          orderBy = { position: "asc" };
      }
    }

    // Run count and query in parallel for efficiency
    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.book.count({ where }),
    ]);

    return NextResponse.json({
      books,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + books.length < total,
    });
  } catch (error) {
    console.error("Error fetching books:", error);
    return NextResponse.json(
      { error: "Failed to fetch books" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.title || !body.img || body.height === undefined) {
      return NextResponse.json(
        { error: "Title, img, and height are required" },
        { status: 400 }
      );
    }

    // Get max position to add new book at the end
    const maxPosition = await prisma.book.aggregate({
      _max: { position: true },
    });
    const newPosition = (maxPosition._max.position ?? -1) + 1;

    const book = await prisma.book.create({
      data: {
        title: body.title,
        img: body.img,
        height: body.height,
        read: body.read || null,
        dateStarted: body.dateStarted || null,
        dateFinished: body.dateFinished || null,
        author: body.author || null,
        pages: body.pages || null,
        genre: body.genre || null,
        description: body.description || null,
        // Multi-factor ratings
        ratingWriting: body.ratingWriting || null,
        ratingPlot: body.ratingPlot || null,
        ratingCharacters: body.ratingCharacters || null,
        ratingPacing: body.ratingPacing || null,
        ratingWorldBuilding: body.ratingWorldBuilding || null,
        ratingEnjoyment: body.ratingEnjoyment || null,
        ratingRecommend: body.ratingRecommend || null,
        ratingOverall: body.ratingOverall || null,
        ratingOverrideManual: body.ratingOverrideManual || false,
        shelf: body.shelf || 1,
        position: newPosition,
      },
    });

    // Revalidate cached pages
    revalidatePath("/");
    revalidatePath("/admin/books");
    revalidatePath("/admin");

    return NextResponse.json(book, { status: 201 });
  } catch (error) {
    console.error("Error creating book:", error);
    return NextResponse.json(
      { error: "Failed to create book" },
      { status: 500 }
    );
  }
}
