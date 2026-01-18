/**
 * API endpoint to send welcome SMS to admin phone numbers
 */

import { NextRequest, NextResponse } from "next/server";
import { sendSMS, normalizePhoneNumber } from "@/lib/sms/twilio-service";
import { prisma } from "@/lib/prisma";

const WELCOME_MESSAGE = `Welcome to Bookshelf SMS Assistant!

You can manage your reading via text:

📖 Progress: "page 150" or "50%"
▶️ Start: "start [book title]"
✅ Finish: "finished [book]"
🔍 Search: "find Harry Potter"
📚 History: "What Sanderson books have I read?"
💡 Suggest: "recommend fantasy"
📊 Status: "what am I reading?"
📈 Stats: "my stats"
❓ Help: "help"

Just text naturally - I understand questions like "have I read any sci-fi?" too!`;

export async function POST(request: NextRequest) {
  try {
    // Get admin phone numbers from settings
    const setting = await prisma.setting.findUnique({
      where: { key: "adminPhoneNumbers" },
    });

    if (!setting || !setting.value.trim()) {
      return NextResponse.json(
        { error: "No admin phone numbers configured" },
        { status: 400 }
      );
    }

    // Parse comma-separated phone numbers
    const phoneNumbers = setting.value
      .split(",")
      .map((num) => num.trim())
      .filter((num) => num.length > 0)
      .map((num) => normalizePhoneNumber(num));

    if (phoneNumbers.length === 0) {
      return NextResponse.json(
        { error: "No valid phone numbers found" },
        { status: 400 }
      );
    }

    // Send welcome SMS to each phone number
    const results = await Promise.allSettled(
      phoneNumbers.map((phone) => sendSMS(phone, WELCOME_MESSAGE))
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({
      success: true,
      message: `Sent welcome SMS to ${successful} number(s)${failed > 0 ? `, ${failed} failed` : ""}`,
      sent: successful,
      failed,
    });
  } catch (error) {
    console.error("Error sending welcome SMS:", error);
    return NextResponse.json(
      { error: "Failed to send welcome SMS" },
      { status: 500 }
    );
  }
}
