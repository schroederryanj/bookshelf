"use client";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Book } from "@/data/types";

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5"
          onClick={() => setSelectedBook(null)}
        >
          <div
            className="bg-[#fef9ed]  shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{
              boxShadow:
                "0 10px 25px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(0,0,0,0.1)",
              fontFamily: "'Georgia', serif",
            }}
          >
            {/* Scrollable content */}
            <div className="overflow-y-auto p-6 flex-1">
              <h2 className="text-2xl  mb-1 text-center text-black">
                {selectedBook.title}
              </h2>
              {selectedBook.author && (
                <h3 className="text-lg text-black mb-4 text-center italic">
                  By {selectedBook.author}
                </h3>
              )}
              {selectedBook.pages && (
                <h3 className="text-lg text-black">
                  Page count: {selectedBook.pages}
                </h3>
              )}
              {selectedBook.genre && (
                <h3 className="text-lg text-black">
                  Genre(s): {selectedBook.genre}
                </h3>
              )}
              {selectedBook.read && (
                <h3 className="text-lg text-black">
                  Status: {selectedBook.read}
                </h3>
              )}
              {selectedBook.rating && (
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-lg text-black">Rating:</span>
                  <div className="flex items-center ml-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className={`w-5 h-5 ${
                          star <= selectedBook.rating!
                            ? "text-yellow-500 fill-yellow-500"
                            : "text-gray-400"
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
              )}

              {(selectedBook.read || selectedBook.rating) && selectedBook.description && (
                <hr className="my-4 border-t border-black" />
              )}

              {selectedBook.description && (
                <p className="text-gray-800 whitespace-pre-line leading-relaxed mt-4">
                  {selectedBook.description}
                </p>
              )}
            </div>

            {/* Sticky footer */}
            <div className="p-4 bg-[#fef9ed]">
              <button
                onClick={() => setSelectedBook(null)}
                className="w-full px-4 py-2 bg-transparent text-black border-2 border-black hover:bg-black/5 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
