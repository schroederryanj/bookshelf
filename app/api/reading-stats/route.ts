import { NextRequest, NextResponse } from "next/server";
import { getReadingStats, calculateStreak, calculateMilestones } from "@/lib/reading-stats";

const DEFAULT_USER_ID = "default";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || DEFAULT_USER_ID;
    const type = searchParams.get("type"); // 'all', 'streak', 'milestones', or undefined for all

    switch (type) {
      case "streak": {
        const streak = await calculateStreak(userId);
        return NextResponse.json({ streak });
      }
      case "milestones": {
        const milestones = await calculateMilestones(userId);
        // Optionally filter to show only achieved or unachieved
        const filter = searchParams.get("filter");
        if (filter === "achieved") {
          return NextResponse.json({
            milestones: milestones.filter((m) => m.achieved),
          });
        }
        if (filter === "unachieved") {
          return NextResponse.json({
            milestones: milestones.filter((m) => !m.achieved),
          });
        }
        return NextResponse.json({ milestones });
      }
      default: {
        const stats = await getReadingStats(userId);
        return NextResponse.json(stats);
      }
    }
  } catch (error) {
    console.error("Error fetching reading stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch reading stats" },
      { status: 500 }
    );
  }
}
