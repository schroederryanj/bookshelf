"use client";

import { useState } from "react";
import Image from "next/image";
import { ReadingProgressBar } from "@/components/reading-progress";

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

interface CurrentlyReadingSectionProps {
  books: ReadingBook[];
}

export function CurrentlyReadingSection({ books }: CurrentlyReadingSectionProps) {
  const [editingBookId, setEditingBookId] = useState<number | null>(null);
  const [editingPage, setEditingPage] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const handleStartEdit = (book: ReadingBook) => {
    setEditingBookId(book.id);
    setEditingPage(book.currentPage);
  };

  const handleSaveProgress = async (bookId: number, totalPages: number) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/reading-progress/${bookId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPage: editingPage,
          totalPages,
        }),
      });

      if (response.ok) {
        // Check if book is completed
        if (editingPage >= totalPages) {
          await fetch(`/api/books/${bookId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ read: "Finished" }),
          });
        }
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to update progress:", error);
    } finally {
      setSaving(false);
      setEditingBookId(null);
    }
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
      <section className="bg-white rounded-xl shadow-md border border-[#e8dfd3] p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-[#2d5a27]/10 rounded-lg">
            <svg className="w-6 h-6 text-[#2d5a27]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#3d2e1f]">Currently Reading</h2>
            <p className="text-sm text-[#6b5a4a]">Books you are reading now</p>
          </div>
        </div>

        <div className="text-center py-8 bg-[#fef9ed] rounded-lg border-2 border-dashed border-[#d4c4b0]">
          <svg className="w-12 h-12 mx-auto text-[#d4c4b0] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <h3 className="text-lg font-medium text-[#6b5a4a] mb-1">No Books in Progress</h3>
          <p className="text-sm text-[#8b5a2b]">Start reading a book from your collection above!</p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-xl shadow-md border border-[#e8dfd3] p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-[#2d5a27]/10 rounded-lg">
          <svg className="w-6 h-6 text-[#2d5a27]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-[#3d2e1f]">Currently Reading</h2>
          <p className="text-sm text-[#6b5a4a]">{books.length} book{books.length !== 1 ? "s" : ""} in progress</p>
        </div>
      </div>

      <div className="space-y-4">
        {books.map((book) => (
          <div
            key={book.id}
            className="flex gap-4 p-4 bg-[#fef9ed] rounded-lg border border-[#e8dfd3] hover:border-[#A07A55] transition-colors"
          >
            {/* Book Cover */}
            <div className="shrink-0 relative w-20 h-28 rounded-md overflow-hidden shadow-md">
              <Image
                src={book.img.startsWith('/') || book.img.startsWith('http') ? book.img : `/${book.img}`}
                alt={book.title}
                fill
                className="object-cover"
                sizes="80px"
              />
            </div>

            {/* Book Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-[#3d2e1f] truncate">{book.title}</h3>
                  {book.author && (
                    <p className="text-sm text-[#6b5a4a] italic truncate">{book.author}</p>
                  )}
                </div>
              </div>

              {/* Reading Stats */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs text-[#6b5a4a]">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Started {new Date(book.dateStarted).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1 text-[#8b5a2b] font-medium">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.66 11.2c-.23-.3-.51-.56-.77-.82-.67-.6-1.43-1.03-2.07-1.66C13.33 7.26 13 4.85 13.95 3c-.95.23-1.78.75-2.49 1.32-2.59 2.08-3.61 5.75-2.39 8.9.04.1.08.2.08.33 0 .22-.15.42-.35.5-.23.1-.47.04-.66-.12a.58.58 0 01-.14-.17c-1.13-1.43-1.31-3.48-.55-5.12C5.78 10 4.87 12.3 5 14.47c.06.5.12 1 .29 1.5.14.6.41 1.2.71 1.73 1.08 1.73 2.95 2.97 4.96 3.22 2.14.27 4.43-.12 6.07-1.6 1.83-1.66 2.47-4.32 1.53-6.6l-.13-.26c-.21-.46-.77-1.26-.77-1.26m-3.16 6.3c-.28.24-.74.5-1.1.6-1.12.4-2.24-.16-2.9-.82 1.19-.28 1.9-1.16 2.11-2.05.17-.8-.15-1.46-.28-2.23-.12-.74-.1-1.37.17-2.06.19.38.39.76.63 1.06.77 1 1.98 1.44 2.24 2.8.04.14.06.28.06.43.03.82-.33 1.72-.93 2.27z" />
                  </svg>
                  {getDaysReading(book.dateStarted)} days
                </span>
              </div>

              {/* Progress Controls */}
              {editingBookId === book.id ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={editingPage}
                      onChange={(e) => setEditingPage(Math.max(0, Math.min(book.totalPages, parseInt(e.target.value) || 0)))}
                      className="flex-1 max-w-[100px] px-3 py-1.5 text-sm border border-[#c4a77d] rounded-md focus:outline-none focus:ring-2 focus:ring-[#A07A55] bg-white"
                      min="0"
                      max={book.totalPages}
                    />
                    <span className="text-sm text-[#6b5a4a]">of {book.totalPages} pages</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveProgress(book.id, book.totalPages)}
                      disabled={saving}
                      className="px-3 py-1.5 rounded-md bg-[#2d5a27] text-white hover:bg-[#4a7c42] transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1.5 rounded-md bg-[#6b5a4a] text-white hover:bg-[#3d2e1f] transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                    {editingPage >= book.totalPages && (
                      <span className="flex items-center text-xs text-[#2d5a27] font-medium">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Will mark as finished!
                      </span>
                    )}
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
                  <button
                    onClick={() => handleStartEdit(book)}
                    className="text-sm text-[#A07A55] hover:text-[#8B6B4F] font-medium transition-colors flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Update Progress
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
