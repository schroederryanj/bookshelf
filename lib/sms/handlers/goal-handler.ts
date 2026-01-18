/**
 * Goal Progress Handler - Reading goal tracking
 *
 * Handles queries like:
 * - "How's my reading goal?"
 * - "Am I on track?"
 * - "Books needed to meet goal"
 * - "Goal progress"
 */

import { prisma } from "@/lib/prisma";
import {
  CommandHandler,
  errorResult,
  successResult,
  formatNumber,
} from "./types";

/**
 * Get current reading goal progress
 */
export const goalProgressHandler: CommandHandler = async (intent, context) => {
  try {
    const goalType = (intent.params.type as string)?.toUpperCase() || "BOOKS_PER_YEAR";

    // Get current period
    const now = new Date();
    const currentYear = now.getFullYear().toString();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const period = goalType === "BOOKS_PER_MONTH" ? currentMonth : currentYear;

    const goal = await prisma.readingGoal.findFirst({
      where: {
        userId: context.userId,
        goalType: goalType as "BOOKS_PER_YEAR" | "BOOKS_PER_MONTH" | "PAGES_PER_DAY",
        period,
      },
    });

    if (!goal) {
      return successResult(
        "No reading goal set. Ask me to set one!",
        { hasGoal: false }
      );
    }

    // Calculate actual progress
    let actual: number;

    if (goalType === "BOOKS_PER_YEAR") {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      actual = await prisma.readingProgress.count({
        where: {
          userId: context.userId,
          status: "COMPLETED",
          completedAt: { gte: startOfYear },
        },
      });
      // Also count directly-read books
      const directRead = await prisma.book.count({
        where: {
          read: "Read",
          dateFinished: { startsWith: currentYear },
        },
      });
      actual += directRead;
    } else if (goalType === "BOOKS_PER_MONTH") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      actual = await prisma.readingProgress.count({
        where: {
          userId: context.userId,
          status: "COMPLETED",
          completedAt: { gte: startOfMonth },
        },
      });
    } else {
      // PAGES_PER_DAY - get today's pages
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const result = await prisma.readingSession.aggregate({
        where: {
          userId: context.userId,
          startTime: { gte: today },
        },
        _sum: { pagesRead: true },
      });
      actual = result._sum.pagesRead || 0;
    }

    const percent = Math.round((actual / goal.target) * 100);
    const remaining = Math.max(0, goal.target - actual);

    // Build progress bar
    const filledBlocks = Math.min(10, Math.floor(percent / 10));
    const progressBar = "█".repeat(filledBlocks) + "░".repeat(10 - filledBlocks);

    const typeLabel = goalType === "BOOKS_PER_YEAR"
      ? "yearly"
      : goalType === "BOOKS_PER_MONTH"
        ? "monthly"
        : "daily";

    const lines = [
      `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} goal: ${actual}/${goal.target}`,
      `[${progressBar}] ${percent}%`,
      remaining > 0
        ? `${remaining} more to go!`
        : "Goal achieved! 🎉",
    ];

    return successResult(lines.join("\n"), {
      goalType,
      target: goal.target,
      actual,
      percent,
      remaining,
      achieved: actual >= goal.target,
    });
  } catch (error) {
    return errorResult("Sorry, couldn't fetch goal progress.", error);
  }
};

/**
 * Check if on track to meet goal
 */
export const onTrackHandler: CommandHandler = async (_intent, context) => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear().toString();

    // Get yearly goal
    const goal = await prisma.readingGoal.findFirst({
      where: {
        userId: context.userId,
        goalType: "BOOKS_PER_YEAR",
        period: currentYear,
      },
    });

    if (!goal) {
      return successResult("No yearly goal set. Set one to track progress!");
    }

    // Calculate actual books read this year
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const progressBooks = await prisma.readingProgress.count({
      where: {
        userId: context.userId,
        status: "COMPLETED",
        completedAt: { gte: startOfYear },
      },
    });
    const directBooks = await prisma.book.count({
      where: {
        read: "Read",
        dateFinished: { startsWith: currentYear },
      },
    });
    const actual = progressBooks + directBooks;

    // Calculate expected progress
    const dayOfYear = Math.floor(
      (now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
    const daysInYear = 365;
    const expectedBooks = (goal.target / daysInYear) * dayOfYear;
    const expectedRounded = Math.round(expectedBooks * 10) / 10;

    const difference = actual - expectedBooks;
    const isOnTrack = difference >= 0;

    let message: string;
    if (isOnTrack) {
      if (difference >= 5) {
        message = `Way ahead! ${actual} read vs ${expectedRounded} expected. Keep it up!`;
      } else if (difference >= 1) {
        message = `On track! ${actual} read (${Math.round(difference)} ahead of pace).`;
      } else {
        message = `Right on track! ${actual}/${goal.target} books this year.`;
      }
    } else {
      const behind = Math.abs(Math.round(difference));
      if (behind >= 5) {
        message = `${behind} books behind pace. ${actual} read, expected ~${expectedRounded}. You can catch up!`;
      } else {
        message = `Slightly behind: ${actual} read vs ${expectedRounded} expected. Almost there!`;
      }
    }

    // Calculate books needed per remaining time
    const daysRemaining = daysInYear - dayOfYear;
    const booksRemaining = goal.target - actual;
    const booksPerWeek = daysRemaining > 0
      ? Math.round((booksRemaining / daysRemaining) * 7 * 10) / 10
      : 0;

    if (booksRemaining > 0 && daysRemaining > 0) {
      message += `\nNeed ${booksPerWeek} books/week to hit goal.`;
    }

    return successResult(message, {
      target: goal.target,
      actual,
      expected: expectedRounded,
      difference: Math.round(difference * 10) / 10,
      isOnTrack,
      booksRemaining,
      daysRemaining,
    });
  } catch (error) {
    return errorResult("Sorry, couldn't check if on track.", error);
  }
};

/**
 * Calculate books needed to meet goal
 */
export const booksNeededHandler: CommandHandler = async (_intent, context) => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear().toString();

    const goal = await prisma.readingGoal.findFirst({
      where: {
        userId: context.userId,
        goalType: "BOOKS_PER_YEAR",
        period: currentYear,
      },
    });

    if (!goal) {
      return successResult("No yearly goal set.");
    }

    // Get actual count
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const progressBooks = await prisma.readingProgress.count({
      where: {
        userId: context.userId,
        status: "COMPLETED",
        completedAt: { gte: startOfYear },
      },
    });
    const directBooks = await prisma.book.count({
      where: {
        read: "Read",
        dateFinished: { startsWith: currentYear },
      },
    });
    const actual = progressBooks + directBooks;

    const remaining = Math.max(0, goal.target - actual);

    if (remaining === 0) {
      return successResult(
        `Goal complete! You've read ${actual}/${goal.target} books. 🎉`,
        { complete: true, actual, target: goal.target }
      );
    }

    // Calculate time remaining
    const endOfYear = new Date(now.getFullYear(), 11, 31);
    const daysRemaining = Math.max(1, Math.ceil(
      (endOfYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    ));
    const weeksRemaining = Math.ceil(daysRemaining / 7);
    const monthsRemaining = Math.ceil(daysRemaining / 30);

    const booksPerWeek = Math.ceil((remaining / weeksRemaining) * 10) / 10;
    const booksPerMonth = Math.ceil((remaining / monthsRemaining) * 10) / 10;

    const lines = [
      `Need ${remaining} more books for ${currentYear} goal`,
      `That's ${booksPerMonth} books/month or ${booksPerWeek}/week`,
      `${daysRemaining} days left in the year`,
    ];

    return successResult(lines.join("\n"), {
      remaining,
      daysRemaining,
      booksPerWeek,
      booksPerMonth,
      target: goal.target,
      actual,
    });
  } catch (error) {
    return errorResult("Sorry, couldn't calculate books needed.", error);
  }
};

/**
 * Get all active goals summary
 */
export const allGoalsHandler: CommandHandler = async (_intent, context) => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear().toString();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const goals = await prisma.readingGoal.findMany({
      where: {
        userId: context.userId,
        OR: [
          { period: currentYear },
          { period: currentMonth },
        ],
      },
    });

    if (goals.length === 0) {
      return successResult("No active goals. Set a reading goal to track progress!");
    }

    const lines = ["Active goals:"];

    for (const goal of goals) {
      let actual = 0;
      let label: string;

      if (goal.goalType === "BOOKS_PER_YEAR") {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        actual = await prisma.readingProgress.count({
          where: {
            userId: context.userId,
            status: "COMPLETED",
            completedAt: { gte: startOfYear },
          },
        });
        label = `Yearly: ${actual}/${goal.target} books`;
      } else if (goal.goalType === "BOOKS_PER_MONTH") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        actual = await prisma.readingProgress.count({
          where: {
            userId: context.userId,
            status: "COMPLETED",
            completedAt: { gte: startOfMonth },
          },
        });
        label = `Monthly: ${actual}/${goal.target} books`;
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const result = await prisma.readingSession.aggregate({
          where: {
            userId: context.userId,
            startTime: { gte: today },
          },
          _sum: { pagesRead: true },
        });
        actual = result._sum.pagesRead || 0;
        label = `Daily: ${formatNumber(actual)}/${formatNumber(goal.target)} pages`;
      }

      const pct = Math.round((actual / goal.target) * 100);
      lines.push(`• ${label} (${pct}%)`);
    }

    return successResult(lines.join("\n"), {
      goalCount: goals.length,
    });
  } catch (error) {
    return errorResult("Sorry, couldn't fetch goals.", error);
  }
};
