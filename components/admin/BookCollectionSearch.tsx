"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type BookCollectionSearchProps = {
  onSearch: (query: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
};

export function BookCollectionSearch({
  onSearch,
  placeholder = "Search by title, author, or description...",
  debounceMs = 300,
  className
}: BookCollectionSearchProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (query.length === 0) {
      onSearch("");
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    timeoutRef.current = setTimeout(() => {
      onSearch(query);
      setIsSearching(false);
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, debounceMs, onSearch]);

  const handleClear = () => {
    setQuery("");
    setIsSearching(false);
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        {/* Search Icon */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-[#6b5a4a]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Input */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-20 py-2.5 border border-[#e8dfd3] rounded-lg bg-white text-[#3d2e1f] placeholder-[#6b5a4a]/60 focus:outline-none focus:ring-2 focus:ring-[#A07A55] focus:border-transparent transition-shadow"
        />

        {/* Right Side Icons */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
          {/* Searching Indicator */}
          {isSearching && (
            <div className="flex items-center gap-1 text-xs text-[#6b5a4a]">
              <svg
                className="animate-spin h-4 w-4 text-[#A07A55]"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          )}

          {/* Clear Button */}
          {query && !isSearching && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-[#fef9ed] rounded-full transition-colors group"
              aria-label="Clear search"
            >
              <svg
                className="h-4 w-4 text-[#6b5a4a] group-hover:text-[#3d2e1f]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Search Results Count (optional - can be passed as prop) */}
      {query && !isSearching && (
        <div className="absolute top-full mt-1 left-0 text-xs text-[#6b5a4a]">
          Searching for "{query}"
        </div>
      )}
    </div>
  );
}
