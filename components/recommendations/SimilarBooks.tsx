"use client";

import { useState, useEffect } from "react";
import { Book } from "@/data/types";
import { RecommendationSection } from "./RecommendationSection";

interface SimilarBooksResponse {
  sourceBook: {
    id: number;
    title: string;
    author: string | null;
    genre: string | null;
  };
  recommendations: Book[];
  source: string;
}

interface SimilarBooksProps {
  bookId: number;
  bookTitle?: string;
  onBookClick?: (book: Book) => void;
  maxResults?: number;
}

export function SimilarBooks({
  bookId,
  bookTitle,
  onBookClick,
  maxResults = 10,
}: SimilarBooksProps) {
  const [data, setData] = useState<SimilarBooksResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSimilarBooks = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/recommendations/similar/${bookId}?limit=${maxResults}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            setError("Book not found");
          } else {
            throw new Error("Failed to fetch recommendations");
          }
          return;
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error("Error fetching similar books:", err);
        setError("Failed to load recommendations");
      } finally {
        setIsLoading(false);
      }
    };

    if (bookId) {
      fetchSimilarBooks();
    }
  }, [bookId, maxResults]);

  // Build the title
  const sectionTitle = bookTitle
    ? `Similar to "${bookTitle}"`
    : data?.sourceBook?.title
    ? `Similar to "${data.sourceBook.title}"`
    : "Similar Books";

  // The API returns books directly in recommendations array
  const books = data?.recommendations || [];

  if (error) {
    return (
      <div
        className="w-full rounded-lg overflow-hidden p-6"
        style={{
          background: "linear-gradient(135deg, #fef9ed 0%, #f5ebe0 100%)",
          border: "2px solid #c4a77d",
          fontFamily: "'Georgia', serif",
        }}
      >
        <div className="text-center py-4">
          <svg
            className="w-12 h-12 mx-auto text-[#d4c4b0] mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <p className="text-[#6b5a4a]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <RecommendationSection
      title={sectionTitle}
      subtitle="Books with similar themes, genres, or style"
      books={books}
      isLoading={isLoading}
      onBookClick={onBookClick}
      emptyMessage="No similar books found"
      emptyIcon={
        <svg
          className="w-16 h-16 mx-auto text-[#d4c4b0] mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
          />
        </svg>
      }
    />
  );
}
