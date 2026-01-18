import { NextRequest, NextResponse } from "next/server";
import { seedDefaultAchievements } from "@/lib/achievements";

// POST - Seed default achievements (admin operation)
export async function POST(request: NextRequest) {
  try {
    // Check for admin authorization (simple header check for now)
    const authHeader = request.headers.get("x-admin-key");

    // Allow seeding in development or with admin key
    const isDevelopment = process.env.NODE_ENV === "development";
    const hasAdminKey = authHeader === process.env.ADMIN_KEY;

    if (!isDevelopment && !hasAdminKey) {
      return NextResponse.json(
        { error: "Unauthorized - admin access required" },
        { status: 401 }
      );
    }

    const count = await seedDefaultAchievements();

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${count} achievements`,
      count,
    });
  } catch (error) {
    console.error("Error seeding achievements:", error);
    return NextResponse.json(
      { error: "Failed to seed achievements" },
      { status: 500 }
    );
  }
}
