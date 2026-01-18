"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type FilterOptions = {
  genre?: string;
  rating?: "all" | "unrated" | "1" | "2" | "3" | "4" | "5";
  readStatus?: "all" | "reading" | "unread" | "finished";
};

type BookFiltersProps = {
  genres: string[];
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  bookCount?: number;
};

export function BookFilters({
  genres,
  filters,
  onFilterChange,
  bookCount = 0
}: BookFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleGenreChange = (genre: string) => {
    onFilterChange({
      ...filters,
      genre: genre === "all" ? undefined : genre
    });
  };

  const handleRatingChange = (rating: FilterOptions["rating"]) => {
    onFilterChange({
      ...filters,
      rating: rating === "all" ? undefined : rating
    });
  };

  const handleReadStatusChange = (status: FilterOptions["readStatus"]) => {
    onFilterChange({
      ...filters,
      readStatus: status === "all" ? undefined : status
    });
  };

  const handleClearFilters = () => {
    onFilterChange({
      genre: undefined,
      rating: undefined,
      readStatus: undefined,
    });
  };

  const hasActiveFilters = filters.genre || filters.rating || filters.readStatus;

  return (
    <div className="bg-white border border-[#e8dfd3] rounded-lg overflow-hidden shadow-sm">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-[#fef9ed] hover:bg-[#f5ecd9] transition-colors lg:cursor-default"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-[#8B6B4F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <h3 className="font-semibold text-[#3d2e1f]">Filters</h3>
          {bookCount > 0 && (
            <span className="text-xs bg-[#A07A55] text-white px-2 py-0.5 rounded-full">
              {bookCount}
            </span>
          )}
        </div>
        <svg
          className={cn(
            "w-5 h-5 text-[#6b5a4a] transition-transform lg:hidden",
            isExpanded && "rotate-180"
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Filter Content */}
      <div className={cn(
        "transition-all duration-200 overflow-hidden",
        isExpanded ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0 lg:max-h-[800px] lg:opacity-100"
      )}>
        <div className="p-4 space-y-4">
          {/* Genre Filter */}
          <div>
            <label className="block text-sm font-medium text-[#3d2e1f] mb-2">
              Genre
            </label>
            <select
              value={filters.genre || "all"}
              onChange={(e) => handleGenreChange(e.target.value)}
              className="w-full px-3 py-2 border border-[#e8dfd3] rounded-lg bg-white text-[#3d2e1f] focus:outline-none focus:ring-2 focus:ring-[#A07A55] focus:border-transparent"
            >
              <option value="all">All Genres</option>
              {genres.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
          </div>

          {/* Rating Filter */}
          <div>
            <label className="block text-sm font-medium text-[#3d2e1f] mb-2">
              Rating
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleRatingChange("all")}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  (!filters.rating || filters.rating === "all")
                    ? "bg-[#A07A55] text-white"
                    : "bg-[#fef9ed] text-[#6b5a4a] hover:bg-[#e8dfd3]"
                )}
              >
                All Ratings
              </button>
              <button
                onClick={() => handleRatingChange("unrated")}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  filters.rating === "unrated"
                    ? "bg-[#A07A55] text-white"
                    : "bg-[#fef9ed] text-[#6b5a4a] hover:bg-[#e8dfd3]"
                )}
              >
                Unrated
              </button>
              {[5, 4, 3, 2, 1].map((rating) => (
                <button
                  key={rating}
                  onClick={() => handleRatingChange(rating.toString() as FilterOptions["rating"])}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1",
                    filters.rating === rating.toString()
                      ? "bg-[#A07A55] text-white"
                      : "bg-[#fef9ed] text-[#6b5a4a] hover:bg-[#e8dfd3]"
                  )}
                >
                  {rating}
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          {/* Read Status Filter */}
          <div>
            <label className="block text-sm font-medium text-[#3d2e1f] mb-2">
              Read Status
            </label>
            <div className="space-y-2">
              {[
                { value: "all", label: "All Books", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
                { value: "reading", label: "Currently Reading", icon: "M12 6v6m0 0v6m0-6h6m-6 0H6" },
                { value: "unread", label: "Unread", icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" },
                { value: "finished", label: "Finished", icon: "M5 13l4 4L19 7" },
              ].map((status) => (
                <button
                  key={status.value}
                  onClick={() => handleReadStatusChange(status.value as FilterOptions["readStatus"])}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                    (!filters.readStatus && status.value === "all") || filters.readStatus === status.value
                      ? "bg-[#A07A55] text-white"
                      : "bg-[#fef9ed] text-[#6b5a4a] hover:bg-[#e8dfd3]"
                  )}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={status.icon} />
                  </svg>
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="w-full px-4 py-2 bg-[#fef9ed] text-[#8B6B4F] rounded-lg hover:bg-[#e8dfd3] transition-colors text-sm font-medium flex items-center justify-center gap-2 border border-[#e8dfd3]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear All Filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
