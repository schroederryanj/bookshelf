"use client";

import { useState } from "react";
import { ReadingProgressBar } from "./ReadingProgressBar";

interface ReadingBook {
  id: number;
  title: string;
  author?: string;
  img: string;
  currentPage: number;
  totalPages: number;
  dateStarted: string;
  lastReadDate?: string;
}

interface CurrentlyReadingListProps {
  books: ReadingBook[];
  onUpdateProgress?: (bookId: number, currentPage: number) => void;
  onRemove?: (bookId: number) => void;
}

export function CurrentlyReadingList({
  books,
  onUpdateProgress,
  onRemove,
}: CurrentlyReadingListProps) {
  const [editingBookId, setEditingBookId] = useState<number | null>(null);
  const [editingPage, setEditingPage] = useState<number>(0);

  const handleStartEdit = (book: ReadingBook) => {
    setEditingBookId(book.id);
    setEditingPage(book.currentPage);
  };

  const handleSaveEdit = (bookId: number) => {
    if (onUpdateProgress && editingPage >= 0) {
      onUpdateProgress(bookId, editingPage);
    }
    setEditingBookId(null);
  };

  const handleCancelEdit = () => {
    setEditingBookId(null);
    setEditingPage(0);
  };

  const getDaysReading = (dateStarted: string): number => {
    const start = new Date(dateStarted);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (books.length === 0) {
    return (
      <div
        className="p-8 rounded-lg text-center"
        style={{
          background: "linear-gradient(135deg, #fef9ed 0%, #f5ebe0 100%)",
          border: "2px solid #c4a77d",
        }}
      >
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
        <h3 className="text-xl font-semibold text-[#6b5a4a] mb-2">
          No Books in Progress
        </h3>
        <p className="text-sm text-[#8b5a2b]">
          Start reading a book to track your progress here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {books.map((book) => (
        <div
          key={book.id}
          className="p-4 rounded-lg"
          style={{
            background: "linear-gradient(135deg, #fef9ed 0%, #f5ebe0 100%)",
            border: "2px solid #c4a77d",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <div className="flex gap-4">
            {/* Book Cover */}
            <div className="shrink-0">
              <img
                src={book.img}
                alt={book.title}
                className="h-32 w-auto object-cover rounded shadow-md"
              />
            </div>

            {/* Book Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-[#3d2e1f] truncate">
                    {book.title}
                  </h3>
                  {book.author && (
                    <p className="text-sm text-[#6b5a4a] italic">{book.author}</p>
                  )}
                </div>

                {onRemove && (
                  <button
                    onClick={() => onRemove(book.id)}
                    className="ml-2 p-1.5 rounded hover:bg-red-100 transition-colors shrink-0"
                    title="Remove from currently reading"
                  >
                    <svg
                      className="w-4 h-4 text-red-600"
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

              {/* Reading Stats */}
              <div className="flex flex-wrap gap-3 mb-3 text-xs text-[#6b5a4a]">
                <span>Started: {new Date(book.dateStarted).toLocaleDateString()}</span>
                <span className="text-[#8b5a2b]">
                  {getDaysReading(book.dateStarted)} days reading
                </span>
                {book.lastReadDate && (
                  <span>Last read: {new Date(book.lastReadDate).toLocaleDateString()}</span>
                )}
              </div>

              {/* Progress Controls */}
              {editingBookId === book.id ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={editingPage}
                      onChange={(e) => setEditingPage(parseInt(e.target.value) || 0)}
                      className="flex-1 px-3 py-1.5 border border-[#c4a77d] rounded focus:outline-none focus:ring-2 focus:ring-[#8B6B4F]"
                      min="0"
                      max={book.totalPages}
                      placeholder="Current page"
                    />
                    <span className="text-sm text-[#6b5a4a]">/ {book.totalPages}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(book.id)}
                      className="px-3 py-1.5 rounded bg-[#2d5a27] text-white hover:bg-[#4a7c42] transition-colors text-sm font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1.5 rounded bg-[#6b5a4a] text-white hover:bg-[#3d2e1f] transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <ReadingProgressBar
                    currentPage={book.currentPage}
                    totalPages={book.totalPages}
                    size="md"
                    showPercentage={true}
                  />
                  {onUpdateProgress && (
                    <button
                      onClick={() => handleStartEdit(book)}
                      className="text-sm text-[#8b5a2b] hover:text-[#a67c52] font-medium transition-colors"
                    >
                      Update Progress
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
