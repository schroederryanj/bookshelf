import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const bookId = parseInt(id, 10);

    if (isNaN(bookId)) {
      return NextResponse.json({ error: "Invalid book ID" }, { status: 400 });
    }

    const book = await prisma.book.findUnique({
      where: { id: bookId },
    });

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    return NextResponse.json(book);
  } catch (error) {
    console.error("Error fetching book:", error);
    return NextResponse.json(
      { error: "Failed to fetch book" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const bookId = parseInt(id, 10);

    if (isNaN(bookId)) {
      return NextResponse.json({ error: "Invalid book ID" }, { status: 400 });
    }

    const body = await request.json();

    const book = await prisma.book.update({
      where: { id: bookId },
      data: {
        title: body.title,
        img: body.img,
        height: body.height,
        read: body.read ?? null,
        dateStarted: body.dateStarted ?? null,
        dateFinished: body.dateFinished ?? null,
        author: body.author ?? null,
        pages: body.pages ?? null,
        genre: body.genre ?? null,
        description: body.description ?? null,
        // Multi-factor ratings
        ratingWriting: body.ratingWriting ?? null,
        ratingPlot: body.ratingPlot ?? null,
        ratingCharacters: body.ratingCharacters ?? null,
        ratingPacing: body.ratingPacing ?? null,
        ratingWorldBuilding: body.ratingWorldBuilding ?? null,
        ratingEnjoyment: body.ratingEnjoyment ?? null,
        ratingRecommend: body.ratingRecommend ?? null,
        ratingOverall: body.ratingOverall ?? null,
        ratingOverrideManual: body.ratingOverrideManual ?? false,
        shelf: body.shelf ?? 1,
      },
    });

    // Revalidate cached pages
    revalidatePath("/");
    revalidatePath("/admin/books");
    revalidatePath("/admin");

    return NextResponse.json(book);
  } catch (error) {
    console.error("Error updating book:", error);
    return NextResponse.json(
      { error: "Failed to update book" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const bookId = parseInt(id, 10);

    if (isNaN(bookId)) {
      return NextResponse.json({ error: "Invalid book ID" }, { status: 400 });
    }

    const body = await request.json();

    // Only update fields that are provided (partial update)
    const updateData: Record<string, unknown> = {};

    if (body.read !== undefined) updateData.read = body.read;
    if (body.dateStarted !== undefined) updateData.dateStarted = body.dateStarted;
    if (body.dateFinished !== undefined) updateData.dateFinished = body.dateFinished;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.author !== undefined) updateData.author = body.author;
    if (body.pages !== undefined) updateData.pages = body.pages;
    if (body.genre !== undefined) updateData.genre = body.genre;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.ratingOverall !== undefined) updateData.ratingOverall = body.ratingOverall;

    const book = await prisma.book.update({
      where: { id: bookId },
      data: updateData,
    });

    // Revalidate cached pages
    revalidatePath("/");
    revalidatePath("/admin/books");
    revalidatePath("/admin");
    revalidatePath("/admin/reading-progress");

    return NextResponse.json(book);
  } catch (error) {
    console.error("Error patching book:", error);
    return NextResponse.json(
      { error: "Failed to update book" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const bookId = parseInt(id, 10);

    if (isNaN(bookId)) {
      return NextResponse.json({ error: "Invalid book ID" }, { status: 400 });
    }

    await prisma.book.delete({
      where: { id: bookId },
    });

    // Revalidate cached pages
    revalidatePath("/");
    revalidatePath("/admin/books");
    revalidatePath("/admin");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting book:", error);
    return NextResponse.json(
      { error: "Failed to delete book" },
      { status: 500 }
    );
  }
}
