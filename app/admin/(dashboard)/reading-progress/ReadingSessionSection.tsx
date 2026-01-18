"use client";

import { useState } from "react";
import Image from "next/image";
import { ReadingSessionTimer } from "@/components/reading-progress";

interface ReadingBook {
  id: number;
  title: string;
  author?: string;
  img: string;
  currentPage: number;
  totalPages: number;
}

interface ReadingSessionSectionProps {
  currentlyReadingBooks: ReadingBook[];
}

export function ReadingSessionSection({ currentlyReadingBooks }: ReadingSessionSectionProps) {
  const [selectedBookId, setSelectedBookId] = useState<number | undefined>(
    currentlyReadingBooks[0]?.id
  );
  const [showBookSelector, setShowBookSelector] = useState(false);

  const selectedBook = currentlyReadingBooks.find((b) => b.id === selectedBookId);

  const handleSessionComplete = async (duration: number) => {
    if (!selectedBookId) return;

    try {
      await fetch("/api/reading-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: selectedBookId,
          duration,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error("Failed to save reading session:", error);
    }
  };

  if (currentlyReadingBooks.length === 0) {
    return (
      <section className="bg-white rounded-xl shadow-md border border-[#e8dfd3] p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-[#8b5a2b]/10 rounded-lg">
            <svg className="w-6 h-6 text-[#8b5a2b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#3d2e1f]">Reading Session</h2>
            <p className="text-sm text-[#6b5a4a]">Track your reading time</p>
          </div>
        </div>

        <div className="text-center py-8 bg-[#fef9ed] rounded-lg border-2 border-dashed border-[#d4c4b0]">
          <svg className="w-12 h-12 mx-auto text-[#d4c4b0] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-[#6b5a4a] mb-1">No Active Books</h3>
          <p className="text-sm text-[#8b5a2b]">Start reading a book to track your sessions!</p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-xl shadow-md border border-[#e8dfd3] p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-[#8b5a2b]/10 rounded-lg">
          <svg className="w-6 h-6 text-[#8b5a2b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-[#3d2e1f]">Reading Session</h2>
          <p className="text-sm text-[#6b5a4a]">Track your reading time</p>
        </div>
      </div>

      {/* Book Selector */}
      {currentlyReadingBooks.length > 1 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#6b5a4a] mb-2">
            Reading:
          </label>
          <div className="relative">
            <button
              onClick={() => setShowBookSelector(!showBookSelector)}
              className="w-full flex items-center gap-3 p-3 bg-[#fef9ed] border border-[#e8dfd3] rounded-lg hover:border-[#A07A55] transition-colors text-left"
            >
              {selectedBook && (
                <>
                  <div className="relative w-10 h-14 rounded overflow-hidden shrink-0">
                    <Image
                      src={selectedBook.img.startsWith('/') || selectedBook.img.startsWith('http') ? selectedBook.img : `/${selectedBook.img}`}
                      alt={selectedBook.title}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#3d2e1f] truncate">{selectedBook.title}</p>
                    {selectedBook.author && (
                      <p className="text-sm text-[#6b5a4a] truncate">{selectedBook.author}</p>
                    )}
                  </div>
                </>
              )}
              <svg
                className={`w-5 h-5 text-[#6b5a4a] transition-transform ${showBookSelector ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showBookSelector && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-[#e8dfd3] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {currentlyReadingBooks.map((book) => (
                  <button
                    key={book.id}
                    onClick={() => {
                      setSelectedBookId(book.id);
                      setShowBookSelector(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 hover:bg-[#fef9ed] transition-colors text-left ${
                      book.id === selectedBookId ? "bg-[#fef9ed]" : ""
                    }`}
                  >
                    <div className="relative w-10 h-14 rounded overflow-hidden shrink-0">
                      <Image
                        src={book.img.startsWith('/') || book.img.startsWith('http') ? book.img : `/${book.img}`}
                        alt={book.title}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#3d2e1f] truncate">{book.title}</p>
                      {book.author && (
                        <p className="text-sm text-[#6b5a4a] truncate">{book.author}</p>
                      )}
                    </div>
                    {book.id === selectedBookId && (
                      <svg className="w-5 h-5 text-[#2d5a27]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Timer */}
      <ReadingSessionTimer
        bookId={selectedBookId}
        onSessionComplete={handleSessionComplete}
        autoSaveInterval={60}
      />

      {/* Quick Tips */}
      <div className="mt-4 p-3 bg-[#fef9ed] rounded-lg">
        <p className="text-xs text-[#6b5a4a]">
          <span className="font-medium">Tip:</span> Sessions auto-save every minute. Stop the timer when you are done to record your reading time.
        </p>
      </div>
    </section>
  );
}
