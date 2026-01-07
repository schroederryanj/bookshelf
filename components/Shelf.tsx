"use client";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Book } from "@/data/types";
import { RATING_FACTORS } from "@/lib/ratings";
import { StarRating } from "./ui/StarRating";

const shelfHeight = 500;
const shelfThickness = 20;

export function Shelf({ books }: { books: Book[] }) {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [screenWidth, setScreenWidth] = useState(0);
  const [mounted, setMounted] = useState(false); // track if we're on the client

  useEffect(() => {
    setMounted(true); // now safe to use window
    const handleResize = () => setScreenWidth(window.innerWidth);
    handleResize(); // set initial width

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Example calculation: make angles proportional to screen width
  const angle1 =
    (Math.atan(
      (screenWidth / 2 - shelfThickness) / (shelfHeight / 2 - shelfThickness)
    ) *
      180) /
    Math.PI;

  const angle2 =
    (Math.atan(shelfHeight / 2 / (screenWidth / 2 - shelfThickness)) * 180) /
      Math.PI +
    90;

  const angle3 =
    (Math.atan((screenWidth / 2 - shelfThickness) / (shelfHeight / 2)) * 180) /
      Math.PI +
    180;

  const angle4 =
    (Math.atan(
      (shelfHeight / 2 - shelfThickness) / (screenWidth / 2 - shelfThickness)
    ) *
      180) /
      Math.PI +
    270;

  const totalDepth = Math.sqrt(
    (shelfHeight / 2) * (shelfHeight / 2) +
      (screenWidth / 2) * (screenWidth / 2)
  );

  const shelfDepth = totalDepth / 5;
  const radians1 = ((90 - angle1) * Math.PI) / 180;

  const radians2 = ((angle2 - 90) * Math.PI) / 180;

  const b = Math.sin(radians1) * (totalDepth - shelfDepth);
  const a = Math.cos(radians1) * (totalDepth - shelfDepth);
  const verticalOffset = shelfHeight / 2 - b;
  const horizontalOffset = screenWidth / 2 - a;
  const c = Math.sqrt(
    (totalDepth - shelfDepth) * (totalDepth - shelfDepth) - a * a
  );
  const d = Math.tan(radians2) * a;

  if (!mounted) return null; // don't render gradient until client

  return (
    <>
      <div className={cn("flex flex-wrap justify-center items-end relative")}>
        {/* Shelf conic gradient background */}
        {/* LEFT SIDE PANEL */}
        <div
          className="absolute left-0 top-0 bg-[#8B6B4F]"
          style={{
            width: `${horizontalOffset}px`,
            bottom: `-${shelfThickness}px`,
            boxShadow: "inset -6px 0 10px rgba(0,0,0,0.35)",
          }}
        />

        {/* RIGHT SIDE PANEL */}
        <div
          className="absolute top-0 bottom-0 bg-[#8B6B4F]"
          style={{
            width: `${horizontalOffset}px`,
            right: `0px`,
            bottom: `-${shelfThickness}px`,
            boxShadow: "inset 6px 0 10px rgba(0,0,0,0.35)",
          }}
        />

        {/* BACK PANEL (AGED PAPER LOOK) */}
        <div
          className="absolute left-0 right-0 top-0 z-0"
          style={{
            backgroundImage: `conic-gradient(
      transparent 0deg ${angle1}deg,
      transparent ${angle1}deg ${angle2}deg,
      #b88f65 ${angle2}deg ${angle3}deg,
      transparent ${angle3}deg ${angle4}deg,
      transparent ${angle4}deg 360deg
    )`,
            backgroundSize: `100% ${shelfHeight}px`,
            backgroundRepeat: "repeat-y",
            bottom: `-${shelfThickness}px`,
            boxShadow: "inset 0 0 60px rgba(0,0,0,0.15)",
          }}
        />

        {/* SHELF BACKING */}
        <div
          className="absolute top-0 z-0"
          style={{
            background: `repeating-linear-gradient(
      to bottom,
      #ad9c89,
      #ad9c89 ${verticalOffset}px,
      #ad9c89 ${verticalOffset}px,
      #ad9c89 ${verticalOffset + c + d}px,
      transparent ${verticalOffset + c + d}px,
      transparent ${shelfHeight}px
    )`,
            left: `${horizontalOffset}px`,
            right: `${horizontalOffset}px`,
            bottom: `-${shelfThickness}px`,
          }}
        />

        {/* BOOK CONTAINER */}
        <div
          className="flex flex-wrap justify-center items-end relative"
          style={{
            paddingLeft: `${shelfThickness * 2}px`,
            paddingRight: `${shelfThickness * 2}px`,
          }}
        >
          {books.map((book, index) => (
            <div
              key={index}
              className="relative flex flex-col items-center justify-end"
              style={{
                height: `${shelfHeight}px`,
                zIndex: 10,
                paddingBottom: "8px",
              }}
            >
              <img
                src={book.img}
                alt={book.title}
                loading={index < 20 ? "eager" : "lazy"}
                fetchPriority={index < 20 ? "high" : "auto"}
                style={{ height: `${book.height * 40}px` }}
                onClick={() => setSelectedBook(book)}
                className="
          transition-transform duration-300 ease-out origin-bottom
          hover:-translate-y-8
          z-10 hover:z-50
          [box-shadow:0_24px_50px_-6px_rgba(0,0,0,0.45)]
          will-change-transform cursor-pointer
        "
              />
            </div>
          ))}
        </div>

        {/* SHELF PLANKS */}
        <div
          className="absolute left-0 right-0 top-0 z-0"
          style={{
            background: `repeating-linear-gradient(
      to bottom,
      #A07A55,
      #A07A55 ${shelfThickness}px,
      transparent ${shelfThickness}px,
      transparent ${shelfHeight}px
    )`,
            bottom: `-${shelfThickness}px`,
            boxShadow: "inset 0 -6px 10px rgba(0,0,0,0.35)",
          }}
        />

        {/* LEFT SHELF EDGE */}
        <div
          className="absolute left-0 top-0 bg-[#A07A55]"
          style={{
            width: `${shelfThickness}px`,
            bottom: `-${shelfThickness}px`,
            // boxShadow: "inset -4px 0 6px rgba(0,0,0,0.3)",
          }}
        />

        {/* RIGHT SHELF EDGE */}
        <div
          className="absolute top-0 bottom-0 bg-[#A07A55]"
          style={{
            width: `${shelfThickness}px`,
            right: `0px`,
            bottom: `-${shelfThickness}px`,
            // boxShadow: "inset 4px 0 6px rgba(0,0,0,0.3)",
          }}
        />
      </div>

      {/* Popup / Modal */}
      {selectedBook && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setSelectedBook(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-sm"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "linear-gradient(135deg, #fef9ed 0%, #f5ebe0 100%)",
              boxShadow:
                "0 25px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.5)",
              fontFamily: "'Georgia', serif",
              border: "2px solid #A07A55",
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedBook(null)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 transition-colors z-10"
            >
              <svg className="w-5 h-5 text-[#3d2e1f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1">
              {/* Header with book cover */}
              <div className="flex flex-col sm:flex-row gap-6 p-6 pb-4">
                {/* Book Cover */}
                <div className="flex-shrink-0 flex justify-center sm:justify-start">
                  <div
                    className="relative"
                    style={{
                      boxShadow: "4px 4px 15px rgba(0,0,0,0.3), -1px -1px 5px rgba(0,0,0,0.1)",
                    }}
                  >
                    <img
                      src={selectedBook.img}
                      alt={selectedBook.title}
                      className="h-48 sm:h-56 w-auto object-cover"
                    />
                  </div>
                </div>

                {/* Book Info */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl sm:text-3xl font-semibold text-[#3d2e1f] leading-tight">
                    {selectedBook.title}
                  </h2>

                  {selectedBook.author && (
                    <p className="text-lg text-[#6b5a4a] mt-1 italic">
                      by {selectedBook.author}
                    </p>
                  )}

                  {/* Overall Rating */}
                  {selectedBook.ratingOverall && (
                    <div className="flex items-center gap-2 mt-3">
                      <StarRating
                        value={selectedBook.ratingOverall}
                        size="sm"
                        disabled
                      />
                      <span className="text-sm text-[#6b5a4a]">
                        {selectedBook.ratingOverall.toFixed(1)}/5
                      </span>
                    </div>
                  )}

                  {/* Rating Factors Breakdown */}
                  {selectedBook.ratingOverall && (
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
                      {RATING_FACTORS.map((factor) => {
                        const value = selectedBook[
                          factor.key as keyof Book
                        ] as number | undefined;
                        if (!value) return null;
                        return (
                          <div
                            key={factor.key}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-[#6b5a4a]">
                              {factor.label}
                            </span>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <svg
                                  key={star}
                                  className={`w-3 h-3 ${
                                    star <= value
                                      ? "text-yellow-500 fill-yellow-500"
                                      : "text-[#d4c4b0]"
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
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Meta info badges */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {selectedBook.read && (
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          selectedBook.read === "Read"
                            ? "bg-[#2d5a27]/15 text-[#2d5a27]"
                            : selectedBook.read === "Reading"
                            ? "bg-[#8b5a2b]/15 text-[#8b5a2b]"
                            : "bg-[#6b5a4a]/15 text-[#6b5a4a]"
                        }`}
                      >
                        {selectedBook.read}
                      </span>
                    )}
                    {selectedBook.genre && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-[#A07A55]/15 text-[#8B6B4F]">
                        {selectedBook.genre}
                      </span>
                    )}
                    {selectedBook.pages && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-[#6b5a4a]/10 text-[#6b5a4a]">
                        {selectedBook.pages} pages
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedBook.description && (
                <div className="px-6 pb-6">
                  <div className="h-px bg-gradient-to-r from-transparent via-[#c4a77d] to-transparent mb-4" />
                  <p className="text-[#4a3f35] whitespace-pre-line leading-relaxed">
                    {selectedBook.description}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="h-1.5 bg-gradient-to-r from-[#A07A55] via-[#c4a77d] to-[#A07A55]" />
          </div>
        </div>
      )}
    </>
  );
}
