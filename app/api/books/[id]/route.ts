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
