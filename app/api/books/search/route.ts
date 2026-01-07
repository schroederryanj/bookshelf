import { NextRequest, NextResponse } from "next/server";

type GoogleBooksVolume = {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    pageCount?: number;
    categories?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
  };
};

type BookSearchResult = {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  pages: number | null;
  genre: string | null;
  thumbnail: string | null;
  isbn: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: "Query must be at least 2 characters" },
        { status: 400 }
      );
    }

    // Build Google Books API URL
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    const url = new URL("https://www.googleapis.com/books/v1/volumes");
    url.searchParams.set("q", query);
    url.searchParams.set("maxResults", "10");
    if (apiKey) {
      url.searchParams.set("key", apiKey);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error("Google Books API error:", response.status);
      return NextResponse.json(
        { error: "Failed to search books" },
        { status: 500 }
      );
    }

    const data = await response.json();

    // Transform response to our format
    const results: BookSearchResult[] = (data.items || []).map(
      (item: GoogleBooksVolume) => {
        const info = item.volumeInfo;
        return {
          id: item.id,
          title: info.title,
          author: info.authors?.join(", ") || null,
          description: info.description || null,
          pages: info.pageCount || null,
          genre: info.categories?.[0] || null,
          thumbnail: info.imageLinks?.thumbnail?.replace("http://", "https://") || null,
          isbn:
            info.industryIdentifiers?.find((id) => id.type === "ISBN_13")
              ?.identifier ||
            info.industryIdentifiers?.find((id) => id.type === "ISBN_10")
              ?.identifier ||
            null,
        };
      }
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to search books" },
      { status: 500 }
    );
  }
}
