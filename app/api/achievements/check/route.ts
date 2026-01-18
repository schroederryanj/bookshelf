import { NextRequest, NextResponse } from "next/server";
import { checkAndAwardAchievements } from "@/lib/achievements";
import { revalidatePath } from "next/cache";

const DEFAULT_USER_ID = "default";

// POST - Check and award newly earned achievements
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const userId = body.userId || DEFAULT_USER_ID;

    // Check and award any newly earned achievements
    const newlyEarned = await checkAndAwardAchievements(userId);

    // Revalidate relevant paths if achievements were earned
    if (newlyEarned.length > 0) {
      revalidatePath("/");
      revalidatePath("/bookshelf");
      revalidatePath("/achievements");
    }

    return NextResponse.json({
      success: true,
      newlyEarned: newlyEarned.map((item) => ({
        id: item.achievement.id,
        name: item.achievement.name,
        description: item.achievement.description,
        icon: item.achievement.icon,
        tier: item.achievement.tier,
        category: item.achievement.category,
        points: item.achievement.points,
        earnedAt: item.earnedAt,
        previousProgress: item.previousProgress,
      })),
      count: newlyEarned.length,
      message:
        newlyEarned.length > 0
          ? `Congratulations! You earned ${newlyEarned.length} new achievement${newlyEarned.length > 1 ? "s" : ""}!`
          : "No new achievements earned.",
    });
  } catch (error) {
    console.error("Error checking achievements:", error);
    return NextResponse.json(
      { error: "Failed to check achievements" },
      { status: 500 }
    );
  }
}
