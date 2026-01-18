import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

const DEFAULT_USER_ID = "default";

// GET - List reading sessions with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || DEFAULT_USER_ID;
    const bookId = searchParams.get("bookId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const where: Record<string, unknown> = { userId };

    if (bookId) {
      where.bookId = parseInt(bookId, 10);
    }

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) {
        (where.startTime as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.startTime as Record<string, Date>).lte = new Date(endDate);
      }
    }

    const sessions = await prisma.readingSession.findMany({
      where,
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            img: true,
          },
        },
      },
      orderBy: { startTime: "desc" },
      take: limit,
    });

    // Calculate total stats
    const totalDuration = sessions.reduce((acc: number, s: { duration: number | null }) => acc + (s.duration || 0), 0);
    const totalPagesRead = sessions.reduce((acc: number, s: { pagesRead: number }) => acc + s.pagesRead, 0);

    return NextResponse.json({
      sessions,
      stats: {
        totalSessions: sessions.length,
        totalDuration,
        totalPagesRead,
        averageSessionDuration: sessions.length > 0 ? Math.round(totalDuration / sessions.length) : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching reading sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch reading sessions" },
      { status: 500 }
    );
  }
}

// POST - Start a new reading session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookId, userId = DEFAULT_USER_ID, startTime } = body;

    if (!bookId) {
      return NextResponse.json({ error: "Book ID is required" }, { status: 400 });
    }

    const bookIdNum = parseInt(bookId, 10);

    // Verify book exists
    const book = await prisma.book.findUnique({
      where: { id: bookIdNum },
    });

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Check for any active session (no endTime) for this user
    const activeSession = await prisma.readingSession.findFirst({
      where: {
        userId,
        endTime: null,
      },
    });

    if (activeSession) {
      return NextResponse.json(
        {
          error: "Active reading session exists",
          activeSession,
          message: "Please end your current reading session before starting a new one"
        },
        { status: 409 }
      );
    }

    const session = await prisma.readingSession.create({
      data: {
        bookId: bookIdNum,
        userId,
        startTime: startTime ? new Date(startTime) : new Date(),
      },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            img: true,
          },
        },
      },
    });

    // Update reading progress status to READING if not already
    await prisma.readingProgress.upsert({
      where: {
        bookId_userId: {
          bookId: bookIdNum,
          userId,
        },
      },
      update: {
        status: "READING",
        startedAt: new Date(),
      },
      create: {
        bookId: bookIdNum,
        userId,
        status: "READING",
        startedAt: new Date(),
        totalPages: book.pages,
      },
    });

    revalidatePath("/");
    revalidatePath("/bookshelf");

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error("Error creating reading session:", error);
    return NextResponse.json(
      { error: "Failed to create reading session" },
      { status: 500 }
    );
  }
}

// PATCH - End/update a reading session
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, endTime, pagesRead, userId = DEFAULT_USER_ID } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    const sessionIdNum = parseInt(sessionId, 10);

    // Find the session
    const existingSession = await prisma.readingSession.findUnique({
      where: { id: sessionIdNum },
    });

    if (!existingSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (existingSession.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Calculate duration if ending session
    const sessionEndTime = endTime ? new Date(endTime) : new Date();
    let duration = existingSession.duration;

    if (!existingSession.endTime) {
      duration = Math.round((sessionEndTime.getTime() - existingSession.startTime.getTime()) / 1000);
    }

    const session = await prisma.readingSession.update({
      where: { id: sessionIdNum },
      data: {
        endTime: sessionEndTime,
        pagesRead: pagesRead ?? existingSession.pagesRead,
        duration,
      },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            img: true,
            pages: true,
          },
        },
      },
    });

    // Update reading progress with new page count if provided
    if (pagesRead !== undefined) {
      const progress = await prisma.readingProgress.findUnique({
        where: {
          bookId_userId: {
            bookId: session.bookId,
            userId,
          },
        },
      });

      if (progress) {
        const newCurrentPage = progress.currentPage + pagesRead;
        const totalPages = progress.totalPages || session.book.pages || 0;
        const progressPercent = totalPages > 0
          ? Math.min(100, Math.round((newCurrentPage / totalPages) * 100 * 100) / 100)
          : 0;

        await prisma.readingProgress.update({
          where: {
            bookId_userId: {
              bookId: session.bookId,
              userId,
            },
          },
          data: {
            currentPage: newCurrentPage,
            progressPercent,
            status: progressPercent >= 100 ? "COMPLETED" : "READING",
            completedAt: progressPercent >= 100 ? new Date() : undefined,
          },
        });
      }
    }

    revalidatePath("/");
    revalidatePath("/bookshelf");

    return NextResponse.json(session);
  } catch (error) {
    console.error("Error updating reading session:", error);
    return NextResponse.json(
      { error: "Failed to update reading session" },
      { status: 500 }
    );
  }
}
