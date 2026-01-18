"use client";

import { useState } from "react";
import { Book } from "@/data/types";
import { StarRating } from "@/components/ui/StarRating";

interface RecommendationCardProps {
  book: Book;
  matchReason?: string;
  matchScore?: number;
  onClick?: (book: Book) => void;
}

export function RecommendationCard({
  book,
  matchReason,
  matchScore,
  onClick,
}: RecommendationCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative shrink-0 cursor-pointer transition-all duration-300 ease-out"
      style={{
        width: "180px",
        fontFamily: "'Georgia', serif",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick?.(book)}
    >
      {/* Card Container */}
      <div
        className="rounded-lg overflow-hidden transition-all duration-300"
        style={{
          background: "linear-gradient(135deg, #fef9ed 0%, #f5ebe0 100%)",
          border: "2px solid #c4a77d",
          boxShadow: isHovered
            ? "0 12px 28px rgba(0,0,0,0.25), 0 8px 10px rgba(0,0,0,0.15)"
            : "0 4px 12px rgba(0,0,0,0.1)",
          transform: isHovered ? "translateY(-8px)" : "translateY(0)",
        }}
      >
        {/* Book Cover */}
        <div className="relative aspect-[2/3] overflow-hidden bg-[#e8ddd0]">
          <img
            src={book.img}
            alt={book.title}
            className="w-full h-full object-cover transition-transform duration-300"
            style={{
              transform: isHovered ? "scale(1.05)" : "scale(1)",
            }}
          />

          {/* Match Score Badge */}
          {matchScore !== undefined && matchScore > 0 && (
            <div
              className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold"
              style={{
                background: "rgba(45, 90, 39, 0.9)",
                color: "white",
                backdropFilter: "blur(4px)",
              }}
            >
              {Math.round(matchScore * 100)}% match
            </div>
          )}

          {/* Hover Overlay with Details */}
          <div
            className="absolute inset-0 flex flex-col justify-end p-3 transition-opacity duration-300"
            style={{
              background:
                "linear-gradient(to top, rgba(61, 46, 31, 0.95) 0%, rgba(61, 46, 31, 0.7) 50%, transparent 100%)",
              opacity: isHovered ? 1 : 0,
            }}
          >
            {/* Genre Badges */}
            {book.genre && (
              <div className="flex flex-wrap gap-1 mb-2">
                {book.genre
                  .split(",")
                  .slice(0, 2)
                  .map((g, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{
                        background: "rgba(160, 122, 85, 0.8)",
                        color: "#fef9ed",
                      }}
                    >
                      {g.trim()}
                    </span>
                  ))}
              </div>
            )}

            {/* Rating */}
            {book.ratingOverall && (
              <div className="flex items-center gap-1 mb-1">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`w-3 h-3 ${
                        star <= Math.round(book.ratingOverall!)
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-[#8B6B4F]/50"
                      }`}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                      />
                    </svg>
                  ))}
                </div>
                <span className="text-xs text-[#fef9ed]/80">
                  {book.ratingOverall.toFixed(1)}
                </span>
              </div>
            )}

            {/* Pages */}
            {book.pages && (
              <span className="text-xs text-[#fef9ed]/70">
                {book.pages} pages
              </span>
            )}
          </div>
        </div>

        {/* Book Info */}
        <div className="p-3">
          <h4
            className="font-semibold text-[#3d2e1f] leading-tight line-clamp-2 mb-1"
            style={{ fontSize: "0.875rem" }}
          >
            {book.title}
          </h4>

          {book.author && (
            <p className="text-xs text-[#6b5a4a] italic truncate">
              {book.author}
            </p>
          )}

          {/* Match Reason */}
          {matchReason && (
            <p
              className="text-xs text-[#8b5a2b] mt-2 line-clamp-2"
              style={{ fontSize: "0.7rem" }}
            >
              {matchReason}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
