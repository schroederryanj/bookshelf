"use client";

import { useState, useEffect, useCallback } from "react";
import { FilterState, SortField, SortOrder } from "./BookshelfClient";

interface BookshelfFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  genres: string[];
  totalBooks: number;
  filteredCount: number;
}

export function BookshelfFilters({
  filters,
  onFiltersChange,
  genres,
  totalBooks,
  filteredCount,
}: BookshelfFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.searchQuery);
  const [isExpanded, setIsExpanded] = useState(false);

  // Debounced search - 300ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      onFiltersChange({ ...filters, searchQuery: searchInput });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const updateFilter = useCallback(<K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  }, [filters, onFiltersChange]);

  const hasActiveFilters =
    filters.searchQuery !== "" ||
    filters.selectedGenre !== "All" ||
    filters.readStatus !== "All" ||
    filters.minRating > 0;

  const clearAllFilters = useCallback(() => {
    setSearchInput("");
    onFiltersChange({
      searchQuery: "",
      selectedGenre: "All",
      readStatus: "All",
      minRating: 0,
      sortField: "title",
      sortOrder: "asc",
    });
  }, [onFiltersChange]);

  const activeFilterCount = [
    filters.selectedGenre !== "All",
    filters.readStatus !== "All",
    filters.minRating > 0,
    filters.searchQuery !== "",
  ].filter(Boolean).length;

  return (
    <div className="w-full flex justify-center mb-4">
      <div
        className="max-w-5xl w-full mx-4"
        style={{ fontFamily: "'Georgia', serif" }}
      >
        {/* Compact Search Bar - Always Visible */}
        <div className="relative">
          <div
            className="flex items-center gap-3 px-4 py-2.5 rounded-sm border-2 border-[#d4c4b0] hover:border-[#A07A55] transition-colors"
            style={{
              background: "linear-gradient(135deg, #fef9ed 0%, #f5ebe0 100%)",
            }}
          >
            {/* Search Icon */}
            <svg
              className="w-4 h-4 text-[#8B6B4F] shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Search titles, authors, descriptions..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1 bg-transparent text-[#3d2e1f] placeholder-[#8B6B4F]/60 focus:outline-none text-sm"
              style={{ fontFamily: "'Georgia', serif" }}
            />

            {/* Clear Search */}
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                className="p-1 text-[#8B6B4F] hover:text-[#3d2e1f] transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            {/* Divider */}
            <div className="w-px h-5 bg-[#d4c4b0]" />

            {/* Filter Toggle */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-sm transition-colors ${
                isExpanded || hasActiveFilters
                  ? "text-[#8b5a2b] bg-[#A07A55]/10"
                  : "text-[#6b5a4a] hover:text-[#3d2e1f]"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 flex items-center justify-center text-[10px] font-bold bg-[#8b5a2b] text-white rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Results Count */}
            {filteredCount !== totalBooks && (
              <>
                <div className="w-px h-5 bg-[#d4c4b0]" />
                <span className="text-xs text-[#6b5a4a] whitespace-nowrap">
                  {filteredCount} of {totalBooks}
                </span>
              </>
            )}
          </div>

          {/* Expanded Filters Panel */}
          {isExpanded && (
            <div
              className="mt-2 p-4 rounded-sm border-2 border-[#d4c4b0]"
              style={{
                background: "linear-gradient(135deg, #fef9ed 0%, #f5ebe0 100%)",
              }}
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                {/* Genre Filter */}
                <div>
                  <label className="block text-[10px] text-[#6b5a4a] uppercase tracking-wider mb-1.5">
                    Genre
                  </label>
                  <select
                    value={filters.selectedGenre}
                    onChange={(e) => updateFilter('selectedGenre', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm text-[#3d2e1f] bg-white/60 border border-[#d4c4b0] rounded-sm focus:outline-none focus:border-[#A07A55] transition-colors"
                    style={{ fontFamily: "'Georgia', serif" }}
                  >
                    <option value="All">All Genres</option>
                    {genres.map((genre) => (
                      <option key={genre} value={genre}>
                        {genre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-[10px] text-[#6b5a4a] uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <select
                    value={filters.readStatus}
                    onChange={(e) => updateFilter('readStatus', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm text-[#3d2e1f] bg-white/60 border border-[#d4c4b0] rounded-sm focus:outline-none focus:border-[#A07A55] transition-colors"
                    style={{ fontFamily: "'Georgia', serif" }}
                  >
                    <option value="All">All Books</option>
                    <option value="Reading">Reading</option>
                    <option value="Unread">Unread</option>
                    <option value="Read">Finished</option>
                  </select>
                </div>

                {/* Rating Filter */}
                <div>
                  <label className="block text-[10px] text-[#6b5a4a] uppercase tracking-wider mb-1.5">
                    Min Rating
                  </label>
                  <div className="flex items-center gap-0.5 px-2.5 py-1.5 bg-white/60 border border-[#d4c4b0] rounded-sm">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => updateFilter('minRating', filters.minRating === star ? 0 : star)}
                        className="p-0.5 transition-colors"
                      >
                        <svg
                          className={`w-4 h-4 ${
                            star <= filters.minRating
                              ? "text-yellow-500 fill-yellow-500"
                              : "text-[#d4c4b0] hover:text-[#c4a77d]"
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
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-[10px] text-[#6b5a4a] uppercase tracking-wider mb-1.5">
                    Sort By
                  </label>
                  <select
                    value={filters.sortField}
                    onChange={(e) => updateFilter('sortField', e.target.value as SortField)}
                    className="w-full px-2.5 py-1.5 text-sm text-[#3d2e1f] bg-white/60 border border-[#d4c4b0] rounded-sm focus:outline-none focus:border-[#A07A55] transition-colors"
                    style={{ fontFamily: "'Georgia', serif" }}
                  >
                    <option value="title">Title</option>
                    <option value="author">Author</option>
                    <option value="rating">Rating</option>
                    <option value="dateFinished">Date Finished</option>
                  </select>
                </div>

                {/* Sort Order */}
                <div>
                  <label className="block text-[10px] text-[#6b5a4a] uppercase tracking-wider mb-1.5">
                    Order
                  </label>
                  <div className="flex gap-1">
                    <button
                      onClick={() => updateFilter('sortOrder', 'asc')}
                      className={`flex-1 px-2.5 py-1.5 border rounded-sm text-xs transition-colors ${
                        filters.sortOrder === 'asc'
                          ? 'bg-[#A07A55]/20 border-[#A07A55] text-[#3d2e1f]'
                          : 'bg-white/60 border-[#d4c4b0] text-[#6b5a4a] hover:border-[#A07A55]'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => updateFilter('sortOrder', 'desc')}
                      className={`flex-1 px-2.5 py-1.5 border rounded-sm text-xs transition-colors ${
                        filters.sortOrder === 'desc'
                          ? 'bg-[#A07A55]/20 border-[#A07A55] text-[#3d2e1f]'
                          : 'bg-white/60 border-[#d4c4b0] text-[#6b5a4a] hover:border-[#A07A55]'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Clear All Button */}
              {hasActiveFilters && (
                <div className="mt-3 pt-3 border-t border-[#d4c4b0]/50 flex justify-end">
                  <button
                    onClick={clearAllFilters}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#8b5a2b] hover:text-[#3d2e1f] hover:bg-[#A07A55]/10 rounded transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
