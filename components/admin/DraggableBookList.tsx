"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useMemo, useCallback } from "react";
import { BookCollectionSearch } from "./BookCollectionSearch";
import { BookSortDropdown, SortOption } from "./BookSortDropdown";
import { BookFilters, FilterOptions } from "./BookFilters";
import { RandomBookPicker } from "./RandomBookPicker";

type Book = {
  id: number;
  title: string;
  img: string;
  author: string | null;
  pages: number | null;
  read: string | null;
  genre: string | null;
  description: string | null;
  ratingOverall: number | null;
  rating?: number | null;
  position: number;
  createdAt?: Date | string;
  dateFinished?: Date | string | null;
};

export function DraggableBookList({
  books: initialBooks,
  initialFilter,
  genres = [],
}: {
  books: Book[];
  initialFilter?: string;
  genres?: string[];
}) {
  const router = useRouter();
  const [books, setBooks] = useState(initialBooks);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [startReadingBook, setStartReadingBook] = useState<Book | null>(null);
  const [startingPage, setStartingPage] = useState("");
  const [startingReading, setStartingReading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // New filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("dateAdded-desc");
  const [filters, setFilters] = useState<FilterOptions>({
    genre: undefined,
    rating: initialFilter && ["Reading", "Unread", "Read"].includes(initialFilter) ? undefined : undefined,
    readStatus: initialFilter && ["Reading", "Unread", "Read"].includes(initialFilter)
      ? initialFilter.toLowerCase() as FilterOptions["readStatus"]
      : undefined,
  });

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Memoized search handler
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Combined filtering, searching, and sorting logic
  const filteredBooks = useMemo(() => {
    let result = [...books];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(book =>
        book.title.toLowerCase().includes(query) ||
        (book.author && book.author.toLowerCase().includes(query)) ||
        (book.description && book.description.toLowerCase().includes(query))
      );
    }

    // Apply genre filter
    if (filters.genre) {
      result = result.filter(book =>
        book.genre && book.genre.toLowerCase().includes(filters.genre!.toLowerCase())
      );
    }

    // Apply rating filter
    if (filters.rating) {
      if (filters.rating === "unrated") {
        result = result.filter(book => !book.ratingOverall && !book.rating);
      } else {
        const ratingValue = parseInt(filters.rating);
        result = result.filter(book => {
          const bookRating = book.ratingOverall || book.rating || 0;
          return Math.floor(bookRating) === ratingValue;
        });
      }
    }

    // Apply read status filter
    if (filters.readStatus) {
      const statusMap: Record<string, string> = {
        reading: "Reading",
        unread: "Unread",
        finished: "Read",
      };
      result = result.filter(book => book.read === statusMap[filters.readStatus!]);
    }

    // Apply sorting
    const [sortBy, sortOrder] = sortOption.split("-") as [string, "asc" | "desc"];
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "dateAdded":
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case "dateFinished":
          const finA = a.dateFinished ? new Date(a.dateFinished).getTime() : 0;
          const finB = b.dateFinished ? new Date(b.dateFinished).getTime() : 0;
          comparison = finA - finB;
          break;
        case "rating":
          comparison = (a.ratingOverall || a.rating || 0) - (b.ratingOverall || b.rating || 0);
          break;
        case "author":
          comparison = (a.author || "").localeCompare(b.author || "");
          break;
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "pages":
          comparison = (a.pages || 0) - (b.pages || 0);
          break;
        default:
          comparison = a.position - b.position;
      }

      return sortOrder === "desc" ? -comparison : comparison;
    });

    return result;
  }, [books, searchQuery, filters, sortOption]);

  // Count books by status for filter badges
  const statusCounts = useMemo(() => ({
    all: books.length,
    Reading: books.filter((b) => b.read === "Reading").length,
    Unread: books.filter((b) => b.read === "Unread").length,
    Read: books.filter((b) => b.read === "Read").length,
  }), [books]);

  // Check if any filters are active
  const hasActiveFilters = searchQuery || filters.genre || filters.rating || filters.readStatus || sortOption !== "dateAdded-desc";

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery("");
    setFilters({ genre: undefined, rating: undefined, readStatus: undefined });
    setSortOption("dateAdded-desc");
  };

  // Handle start reading from random picker
  const handleStartReadingFromPicker = (pickedBook: { id?: number; title: string }) => {
    // Find the full book from our books array
    const fullBook = books.find(b => b.id === pickedBook.id);
    if (fullBook) {
      setStartReadingBook(fullBook);
    }
  };

  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragOverItem.current = index;
  };

  const handleDrop = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) return;

    const newBooks = [...books];
    const draggedBook = newBooks[dragItem.current];
    newBooks.splice(dragItem.current, 1);
    newBooks.splice(dragOverItem.current, 0, draggedBook);

    // Update positions
    newBooks.forEach((book, index) => {
      book.position = index;
    });

    setBooks(newBooks);
    setHasChanges(true);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/books/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          books: books.map((b) => ({
            id: b.id,
            position: b.position,
            shelf: 1,
          })),
        }),
      });

      if (res.ok) {
        setHasChanges(false);
        router.refresh();
      } else {
        alert("Failed to save order");
      }
    } catch {
      alert("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/books/${id}`, { method: "DELETE" });
      if (res.ok) {
        setBooks(books.filter((b) => b.id !== id));
        router.refresh();
      } else {
        alert("Failed to delete book");
      }
    } catch {
      alert("An error occurred");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleStartReading = async () => {
    if (!startReadingBook) return;
    setStartingReading(true);

    const currentPage = parseInt(startingPage) || 0;
    const totalPages = startReadingBook.pages || 0;
    const progressPercent = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;

    try {
      // Update book status to "Reading"
      const bookRes = await fetch(`/api/books/${startReadingBook.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: "Reading" }),
      });

      if (!bookRes.ok) {
        alert("Failed to update book status");
        return;
      }

      // Update reading progress
      await fetch(`/api/reading-progress/${startReadingBook.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPage,
          progressPercent,
          status: "reading",
        }),
      });

      // Update local state
      setBooks(books.map(b =>
        b.id === startReadingBook.id ? { ...b, read: "Reading" } : b
      ));
      router.refresh();
    } catch {
      alert("An error occurred");
    } finally {
      setStartingReading(false);
      setStartReadingBook(null);
      setStartingPage("");
    }
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-gray-400 text-sm">-</span>;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-300"
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
    );
  };

  const renderStatusBadge = (read: string | null) => (
    <span
      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
        read === "Read"
          ? "bg-green-100 text-green-800"
          : read === "Unread"
          ? "bg-yellow-100 text-yellow-800"
          : "bg-gray-100 text-gray-800"
      }`}
    >
      {read || "Unknown"}
    </span>
  );

  return (
    <>
      {/* Search, Sort, and Filter Controls */}
      <div className="space-y-4 mb-6">
        {/* Top Row: Search, Sort, Random Picker, Filter Toggle */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1">
            <BookCollectionSearch onSearch={handleSearch} />
          </div>

          {/* Sort Dropdown */}
          <BookSortDropdown
            currentSort={sortOption}
            onSortChange={setSortOption}
          />

          {/* Random Book Picker */}
          <RandomBookPicker
            books={filteredBooks.filter(b => b.read === "Unread")}
            onStartReading={handleStartReadingFromPicker}
          />

          {/* Filter Toggle (Mobile) */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium text-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
            {(filters.genre || filters.rating || filters.readStatus) && (
              <span className="w-2 h-2 bg-blue-600 rounded-full" />
            )}
          </button>
        </div>

        {/* Quick Status Filters (Always visible) */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500 mr-1">Quick filters:</span>
          <button
            onClick={() => setFilters({ ...filters, readStatus: undefined })}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !filters.readStatus
                ? "bg-gray-800 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All ({statusCounts.all})
          </button>
          <button
            onClick={() => setFilters({ ...filters, readStatus: "reading" })}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filters.readStatus === "reading"
                ? "bg-blue-600 text-white"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
            }`}
          >
            Reading ({statusCounts.Reading})
          </button>
          <button
            onClick={() => setFilters({ ...filters, readStatus: "unread" })}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filters.readStatus === "unread"
                ? "bg-yellow-500 text-white"
                : "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
            }`}
          >
            Unread ({statusCounts.Unread})
          </button>
          <button
            onClick={() => setFilters({ ...filters, readStatus: "finished" })}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filters.readStatus === "finished"
                ? "bg-green-600 text-white"
                : "bg-green-50 text-green-700 hover:bg-green-100"
            }`}
          >
            Read ({statusCounts.Read})
          </button>

          {/* Clear all filters button */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="px-3 py-1.5 rounded-full text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear all
            </button>
          )}
        </div>

        {/* Advanced Filters Panel (Collapsible on mobile, sidebar on desktop) */}
        <div className={`lg:hidden ${showFilters ? "block" : "hidden"}`}>
          <BookFilters
            genres={genres}
            filters={filters}
            onFilterChange={setFilters}
            bookCount={filteredBooks.length}
          />
        </div>

        {/* Results count */}
        <p className="text-gray-600 text-sm">
          Showing {filteredBooks.length} of {books.length} books
          {searchQuery && <span className="text-blue-600"> matching &quot;{searchQuery}&quot;</span>}
          {hasActiveFilters && !searchQuery && <span className="text-gray-400"> (filtered)</span>}
          . Drag to reorder.
        </p>
      </div>

      {/* Save Bar */}
      {hasChanges && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex justify-between items-center">
          <span className="text-amber-800 text-sm sm:text-base">You have unsaved changes to the book order.</span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm sm:text-base"
          >
            {saving ? "Saving..." : "Save Order"}
          </button>
        </div>
      )}

      {/* Empty State */}
      {filteredBooks.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="text-lg font-medium">No books found</p>
          <p className="text-sm text-gray-400 mt-1">
            {searchQuery ? `No results for "${searchQuery}"` : "Try adjusting your filters"}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="mt-4 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3 min-w-0">
        {filteredBooks.map((book, index) => (
          <div
            key={book.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={handleDrop}
            className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 min-w-0"
          >
            <div className="flex gap-3 min-w-0">
              {/* Drag Handle & Cover */}
              <div className="flex items-start gap-2">
                <div className="text-gray-400 cursor-move mt-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
                  </svg>
                </div>
                <div className="w-16 h-24 relative flex-shrink-0">
                  <Image
                    src={`/${book.img}`}
                    alt={book.title}
                    fill
                    className="object-cover rounded"
                    sizes="64px"
                  />
                </div>
              </div>

              {/* Book Info */}
              <div className="flex-1 min-w-0 overflow-hidden">
                <h3 className="font-medium text-gray-900 truncate text-sm">{book.title}</h3>
                <p className="text-xs text-gray-500 truncate">{book.author || "Unknown author"}</p>

                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {renderStatusBadge(book.read)}
                  {book.pages && (
                    <span className="text-xs text-gray-500">{book.pages} pages</span>
                  )}
                </div>

                <div className="mt-2">
                  {renderStars(book.ratingOverall)}
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-3">
                  <Link
                    href={`/admin/books/${book.id}/edit`}
                    className="text-sm text-blue-600 hover:text-blue-900 font-medium"
                  >
                    Edit
                  </Link>
                  {book.read === "Unread" && (
                    <button
                      onClick={() => setStartReadingBook(book)}
                      className="text-sm text-green-600 hover:text-green-900 font-medium"
                    >
                      Start Reading
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteId(book.id)}
                    className="text-sm text-red-600 hover:text-red-900 font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8">

              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Book
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Author
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pages
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rating
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredBooks.map((book, index) => (
              <tr
                key={book.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={handleDrop}
                className="hover:bg-gray-50 cursor-move"
              >
                <td className="px-4 py-3 text-gray-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
                  </svg>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-10 h-14 relative flex-shrink-0">
                      <Image
                        src={`/${book.img}`}
                        alt={book.title}
                        fill
                        className="object-cover rounded"
                        sizes="40px"
                      />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                        {book.title}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {book.author || "-"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {book.pages || "-"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {renderStatusBadge(book.read)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {renderStars(book.ratingOverall)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                  <Link
                    href={`/admin/books/${book.id}/edit`}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    Edit
                  </Link>
                  {book.read === "Unread" && (
                    <button
                      onClick={() => setStartReadingBook(book)}
                      className="text-green-600 hover:text-green-900 mr-4"
                    >
                      Start Reading
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteId(book.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Delete Book?
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this book? This action cannot be
              undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start Reading Modal */}
      {startReadingBook !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Start Reading
            </h3>
            <p className="text-gray-600 mb-4">
              {startReadingBook.title}
              {startReadingBook.pages && (
                <span className="text-gray-400"> ({startReadingBook.pages} pages)</span>
              )}
            </p>
            <div className="mb-6">
              <label htmlFor="startingPage" className="block text-sm font-medium text-gray-700 mb-2">
                What page are you on?
              </label>
              <input
                type="number"
                id="startingPage"
                value={startingPage}
                onChange={(e) => setStartingPage(e.target.value)}
                placeholder="0"
                min="0"
                max={startReadingBook.pages || undefined}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave blank or enter 0 if you&apos;re just starting
              </p>
            </div>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setStartReadingBook(null);
                  setStartingPage("");
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={startingReading}
              >
                Cancel
              </button>
              <button
                onClick={handleStartReading}
                disabled={startingReading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {startingReading ? "Starting..." : "Start Reading"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
