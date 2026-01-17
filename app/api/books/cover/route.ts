import { writeFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, title } = body;

    if (!imageUrl || !title) {
      return NextResponse.json(
        { error: "imageUrl and title are required" },
        { status: 400 }
      );
    }

    // Fetch the image from Google Books
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch image" },
        { status: 500 }
      );
    }

    const buffer = Buffer.from(await imageResponse.arrayBuffer());

    // Generate filename from title
    const sanitizedTitle = title
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 100); // Limit length

    // Google Books returns JPEG images
    const filename = `${sanitizedTitle}.jpg`;

    const filepath = path.join(process.cwd(), "public", "books", filename);
    await writeFile(filepath, buffer);

    return NextResponse.json({ path: `books/${filename}` });
  } catch (error) {
    console.error("Error downloading cover:", error);
    return NextResponse.json(
      { error: "Failed to download cover" },
      { status: 500 }
    );
  }
}
