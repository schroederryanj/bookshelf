"use client";

import { useRef, useState, useEffect } from "react";
import { Book } from "@/data/types";
import { RecommendationCard } from "./RecommendationCard";

interface RecommendationSectionProps {
  title: string;
  subtitle?: string;
  books: Book[];
  matchReasons?: Record<number, string>;
  matchScores?: Record<number, number>;
  isLoading?: boolean;
  onBookClick?: (book: Book) => void;
  seeMoreHref?: string;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
}

function RecommendationSkeleton() {
  return (
    <div
      className="shrink-0 rounded-lg overflow-hidden animate-pulse"
      style={{
        width: "180px",
        background: "linear-gradient(135deg, #fef9ed 0%, #f5ebe0 100%)",
        border: "2px solid #c4a77d",
      }}
    >
      {/* Cover skeleton */}
      <div className="aspect-[2/3] bg-[#d4c4b0]" />
      {/* Content skeleton */}
      <div className="p-3 space-y-2">
        <div className="h-4 bg-[#d4c4b0] rounded w-full" />
        <div className="h-4 bg-[#d4c4b0] rounded w-2/3" />
        <div className="h-3 bg-[#d4c4b0] rounded w-1/2" />
      </div>
    </div>
  );
}

export function RecommendationSection({
  title,
  subtitle,
  books,
  matchReasons,
  matchScores,
  isLoading = false,
  onBookClick,
  seeMoreHref,
  emptyMessage = "No recommendations available",
  emptyIcon,
}: RecommendationSectionProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollability = () => {
    const container = scrollContainerRef.current;
    if (container) {
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(
        container.scrollLeft < container.scrollWidth - container.clientWidth - 5
      );
    }
  };

  useEffect(() => {
    checkScrollability();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", checkScrollability);
      window.addEventListener("resize", checkScrollability);
      return () => {
        container.removeEventListener("scroll", checkScrollability);
        window.removeEventListener("resize", checkScrollability);
      };
    }
  }, [books, isLoading]);

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = 400;
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Empty state
  if (!isLoading && books.length === 0) {
    return (
      <div
        className="w-full rounded-lg overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #fef9ed 0%, #f5ebe0 100%)",
          border: "2px solid #c4a77d",
          fontFamily: "'Georgia', serif",
        }}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-3">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-xl font-semibold text-[#3d2e1f]">{title}</h2>
          </div>
          {subtitle && (
            <p className="text-sm text-[#6b5a4a] italic">{subtitle}</p>
          )}
        </div>

        {/* Empty Content */}
        <div className="px-6 pb-8 text-center">
          <div className="py-8">
            {emptyIcon || (
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
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            )}
            <p className="text-[#6b5a4a]">{emptyMessage}</p>
          </div>
        </div>

        {/* Footer decoration */}
        <div className="h-1.5 bg-gradient-to-r from-[#A07A55] via-[#c4a77d] to-[#A07A55]" />
      </div>
    );
  }

  return (
    <div
      className="w-full rounded-lg overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #fef9ed 0%, #f5ebe0 100%)",
        border: "2px solid #c4a77d",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        fontFamily: "'Georgia', serif",
      }}
    >
      {/* Header */}
      <div className="px-6 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <svg
                className="w-5 h-5 text-[#8B6B4F]"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <h2 className="text-xl font-semibold text-[#3d2e1f]">{title}</h2>
            </div>
            {subtitle && (
              <p className="text-sm text-[#6b5a4a] italic">{subtitle}</p>
            )}
          </div>

          {seeMoreHref && (
            <a
              href={seeMoreHref}
              className="text-sm text-[#8b5a2b] hover:text-[#a67c52] font-medium transition-colors flex items-center gap-1"
            >
              See all
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </a>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-[#c4a77d] to-transparent" />
      </div>

      {/* Scrollable Content */}
      <div className="relative py-5">
        {/* Left Scroll Button */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
            style={{
              background: "linear-gradient(135deg, #fef9ed 0%, #f5ebe0 100%)",
              border: "2px solid #A07A55",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            }}
          >
            <svg
              className="w-5 h-5 text-[#3d2e1f]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        )}

        {/* Right Scroll Button */}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
            style={{
              background: "linear-gradient(135deg, #fef9ed 0%, #f5ebe0 100%)",
              border: "2px solid #A07A55",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            }}
          >
            <svg
              className="w-5 h-5 text-[#3d2e1f]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        )}

        {/* Scroll Container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 px-6 overflow-x-auto scrollbar-hide"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {isLoading
            ? // Loading skeletons
              Array.from({ length: 5 }).map((_, i) => (
                <RecommendationSkeleton key={i} />
              ))
            : // Actual books
              books.map((book) => (
                <RecommendationCard
                  key={book.id || book.title}
                  book={book}
                  matchReason={book.id ? matchReasons?.[book.id] : undefined}
                  matchScore={book.id ? matchScores?.[book.id] : undefined}
                  onClick={onBookClick}
                />
              ))}
        </div>

        {/* Fade edges for scroll indication */}
        {canScrollLeft && (
          <div
            className="absolute left-0 top-0 bottom-0 w-12 pointer-events-none"
            style={{
              background:
                "linear-gradient(to right, #f5ebe0 0%, transparent 100%)",
            }}
          />
        )}
        {canScrollRight && (
          <div
            className="absolute right-0 top-0 bottom-0 w-12 pointer-events-none"
            style={{
              background:
                "linear-gradient(to left, #f5ebe0 0%, transparent 100%)",
            }}
          />
        )}
      </div>

      {/* Footer decoration */}
      <div className="h-1.5 bg-gradient-to-r from-[#A07A55] via-[#c4a77d] to-[#A07A55]" />
    </div>
  );
}
