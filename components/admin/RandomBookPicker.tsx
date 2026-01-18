"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";

// Flexible book type that works with both full Book type and partial book data
type BookForPicker = {
  id?: number;
  title: string;
  img: string;
  author?: string | null;
  genre?: string | null;
  description?: string | null;
  pages?: number | null;
  rating?: number | null;
  ratingOverall?: number | null;
};

type RandomBookPickerProps = {
  books: BookForPicker[];
  onStartReading?: (book: BookForPicker) => void;
  className?: string;
};

export function RandomBookPicker({ books, onStartReading, className }: RandomBookPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookForPicker | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const pickRandomBook = () => {
    if (books.length === 0) return;

    setIsAnimating(true);

    // Simulate "spinning" animation
    const duration = 800;
    const interval = 100;
    let elapsed = 0;

    const spinInterval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * books.length);
      setSelectedBook(books[randomIndex]);
      elapsed += interval;

      if (elapsed >= duration) {
        clearInterval(spinInterval);
        setIsAnimating(false);
      }
    }, interval);
  };

  const handleOpen = () => {
    setIsOpen(true);
    pickRandomBook();
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedBook(null);
  };

  const handlePickAnother = () => {
    pickRandomBook();
  };

  const handleStartReading = () => {
    if (selectedBook && onStartReading) {
      onStartReading(selectedBook);
      handleClose();
    }
  };

  const getRatingStars = (book: BookForPicker) => {
    const rating = book.ratingOverall || book.rating || 0;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={cn(
              "w-4 h-4",
              star <= rating ? "text-yellow-500 fill-current" : "text-gray-300"
            )}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={handleOpen}
        disabled={books.length === 0}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 bg-[#2d5a27] text-white rounded-lg hover:bg-[#234620] transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Random Pick
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#e8dfd3] flex items-center justify-between bg-[#fef9ed]">
              <h2 className="text-lg font-bold text-[#3d2e1f] flex items-center gap-2">
                <svg className="w-6 h-6 text-[#2d5a27]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Random Book Picker
              </h2>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-[#e8dfd3] rounded-full transition-colors"
              >
                <svg className="w-5 h-5 text-[#6b5a4a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {books.length === 0 ? (
                <div className="text-center py-8 text-[#6b5a4a]">
                  <svg className="w-16 h-16 mx-auto mb-4 text-[#e8dfd3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <p className="font-medium">No books available</p>
                </div>
              ) : selectedBook ? (
                <div className={cn(
                  "transition-all duration-300",
                  isAnimating && "opacity-50 scale-95"
                )}>
                  {/* Book Cover */}
                  <div className="relative w-full h-64 mb-4 rounded-lg overflow-hidden bg-[#fef9ed] flex items-center justify-center">
                    {selectedBook.img ? (
                      <Image
                        src={selectedBook.img.startsWith('/') || selectedBook.img.startsWith('http') ? selectedBook.img : `/${selectedBook.img}`}
                        alt={selectedBook.title}
                        fill
                        className="object-contain"
                      />
                    ) : (
                      <svg className="w-24 h-24 text-[#e8dfd3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    )}
                  </div>

                  {/* Book Details */}
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-xl font-bold text-[#3d2e1f] mb-1">
                        {selectedBook.title}
                      </h3>
                      {selectedBook.author && (
                        <p className="text-[#6b5a4a]">by {selectedBook.author}</p>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-wrap gap-2">
                      {selectedBook.genre && (
                        <span className="px-3 py-1 bg-[#A07A55]/10 text-[#8B6B4F] rounded-full text-sm font-medium">
                          {selectedBook.genre}
                        </span>
                      )}
                      {selectedBook.pages && (
                        <span className="px-3 py-1 bg-[#fef9ed] text-[#6b5a4a] rounded-full text-sm">
                          {selectedBook.pages} pages
                        </span>
                      )}
                    </div>

                    {/* Rating */}
                    {(selectedBook.ratingOverall || selectedBook.rating) && (
                      <div className="flex items-center gap-2">
                        {getRatingStars(selectedBook)}
                        <span className="text-sm text-[#6b5a4a]">
                          ({selectedBook.ratingOverall || selectedBook.rating}/5)
                        </span>
                      </div>
                    )}

                    {/* Description */}
                    {selectedBook.description && (
                      <p className="text-sm text-[#6b5a4a] line-clamp-3">
                        {selectedBook.description}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin w-12 h-12 border-4 border-[#A07A55] border-t-transparent rounded-full mx-auto" />
                  <p className="mt-4 text-[#6b5a4a]">Picking a random book...</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {selectedBook && (
              <div className="px-6 py-4 border-t border-[#e8dfd3] bg-[#fef9ed] flex gap-3">
                <button
                  onClick={handlePickAnother}
                  disabled={isAnimating}
                  className="flex-1 px-4 py-2.5 bg-white border border-[#e8dfd3] text-[#8B6B4F] rounded-lg hover:bg-[#e8dfd3] transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Pick Another
                </button>
                {onStartReading && (
                  <button
                    onClick={handleStartReading}
                    disabled={isAnimating}
                    className="flex-1 px-4 py-2.5 bg-[#2d5a27] text-white rounded-lg hover:bg-[#234620] transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Start Reading
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
