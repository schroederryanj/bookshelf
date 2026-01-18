"use client";

import { useState, useMemo } from "react";
import { Book } from "@/data/types";
import { Shelf } from "./Shelf";
import { BookshelfFilters } from "./BookshelfFilters";

export type SortField = "title" | "author" | "dateFinished" | "rating";
export type SortOrder = "asc" | "desc";

export interface FilterState {
  searchQuery: string;
  selectedGenre: string;
  readStatus: string;
  minRating: number;
  sortField: SortField;
  sortOrder: SortOrder;
}

interface BookshelfClientProps {
  books: Book[];
  genres: string[];
}

export function BookshelfClient({ books, genres }: BookshelfClientProps) {
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: "",
    selectedGenre: "All",
    readStatus: "All",
    minRating: 0,
    sortField: "title",
    sortOrder: "asc",
  });

  // Apply filtering and sorting
  const filteredBooks = useMemo(() => {
    let filtered = [...books];

    // Search filter
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (book) =>
          book.title.toLowerCase().includes(query) ||
          book.author?.toLowerCase().includes(query) ||
          book.description?.toLowerCase().includes(query)
      );
    }

    // Genre filter
    if (filters.selectedGenre !== "All") {
      filtered = filtered.filter((book) =>
        book.genre?.split(",").some((g) => g.trim() === filters.selectedGenre)
      );
    }

    // Read status filter
    if (filters.readStatus !== "All") {
      filtered = filtered.filter((book) => book.read === filters.readStatus);
    }

    // Rating filter
    if (filters.minRating > 0) {
      filtered = filtered.filter(
        (book) => (book.ratingOverall ?? 0) >= filters.minRating
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue: string | number | undefined;
      let bValue: string | number | undefined;

      switch (filters.sortField) {
        case "title":
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case "author":
          aValue = a.author?.toLowerCase() ?? "";
          bValue = b.author?.toLowerCase() ?? "";
          break;
        case "dateFinished":
          aValue = a.dateFinished ?? "";
          bValue = b.dateFinished ?? "";
          break;
        case "rating":
          aValue = a.ratingOverall ?? 0;
          bValue = b.ratingOverall ?? 0;
          break;
        default:
          aValue = "";
          bValue = "";
      }

      if (aValue === bValue) return 0;

      const comparison = aValue < bValue ? -1 : 1;
      return filters.sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [books, filters]);

  return (
    <div className="w-full">
      <BookshelfFilters
        filters={filters}
        onFiltersChange={setFilters}
        genres={genres}
        totalBooks={books.length}
        filteredCount={filteredBooks.length}
      />
      <Shelf books={filteredBooks} />
    </div>
  );
}
