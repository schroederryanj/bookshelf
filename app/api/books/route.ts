import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const read = searchParams.get("read");
    const author = searchParams.get("author");
    const genre = searchParams.get("genre");

    const where: Record<string, unknown> = {};
    if (read) where.read = read;
    if (author) where.author = { contains: author };
    if (genre) where.genre = { contains: genre };

    const books = await prisma.book.findMany({
      where,
      orderBy: { position: "asc" },
    });

    return NextResponse.json({ books, total: books.length });
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
