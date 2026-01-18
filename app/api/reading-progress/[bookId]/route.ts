import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

type RouteContext = {
  params: Promise<{ bookId: string }>;
};

const DEFAULT_USER_ID = "default";

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { bookId } = await context.params;
    const bookIdNum = parseInt(bookId, 10);

    if (isNaN(bookIdNum)) {
      return NextResponse.json({ error: "Invalid book ID" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || DEFAULT_USER_ID;

    // Get or create reading progress for the book
    let progress = await prisma.readingProgress.findUnique({
      where: {
        bookId_userId: {
          bookId: bookIdNum,
          userId,
        },
      },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            pages: true,
            img: true,
            author: true,
          },
        },
      },
    });

    // If no progress exists, return a default state
    if (!progress) {
      const book = await prisma.book.findUnique({
        where: { id: bookIdNum },
        select: {
          id: true,
          title: true,
          pages: true,
          img: true,
          author: true,
        },
      });

      if (!book) {
        return NextResponse.json({ error: "Book not found" }, { status: 404 });
      }

      return NextResponse.json({
        bookId: bookIdNum,
        userId,
        status: "NOT_STARTED",
        progressPercent: 0,
        currentPage: 0,
        totalPages: book.pages,
        startedAt: null,
        completedAt: null,
        book,
      });
    }

    return NextResponse.json(progress);
  } catch (error) {
    console.error("Error fetching reading progress:", error);
    return NextResponse.json(
      { error: "Failed to fetch reading progress" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { bookId } = await context.params;
    const bookIdNum = parseInt(bookId, 10);

    if (isNaN(bookIdNum)) {
      return NextResponse.json({ error: "Invalid book ID" }, { status: 400 });
    }

    const body = await request.json();
    const userId = body.userId || DEFAULT_USER_ID;

    // Verify book exists
    const book = await prisma.book.findUnique({
      where: { id: bookIdNum },
    });

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Calculate progress percent if currentPage and totalPages provided
    let progressPercent = body.progressPercent;
    const totalPages = body.totalPages ?? book.pages;
    const currentPage = body.currentPage ?? 0;

    if (totalPages && currentPage !== undefined && progressPercent === undefined) {
      progressPercent = Math.min(100, Math.round((currentPage / totalPages) * 100 * 100) / 100);
    }

    // Determine status transitions
    let status = body.status;
    let startedAt = body.startedAt;
    let completedAt = body.completedAt;

    // Auto-set status based on progress
    if (status === undefined) {
      if (progressPercent === 100 || currentPage >= (totalPages || Infinity)) {
        status = "COMPLETED";
      } else if (currentPage > 0 || progressPercent > 0) {
        status = "READING";
      }
    }

    // Auto-set timestamps based on status
    const now = new Date();
    if (status === "READING" && !startedAt) {
      startedAt = now;
    }
    if (status === "COMPLETED" && !completedAt) {
      completedAt = now;
    }

    const progress = await prisma.readingProgress.upsert({
      where: {
        bookId_userId: {
          bookId: bookIdNum,
          userId,
        },
      },
      update: {
        status: status,
        progressPercent: progressPercent ?? undefined,
        currentPage: currentPage,
        totalPages: totalPages,
        startedAt: startedAt ? new Date(startedAt) : undefined,
        completedAt: completedAt ? new Date(completedAt) : undefined,
      },
      create: {
        bookId: bookIdNum,
        userId,
        status: status || "NOT_STARTED",
        progressPercent: progressPercent ?? 0,
        currentPage: currentPage,
        totalPages: totalPages,
        startedAt: startedAt ? new Date(startedAt) : null,
        completedAt: completedAt ? new Date(completedAt) : null,
      },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            pages: true,
            img: true,
            author: true,
          },
        },
      },
    });

    // Revalidate cached pages
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/bookshelf");

    return NextResponse.json(progress);
  } catch (error) {
    console.error("Error updating reading progress:", error);
    return NextResponse.json(
      { error: "Failed to update reading progress" },
      { status: 500 }
    );
  }
}
