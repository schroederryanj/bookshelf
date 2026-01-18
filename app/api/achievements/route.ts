import { NextRequest, NextResponse } from "next/server";
import {
  getAllAchievements,
  getAchievementsByCategory,
  AchievementCategory,
} from "@/lib/achievements";

const DEFAULT_USER_ID = "default";

// GET - List all achievements with user progress
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || DEFAULT_USER_ID;
    const groupBy = searchParams.get("groupBy"); // 'category' or undefined
    const category = searchParams.get("category") as AchievementCategory | null;
    const earned = searchParams.get("earned"); // 'true', 'false', or undefined

    if (groupBy === "category") {
      // Return achievements grouped by category
      const grouped = await getAchievementsByCategory(userId);

      // Filter by specific category if provided
      if (category && Object.values(AchievementCategory).includes(category)) {
        return NextResponse.json({
          achievements: {
            [category]: grouped[category],
          },
          categories: [category],
        });
      }

      return NextResponse.json({
        achievements: grouped,
        categories: Object.values(AchievementCategory),
      });
    }

    // Get flat list of achievements
    let achievements = await getAllAchievements(userId);

    // Filter by category if provided
    if (category && Object.values(AchievementCategory).includes(category)) {
      achievements = achievements.filter((a) => a.category === category);
    }

    // Filter by earned status
    if (earned === "true") {
      achievements = achievements.filter((a) => a.userProgress?.isComplete);
    } else if (earned === "false") {
      achievements = achievements.filter((a) => !a.userProgress?.isComplete);
    }

    // Calculate summary stats
    const total = achievements.length;
    const earnedCount = achievements.filter(
      (a) => a.userProgress?.isComplete
    ).length;
    const totalPoints = achievements.reduce((sum, a) => sum + a.points, 0);
    const earnedPoints = achievements
      .filter((a) => a.userProgress?.isComplete)
      .reduce((sum, a) => sum + a.points, 0);

    return NextResponse.json({
      achievements,
      summary: {
        total,
        earned: earnedCount,
        remaining: total - earnedCount,
        totalPoints,
        earnedPoints,
        progressPercent:
          total > 0 ? Math.round((earnedCount / total) * 100) : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching achievements:", error);
    return NextResponse.json(
      { error: "Failed to fetch achievements" },
      { status: 500 }
    );
  }
}
