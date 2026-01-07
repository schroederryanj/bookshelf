import { writeFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const validTypes = ["image/webp", "image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: WebP, PNG, JPG" },
        { status: 400 }
      );
    }

    // Generate filename from title or use original filename
    const sanitizedTitle = title
      ? title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_")
      : file.name.replace(/\.[^/.]+$/, "");
    const extension = file.name.split(".").pop() || "webp";
    const filename = `${sanitizedTitle}.${extension}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const filepath = path.join(process.cwd(), "public", "books", filename);
    await writeFile(filepath, buffer);

    return NextResponse.json({ path: `books/${filename}` });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
