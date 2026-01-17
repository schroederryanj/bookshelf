"use client";
import { Book } from "@/data/types";

type StatsProps = {
  books: Book[];
};

export function Stats({ books }: StatsProps) {
  const totalBooks = books.length;
  const totalReadBooks = books.filter((book) => book.read === "Read").length;
  const totalUnreadBooks = books.filter((book) => book.read !== "Read").length;
  const totalReadPages = books
    .filter((book) => book.read === "Read")
    .reduce((sum, book) => sum + (book.pages || 0), 0);
  const averagePages =
    books.length > 0
      ? Math.round(
          books.reduce((sum, book) => sum + (book.pages || 0), 0) / books.length
        )
      : 0;
  const readPercentage = totalBooks > 0 ? Math.round((totalReadBooks / totalBooks) * 100) : 0;

  // Get average rating of rated books
  const ratedBooks = books.filter((book) => book.ratingOverall);
  const averageRating = ratedBooks.length > 0
    ? (ratedBooks.reduce((sum, book) => sum + (book.ratingOverall || 0), 0) / ratedBooks.length).toFixed(1)
    : null;

  return (
    <div className="w-full flex justify-center mb-6">
      <div
        className="max-w-4xl w-full mx-4 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #fef9ed 0%, #f5ebe0 100%)",
          fontFamily: "'Georgia', serif",
          border: "2px solid #A07A55",
          boxShadow:
            "0 10px 30px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.5)",
          borderRadius: "2px",
        }}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4">
          <div className="flex items-center justify-center gap-3 mb-1">
            <div className="h-px bg-gradient-to-r from-transparent via-[#A07A55] to-transparent flex-1 max-w-16" />
            <svg className="w-6 h-6 text-[#8B6B4F]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <div className="h-px bg-gradient-to-r from-transparent via-[#A07A55] to-transparent flex-1 max-w-16" />
          </div>
          <h1 className="text-center text-3xl text-[#3d2e1f] tracking-wide">
            My Bookshelf
          </h1>
          <p className="text-center text-[#6b5a4a] text-sm mt-1 italic">
            A collection of {totalBooks} books
          </p>
        </div>

        {/* Decorative divider */}
        <div className="px-8">
          <div className="h-px bg-gradient-to-r from-transparent via-[#c4a77d] to-transparent" />
        </div>

        {/* Stats Grid */}
        <div className="px-6 py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Books Read */}
            <div className="text-center p-3 rounded-lg bg-white/40">
              <div className="text-3xl font-bold text-[#2d5a27]">{totalReadBooks}</div>
              <div className="text-xs text-[#6b5a4a] uppercase tracking-wider mt-1">Books Read</div>
            </div>

            {/* To Read */}
            <div className="text-center p-3 rounded-lg bg-white/40">
              <div className="text-3xl font-bold text-[#8b5a2b]">{totalUnreadBooks}</div>
              <div className="text-xs text-[#6b5a4a] uppercase tracking-wider mt-1">To Read</div>
            </div>

            {/* Pages Read */}
            <div className="text-center p-3 rounded-lg bg-white/40">
              <div className="text-3xl font-bold text-[#3d2e1f]">{totalReadPages.toLocaleString()}</div>
              <div className="text-xs text-[#6b5a4a] uppercase tracking-wider mt-1">Pages Read</div>
            </div>

            {/* Avg Pages */}
            <div className="text-center p-3 rounded-lg bg-white/40">
              <div className="text-3xl font-bold text-[#3d2e1f]">{averagePages}</div>
              <div className="text-xs text-[#6b5a4a] uppercase tracking-wider mt-1">Avg Pages</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-5">
            <div className="flex justify-between text-xs text-[#6b5a4a] mb-2">
              <span>Reading Progress</span>
              <span>{readPercentage}% Complete</span>
            </div>
            <div className="h-2.5 bg-[#d4c4b0] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#2d5a27] to-[#4a7c42] rounded-full transition-all duration-500"
                style={{ width: `${readPercentage}%` }}
              />
            </div>
          </div>

          {/* Average Rating (if available) */}
          {averageRating && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="text-sm text-[#6b5a4a]">Average Rating:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={`w-4 h-4 ${
                      star <= Math.round(parseFloat(averageRating))
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
                <span className="text-sm font-medium text-[#3d2e1f] ml-1">{averageRating}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer decoration */}
        <div className="h-2 bg-gradient-to-r from-[#A07A55] via-[#c4a77d] to-[#A07A55]" />
      </div>
    </div>
  );
}
