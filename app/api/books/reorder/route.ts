import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

type BookUpdate = {
  id: number;
  position: number;
  shelf: number;
};

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { books } = body as { books: BookUpdate[] };

    if (!books || !Array.isArray(books)) {
      return NextResponse.json(
        { error: "Books array is required" },
        { status: 400 }
      );
    }

    // Update all books in a transaction
    await prisma.$transaction(
      books.map((book) =>
        prisma.book.update({
          where: { id: book.id },
          data: {
            position: book.position,
            shelf: book.shelf,
          },
        })
      )
    );

    // Revalidate cached pages
    revalidatePath("/");
    revalidatePath("/admin/books");
    revalidatePath("/admin");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering books:", error);
    return NextResponse.json(
      { error: "Failed to reorder books" },
      { status: 500 }
    );
  }
}
