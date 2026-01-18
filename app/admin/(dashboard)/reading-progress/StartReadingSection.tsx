"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface Book {
  id: number;
  title: string;
  img: string;
  author: string | null;
  pages: number | null;
  genre: string | null;
}

interface StartReadingSectionProps {
  books: Book[];
}

export function StartReadingSection({ books }: StartReadingSectionProps) {
  const [startingBookId, setStartingBookId] = useState<number | null>(null);

  const handleStartReading = async (bookId: number) => {
    setStartingBookId(bookId);
    try {
      // Update reading progress via the [bookId] route
      const response = await fetch(`/api/reading-progress/${bookId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "READING",
          currentPage: 0,
        }),
      });

      if (response.ok) {
        // Also update the book's read status and start date
        await fetch(`/api/books/${bookId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            read: "Reading",
            dateStarted: new Date().toISOString().split("T")[0],
          }),
        });
        // Refresh the page to show updated data
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to start reading:", error);
    } finally {
      setStartingBookId(null);
    }
  };

  if (books.length === 0) {
    return (
      <section className="bg-white rounded-xl shadow-md border border-[#e8dfd3] p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-[#A07A55]/10 rounded-lg">
            <svg className="w-6 h-6 text-[#A07A55]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#3d2e1f]">Start Reading</h2>
            <p className="text-sm text-[#6b5a4a]">Pick your next adventure</p>
          </div>
        </div>

        <div className="text-center py-12 bg-[#fef9ed] rounded-lg border-2 border-dashed border-[#d4c4b0]">
          <svg className="w-16 h-16 mx-auto text-[#d4c4b0] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h3 className="text-lg font-medium text-[#6b5a4a] mb-2">No Unread Books</h3>
          <p className="text-sm text-[#8b5a2b] mb-4">Add some books to your collection to start reading!</p>
          <Link
            href="/admin/books/add"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#A07A55] text-white rounded-lg hover:bg-[#8B6B4F] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Book
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-xl shadow-md border border-[#e8dfd3] p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#A07A55]/10 rounded-lg">
            <svg className="w-6 h-6 text-[#A07A55]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#3d2e1f]">Start Reading</h2>
            <p className="text-sm text-[#6b5a4a]">Pick your next adventure from {books.length} unread books</p>
          </div>
        </div>
        <Link
          href="/bookshelf"
          className="text-sm text-[#A07A55] hover:text-[#8B6B4F] font-medium transition-colors"
        >
          View All
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {books.map((book) => (
          <div
            key={book.id}
            className="group relative bg-[#fef9ed] rounded-lg p-3 border border-[#e8dfd3] hover:border-[#A07A55] hover:shadow-lg transition-all duration-200"
          >
            <div className="aspect-[2/3] relative mb-3 overflow-hidden rounded-md">
              <Image
                src={book.img.startsWith('/') || book.img.startsWith('http') ? book.img : `/${book.img}`}
                alt={book.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <button
                onClick={() => handleStartReading(book.id)}
                disabled={startingBookId === book.id}
                className="absolute bottom-2 left-2 right-2 py-2 bg-[#2d5a27] text-white text-sm font-medium rounded-md opacity-0 group-hover:opacity-100 hover:bg-[#4a7c42] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {startingBookId === book.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Starting...
                  </span>
                ) : (
                  "Start Reading"
                )}
              </button>
            </div>
            <h3 className="text-sm font-medium text-[#3d2e1f] line-clamp-2 mb-1">{book.title}</h3>
            {book.author && (
              <p className="text-xs text-[#6b5a4a] truncate">{book.author}</p>
            )}
            {book.pages && (
              <p className="text-xs text-[#8b5a2b] mt-1">{book.pages} pages</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
