"use client";

import { useState, useEffect } from "react";
import { Book } from "@/data/types";
import { RecommendationSection } from "./RecommendationSection";

interface RecommendationResult {
  book: Book;
  score: number;
  reason: string;
  basedOn?: string[]; // Titles of books this recommendation is based on
}

interface PersonalRecommendationsResponse {
  recommendations: RecommendationResult[];
  basedOnFavorites: Book[];
  message?: string;
}

interface PersonalRecommendationsProps {
  onBookClick?: (book: Book) => void;
  maxResults?: number;
  minRating?: number;
}

export function PersonalRecommendations({
  onBookClick,
  maxResults = 10,
  minRating = 4,
}: PersonalRecommendationsProps) {
  const [data, setData] = useState<PersonalRecommendationsResponse | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/recommendations/favorites?limit=${maxResults}&minRating=${minRating}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch recommendations");
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error("Error fetching personal recommendations:", err);
        setError("Failed to load recommendations");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [maxResults, minRating]);

  // Transform data for the section component
  const books = data?.recommendations.map((r) => r.book) || [];
  const matchReasons: Record<number, string> = {};
  const matchScores: Record<number, number> = {};

  data?.recommendations.forEach((rec) => {
    if (rec.book.id) {
      // Include "based on" info in the reason if available
      let reason = rec.reason;
      if (rec.basedOn && rec.basedOn.length > 0) {
        const basedOnText =
          rec.basedOn.length === 1
            ? `Based on "${rec.basedOn[0]}"`
            : `Based on ${rec.basedOn.length} of your favorites`;
        reason = `${basedOnText}. ${reason}`;
      }
      matchReasons[rec.book.id] = reason;
      matchScores[rec.book.id] = rec.score;
    }
  });

  // Build subtitle based on favorites count
  const favoritesCount = data?.basedOnFavorites?.length || 0;
  const subtitle =
    favoritesCount > 0
      ? `Based on ${favoritesCount} book${favoritesCount !== 1 ? "s" : ""} you rated highly`
      : "Rate some books to get personalized recommendations";

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
      title="Recommended for You"
      subtitle={subtitle}
      books={books}
      matchReasons={matchReasons}
      matchScores={matchScores}
      isLoading={isLoading}
      onBookClick={onBookClick}
      emptyMessage="Rate some books to get personalized recommendations"
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
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
          />
        </svg>
      }
    />
  );
}

// Separate component for showing what the recommendations are based on
export function FavoritesBasedOnSection({
  favorites,
}: {
  favorites: Book[];
}) {
  if (favorites.length === 0) return null;

  return (
    <div
      className="w-full rounded-lg overflow-hidden mb-4"
      style={{
        background: "linear-gradient(135deg, #fef9ed 0%, #f5ebe0 100%)",
        border: "2px solid #c4a77d",
        fontFamily: "'Georgia', serif",
      }}
    >
      <div className="px-6 py-4">
        <h3 className="text-sm font-semibold text-[#3d2e1f] mb-3 flex items-center gap-2">
          <svg
            className="w-4 h-4 text-[#8B6B4F]"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          Based on your favorites
        </h3>

        <div className="flex flex-wrap gap-2">
          {favorites.slice(0, 5).map((book) => (
            <div
              key={book.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{
                background: "rgba(160, 122, 85, 0.15)",
                border: "1px solid #c4a77d",
              }}
            >
              <img
                src={book.img}
                alt={book.title}
                className="w-5 h-7 object-cover rounded"
              />
              <span className="text-xs text-[#3d2e1f] font-medium truncate max-w-[150px]">
                {book.title}
              </span>
              {book.ratingOverall && (
                <span className="text-xs text-[#8b5a2b]">
                  {book.ratingOverall.toFixed(1)}
                </span>
              )}
            </div>
          ))}
          {favorites.length > 5 && (
            <span className="text-xs text-[#6b5a4a] self-center">
              +{favorites.length - 5} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
