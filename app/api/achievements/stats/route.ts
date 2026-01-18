import { NextRequest, NextResponse } from "next/server";
import { getAchievementStats } from "@/lib/achievements";

const DEFAULT_USER_ID = "default";

// GET - Get achievement statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || DEFAULT_USER_ID;

    const stats = await getAchievementStats(userId);

    // Calculate completion percentage per category
    const categoryProgress = stats.progressByCategory.map((cat) => ({
      ...cat,
      progressPercent:
        cat.total > 0 ? Math.round((cat.earned / cat.total) * 100) : 0,
    }));

    // Calculate tier progress
    const tierProgress = stats.tierBreakdown.map((tier) => ({
      ...tier,
      progressPercent:
        tier.total > 0 ? Math.round((tier.earned / tier.total) * 100) : 0,
    }));

    return NextResponse.json({
      totalAchievements: stats.totalAchievements,
      earnedAchievements: stats.earnedAchievements,
      remainingAchievements: stats.totalAchievements - stats.earnedAchievements,
      overallProgress:
        stats.totalAchievements > 0
          ? Math.round(
              (stats.earnedAchievements / stats.totalAchievements) * 100
            )
          : 0,
      points: {
        total: stats.totalPoints,
        earned: stats.earnedPoints,
        remaining: stats.totalPoints - stats.earnedPoints,
        progressPercent:
          stats.totalPoints > 0
            ? Math.round((stats.earnedPoints / stats.totalPoints) * 100)
            : 0,
      },
      progressByCategory: categoryProgress,
      tierBreakdown: tierProgress,
      recentAchievements: stats.recentAchievements.map((ua) => ({
        id: ua.achievement.id,
        name: ua.achievement.name,
        description: ua.achievement.description,
        icon: ua.achievement.icon,
        tier: ua.achievement.tier,
        category: ua.achievement.category,
        points: ua.achievement.points,
        earnedAt: ua.earnedAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching achievement stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch achievement stats" },
      { status: 500 }
    );
  }
}
