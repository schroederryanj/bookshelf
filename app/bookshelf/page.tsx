import { Shelf } from "@/components/Shelf";
import { EnhancedStats } from "@/components/EnhancedStats";
import { prisma } from "@/lib/prisma";
import { Book } from "@/data/types";
import { calculateStreak } from "@/lib/reading-stats";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BookshelfPage() {
  // Fetch books with their reading progress
  const dbBooks = await prisma.book.findMany({
    orderBy: { position: "asc" },
    include: {
      readingProgress: {
        where: { userId: "default" },
        take: 1,
      },
    },
  });

  // Fetch reading streak
  const streak = await calculateStreak("default");

  // Transform Prisma types to match existing Book type
  const books: Book[] = dbBooks.map((book) => ({
    id: book.id,
    title: book.title,
    img: book.img,
    height: book.height,
    read: book.read ?? undefined,
    dateStarted: book.dateStarted ?? undefined,
    dateFinished: book.dateFinished ?? undefined,
    author: book.author ?? undefined,
    pages: book.pages ?? undefined,
    genre: book.genre ?? undefined,
    description: book.description ?? undefined,
    // Multi-factor ratings
    ratingWriting: book.ratingWriting ?? undefined,
    ratingPlot: book.ratingPlot ?? undefined,
    ratingCharacters: book.ratingCharacters ?? undefined,
    ratingPacing: book.ratingPacing ?? undefined,
    ratingWorldBuilding: book.ratingWorldBuilding ?? undefined,
    ratingEnjoyment: book.ratingEnjoyment ?? undefined,
    ratingRecommend: book.ratingRecommend ?? undefined,
    ratingOverall: book.ratingOverall ?? undefined,
    ratingOverrideManual: book.ratingOverrideManual ?? undefined,
    // Reading progress
    currentPage: book.readingProgress[0]?.currentPage ?? undefined,
    progressPercent: book.readingProgress[0]?.progressPercent ?? undefined,
  }));

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen">
      {/* Admin Login Button */}
      <Link
        href="/admin"
        className="fixed top-6 right-6 sm:top-4 sm:right-4 z-50 p-2 rounded-full bg-black/10 hover:bg-black/20 transition-colors group"
        title="Admin Login"
      >
        <svg
          className="w-5 h-5 text-gray-600 group-hover:text-gray-800 transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </Link>

      <main className="flex flex-col gap-0 row-start-2 items-center ">
        <EnhancedStats
          books={books}
          currentStreak={streak.currentStreak}
          longestStreak={streak.longestStreak}
        />
        <Shelf books={books} />
      </main>
    </div>
  );
}
