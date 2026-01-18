import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

const DEFAULT_USER_ID = "default";

// Helper to calculate period string based on goal type
function calculatePeriod(goalType: string, date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  switch (goalType) {
    case "BOOKS_PER_MONTH":
      return `${year}-${month}`;
    case "BOOKS_PER_YEAR":
      return `${year}`;
    case "PAGES_PER_DAY":
      return `${year}-${month}-${String(date.getDate()).padStart(2, "0")}`;
    default:
      return `${year}-${month}`;
  }
}

// Helper to calculate start and end dates for a period
function calculatePeriodDates(goalType: string, period: string): { startDate: Date; endDate: Date } {
  const parts = period.split("-").map(Number);

  switch (goalType) {
    case "BOOKS_PER_YEAR": {
      const year = parts[0];
      return {
        startDate: new Date(year, 0, 1),
        endDate: new Date(year, 11, 31, 23, 59, 59),
      };
    }
    case "BOOKS_PER_MONTH": {
      const year = parts[0];
      const month = parts[1] - 1;
      return {
        startDate: new Date(year, month, 1),
        endDate: new Date(year, month + 1, 0, 23, 59, 59),
      };
    }
    case "PAGES_PER_DAY": {
      const year = parts[0];
      const month = parts[1] - 1;
      const day = parts[2];
      return {
        startDate: new Date(year, month, day, 0, 0, 0),
        endDate: new Date(year, month, day, 23, 59, 59),
      };
    }
    default:
      return {
        startDate: new Date(),
        endDate: new Date(),
      };
  }
}

// GET - List reading goals
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || DEFAULT_USER_ID;
    const goalType = searchParams.get("goalType");
    const period = searchParams.get("period");
    const active = searchParams.get("active");

    const where: Record<string, unknown> = { userId };

    if (goalType) {
      where.goalType = goalType;
    }

    if (period) {
      where.period = period;
    }

    // Filter to only active goals (current period)
    if (active === "true") {
      const now = new Date();
      where.startDate = { lte: now };
      where.endDate = { gte: now };
    }

    const goals = await prisma.readingGoal.findMany({
      where,
      orderBy: [{ goalType: "asc" }, { startDate: "desc" }],
    });

    // Calculate progress percentage for each goal
    const goalsWithProgress = goals.map((goal: { id: number; target: number; current: number; [key: string]: unknown }) => ({
      ...goal,
      progressPercent: goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0,
      isComplete: goal.current >= goal.target,
      remaining: Math.max(0, goal.target - goal.current),
    }));

    return NextResponse.json({ goals: goalsWithProgress });
  } catch (error) {
    console.error("Error fetching reading goals:", error);
    return NextResponse.json(
      { error: "Failed to fetch reading goals" },
      { status: 500 }
    );
  }
}

// POST - Create a new reading goal
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { goalType, target, userId = DEFAULT_USER_ID, period: customPeriod } = body;

    if (!goalType || target === undefined) {
      return NextResponse.json(
        { error: "Goal type and target are required" },
        { status: 400 }
      );
    }

    if (!["BOOKS_PER_MONTH", "BOOKS_PER_YEAR", "PAGES_PER_DAY"].includes(goalType)) {
      return NextResponse.json(
        { error: "Invalid goal type" },
        { status: 400 }
      );
    }

    if (typeof target !== "number" || target <= 0) {
      return NextResponse.json(
        { error: "Target must be a positive number" },
        { status: 400 }
      );
    }

    const period = customPeriod || calculatePeriod(goalType, new Date());
    const { startDate, endDate } = calculatePeriodDates(goalType, period);

    // Check if goal already exists for this period
    const existingGoal = await prisma.readingGoal.findUnique({
      where: {
        userId_goalType_period: {
          userId,
          goalType,
          period,
        },
      },
    });

    if (existingGoal) {
      return NextResponse.json(
        {
          error: "Goal already exists for this period",
          existingGoal,
        },
        { status: 409 }
      );
    }

    // Calculate current progress
    let current = 0;

    if (goalType === "BOOKS_PER_MONTH" || goalType === "BOOKS_PER_YEAR") {
      // Count completed books in the period
      const completedBooks = await prisma.readingProgress.count({
        where: {
          userId,
          status: "COMPLETED",
          completedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });
      current = completedBooks;
    } else if (goalType === "PAGES_PER_DAY") {
      // Sum pages read in sessions for today
      const sessions = await prisma.readingSession.findMany({
        where: {
          userId,
          startTime: {
            gte: startDate,
            lte: endDate,
          },
        },
      });
      current = sessions.reduce((acc: number, s: { pagesRead: number }) => acc + s.pagesRead, 0);
    }

    const goal = await prisma.readingGoal.create({
      data: {
        userId,
        goalType,
        target,
        current,
        period,
        startDate,
        endDate,
      },
    });

    revalidatePath("/");
    revalidatePath("/bookshelf");

    return NextResponse.json(
      {
        ...goal,
        progressPercent: goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0,
        isComplete: goal.current >= goal.target,
        remaining: Math.max(0, goal.target - goal.current),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating reading goal:", error);
    return NextResponse.json(
      { error: "Failed to create reading goal" },
      { status: 500 }
    );
  }
}

// PUT - Update a reading goal
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, target, current, userId = DEFAULT_USER_ID } = body;

    if (!id) {
      return NextResponse.json({ error: "Goal ID is required" }, { status: 400 });
    }

    const goalId = parseInt(id, 10);

    // Verify goal exists and belongs to user
    const existingGoal = await prisma.readingGoal.findUnique({
      where: { id: goalId },
    });

    if (!existingGoal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    if (existingGoal.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const goal = await prisma.readingGoal.update({
      where: { id: goalId },
      data: {
        target: target ?? existingGoal.target,
        current: current ?? existingGoal.current,
      },
    });

    revalidatePath("/");
    revalidatePath("/bookshelf");

    return NextResponse.json({
      ...goal,
      progressPercent: goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0,
      isComplete: goal.current >= goal.target,
      remaining: Math.max(0, goal.target - goal.current),
    });
  } catch (error) {
    console.error("Error updating reading goal:", error);
    return NextResponse.json(
      { error: "Failed to update reading goal" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a reading goal
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId") || DEFAULT_USER_ID;

    if (!id) {
      return NextResponse.json({ error: "Goal ID is required" }, { status: 400 });
    }

    const goalId = parseInt(id, 10);

    // Verify goal exists and belongs to user
    const existingGoal = await prisma.readingGoal.findUnique({
      where: { id: goalId },
    });

    if (!existingGoal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    if (existingGoal.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.readingGoal.delete({
      where: { id: goalId },
    });

    revalidatePath("/");
    revalidatePath("/bookshelf");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting reading goal:", error);
    return NextResponse.json(
      { error: "Failed to delete reading goal" },
      { status: 500 }
    );
  }
}
