"use client";

import { useState, useEffect, useRef } from "react";

export type BookSearchResult = {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  pages: number | null;
  genre: string | null;
  thumbnail: string | null;
  isbn: string | null;
};

type Props = {
  onSelect: (book: BookSearchResult) => void;
};

export function BookSearch({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/books/search?q=${encodeURIComponent(query)}`
        );
        const data = await res.json();
        setResults(data.results || []);
        setShowResults(true);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (book: BookSearchResult) => {
    onSelect(book);
    setQuery("");
    setResults([]);
    setShowResults(false);
  };

  return (
    <div ref={containerRef} className="relative mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Search for a book
      </label>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="Search by title, author, or ISBN..."
          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg
              className="animate-spin h-5 w-5 text-gray-400"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
        )}
        {!loading && query.length === 0 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg
              className="h-5 w-5 text-gray-400"
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
        )}
      </div>
      <p className="text-xs text-gray-500 mt-1">
        Search to auto-fill book details from Google Books
      </p>

      {/* Results dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-96 overflow-y-auto">
          {results.map((book) => (
            <button
              key={book.id}
              type="button"
              onClick={() => handleSelect(book)}
              className="w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 text-left"
            >
              {book.thumbnail ? (
                <img
                  src={book.thumbnail}
                  alt={book.title}
                  className="w-10 h-14 object-cover rounded flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-14 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {book.title}
                </p>
                {book.author && (
                  <p className="text-sm text-gray-500 truncate">{book.author}</p>
                )}
                <p className="text-xs text-gray-400">
                  {book.pages && `${book.pages} pages`}
                  {book.pages && book.genre && " · "}
                  {book.genre}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {showResults &&
        query.length >= 2 &&
        results.length === 0 &&
        !loading && (
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-4 text-center text-gray-500">
            No books found
          </div>
        )}
    </div>
  );
}
