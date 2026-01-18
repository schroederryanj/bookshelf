import { prisma } from "@/lib/prisma";
import { calculateStreak, getReadingStats } from "@/lib/reading-stats";
import { StartReadingSection } from "./StartReadingSection";
import { CurrentlyReadingSection } from "./CurrentlyReadingSection";
import { ReadingSessionSection } from "./ReadingSessionSection";
import { GoalsSection } from "./GoalsSection";
import { StatsSection } from "./StatsSection";

const DEFAULT_USER_ID = "default";

async function getUnreadBooks() {
  return prisma.book.findMany({
    where: {
      read: "Unread",
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 8,
  });
}

async function getCurrentlyReadingBooks() {
  const books = await prisma.book.findMany({
    where: {
      read: "Reading",
    },
    include: {
      readingProgress: {
        where: {
          userId: DEFAULT_USER_ID,
        },
        take: 1,
      },
      readingSessions: {
        where: {
          userId: DEFAULT_USER_ID,
        },
        orderBy: {
          startTime: "desc",
        },
        take: 1,
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return books.map((book) => ({
    id: book.id,
    title: book.title,
    author: book.author || undefined,
    img: book.img,
    currentPage: book.readingProgress[0]?.currentPage || 0,
    totalPages: book.pages || book.readingProgress[0]?.totalPages || 300,
    dateStarted: book.dateStarted || book.readingProgress[0]?.startedAt?.toISOString().split("T")[0] || new Date().toISOString().split("T")[0],
    lastReadDate: book.readingSessions[0]?.startTime?.toISOString().split("T")[0],
  }));
}

async function getReadingGoals() {
  return prisma.readingGoal.findMany({
    where: {
      userId: DEFAULT_USER_ID,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export default async function ReadingProgressPage() {
  // Fetch all data in parallel
  const [unreadBooks, currentlyReadingBooks, goals, streak, stats] = await Promise.all([
    getUnreadBooks(),
    getCurrentlyReadingBooks(),
    getReadingGoals(),
    calculateStreak(DEFAULT_USER_ID),
    getReadingStats(DEFAULT_USER_ID),
  ]);

  // Transform goals for the component
  const transformedGoals = goals.map((goal) => ({
    id: goal.id,
    type: goal.goalType.toLowerCase().replace(/_/g, "_") as "books_per_month" | "books_per_year" | "pages_per_day",
    target: goal.target,
    current: goal.current,
    startDate: goal.startDate.toISOString().split("T")[0],
    endDate: goal.endDate.toISOString().split("T")[0],
  }));

  // Transform stats for the widget
  const widgetStats = {
    booksReadThisMonth: stats.totalBooksRead,
    booksReadThisYear: stats.totalBooksRead,
    pagesReadThisWeek: Math.round(stats.totalPagesRead / 4), // Approximate weekly
    pagesReadThisMonth: stats.totalPagesRead,
    averageReadingSpeed: stats.averagePagesPerSession > 0 ? Math.round((stats.averagePagesPerSession * 60) / (stats.averageSessionDuration || 60)) : 30,
    totalReadingTime: Math.round(stats.totalReadingTime / 60), // Convert to minutes
    currentStreak: streak.currentStreak,
    favoriteGenre: undefined,
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-[#3d2e1f] mb-2">Reading Progress</h1>
          <p className="text-[#6b5a4a]">Track your reading journey, start new books, and achieve your goals</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - 2 columns on large screens */}
          <div className="lg:col-span-2 space-y-8">
            {/* Start Reading - Most prominent section */}
            <StartReadingSection books={unreadBooks} />

            {/* Currently Reading */}
            <CurrentlyReadingSection books={currentlyReadingBooks} />

            {/* Reading Session Quick Start */}
            <ReadingSessionSection
              currentlyReadingBooks={currentlyReadingBooks}
            />
          </div>

          {/* Sidebar - Goals and Stats */}
          <div className="space-y-6">
            {/* Streak Badge */}
            <div className="bg-white rounded-xl shadow-md border border-[#e8dfd3] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#3d2e1f]">Reading Streak</h2>
                {streak.currentStreak >= 7 && (
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                    On Fire!
                  </span>
                )}
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#A07A55] to-[#8B6B4F] text-white mb-3">
                  <span className="text-3xl font-bold">{streak.currentStreak}</span>
                </div>
                <p className="text-sm text-[#6b5a4a] font-medium">Day Streak</p>
                {streak.longestStreak > streak.currentStreak && (
                  <p className="text-xs text-[#8b5a2b] mt-2">
                    Longest: {streak.longestStreak} days
                  </p>
                )}
              </div>
            </div>

            {/* Reading Goals */}
            <GoalsSection goals={transformedGoals} />

            {/* Stats Widget */}
            <StatsSection stats={widgetStats} />
          </div>
        </div>
      </div>
    </div>
  );
}
