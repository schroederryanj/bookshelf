import { prisma } from "@/lib/prisma";
import { calculateStreak } from "@/lib/reading-stats";
import {
  Achievement as PrismaAchievement,
  UserAchievement as PrismaUserAchievement,
  AchievementType,
  AchievementTier,
  AchievementCategory,
} from "@prisma/client";

// Re-export Prisma types for convenience
export { AchievementType, AchievementTier, AchievementCategory };
export type Achievement = PrismaAchievement;
export type UserAchievement = PrismaUserAchievement & {
  achievement?: Achievement;
};

// Types for achievement requirements
export interface AchievementRequirement {
  books?: number;
  pages?: number;
  streak?: number;
  genres?: number;
  booksPerMonth?: number;
  authorBooks?: number;
  readingMinutes?: number;
}

export interface AchievementWithProgress extends Achievement {
  userProgress?: {
    progress: number;
    isComplete: boolean;
    earnedAt: Date | null;
  };
}

export interface AchievementStats {
  totalAchievements: number;
  earnedAchievements: number;
  totalPoints: number;
  earnedPoints: number;
  progressByCategory: {
    category: AchievementCategory;
    earned: number;
    total: number;
  }[];
  recentAchievements: (UserAchievement & { achievement: Achievement })[];
  tierBreakdown: {
    tier: AchievementTier;
    earned: number;
    total: number;
  }[];
}

export interface NewlyEarnedAchievement {
  achievement: Achievement;
  earnedAt: Date;
  previousProgress: number;
}

const DEFAULT_USER_ID = "default";

// Get user's reading statistics for achievement checking
// This function considers BOTH ReadingProgress records AND books marked as "Read" directly
async function getUserReadingData(userId: string) {
  // Get completed books from ReadingProgress
  const progressCompletedCount = await prisma.readingProgress.count({
    where: {
      userId,
      status: "COMPLETED",
    },
  });

  // Get books marked as "Read" directly (legacy/imported books)
  // Exclude books that already have a COMPLETED ReadingProgress to avoid double-counting
  const booksWithProgress = await prisma.readingProgress.findMany({
    where: { userId, status: "COMPLETED" },
    select: { bookId: true },
  });
  const progressBookIds = new Set(booksWithProgress.map((p) => p.bookId));

  const directReadBooks = await prisma.book.findMany({
    where: {
      read: "Read",
      id: { notIn: Array.from(progressBookIds) },
    },
    select: { id: true, pages: true, genre: true, author: true },
  });

  const completedBooksCount = progressCompletedCount + directReadBooks.length;

  // Get total pages read from ReadingSessions
  const sessionPagesResult = await prisma.readingSession.aggregate({
    where: { userId },
    _sum: { pagesRead: true },
  });
  const sessionPagesRead = sessionPagesResult._sum.pagesRead || 0;

  // Add pages from directly-read books (their total page count)
  const directReadPages = directReadBooks.reduce(
    (sum, book) => sum + (book.pages || 0),
    0
  );
  const totalPagesRead = sessionPagesRead + directReadPages;

  // Get total reading time
  const totalTimeResult = await prisma.readingSession.aggregate({
    where: { userId, duration: { not: null } },
    _sum: { duration: true },
  });
  const totalReadingMinutes = Math.floor((totalTimeResult._sum.duration || 0) / 60);

  // Get streak data
  const streakData = await calculateStreak(userId);

  // Get unique genres from ReadingProgress completed books
  const completedProgressBooks = await prisma.readingProgress.findMany({
    where: {
      userId,
      status: "COMPLETED",
    },
    include: {
      book: {
        select: { genre: true },
      },
    },
  });

  const uniqueGenres = new Set<string>();

  // Add genres from ReadingProgress completed books
  completedProgressBooks.forEach((progress) => {
    if (progress.book.genre) {
      progress.book.genre.split(",").forEach((g) => {
        const trimmed = g.trim().toLowerCase();
        if (trimmed) uniqueGenres.add(trimmed);
      });
    }
  });

  // Add genres from directly-read books
  directReadBooks.forEach((book) => {
    if (book.genre) {
      book.genre.split(",").forEach((g) => {
        const trimmed = g.trim().toLowerCase();
        if (trimmed) uniqueGenres.add(trimmed);
      });
    }
  });

  // Get books per month (current month) - only from ReadingProgress for now
  // since direct books don't have completion dates
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const booksThisMonth = await prisma.readingProgress.count({
    where: {
      userId,
      status: "COMPLETED",
      completedAt: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  });

  // Get max books by single author - combine both sources
  // First, get authors from ReadingProgress completed books
  const progressBooksByAuthor = await prisma.book.groupBy({
    by: ["author"],
    where: {
      author: { not: null },
      readingProgress: {
        some: {
          userId,
          status: "COMPLETED",
        },
      },
    },
    _count: true,
  });

  // Count authors from direct read books
  const directAuthorCounts = new Map<string, number>();
  directReadBooks.forEach((book) => {
    if (book.author) {
      directAuthorCounts.set(
        book.author,
        (directAuthorCounts.get(book.author) || 0) + 1
      );
    }
  });

  // Merge author counts
  const mergedAuthorCounts = new Map<string, number>();
  progressBooksByAuthor.forEach((item) => {
    if (item.author) {
      mergedAuthorCounts.set(item.author, item._count);
    }
  });
  directAuthorCounts.forEach((count, author) => {
    mergedAuthorCounts.set(author, (mergedAuthorCounts.get(author) || 0) + count);
  });

  const maxAuthorBooks = Math.max(0, ...mergedAuthorCounts.values());

  return {
    completedBooksCount,
    totalPagesRead,
    totalReadingMinutes,
    currentStreak: streakData.currentStreak,
    longestStreak: streakData.longestStreak,
    uniqueGenresCount: uniqueGenres.size,
    booksThisMonth,
    maxAuthorBooks,
  };
}

// Check if a specific achievement requirement is met
function checkRequirement(
  requirement: AchievementRequirement,
  userData: Awaited<ReturnType<typeof getUserReadingData>>
): { met: boolean; progress: number } {
  // Calculate progress for each requirement type
  if (requirement.books !== undefined) {
    const progress = Math.min(100, (userData.completedBooksCount / requirement.books) * 100);
    return { met: userData.completedBooksCount >= requirement.books, progress };
  }

  if (requirement.pages !== undefined) {
    const progress = Math.min(100, (userData.totalPagesRead / requirement.pages) * 100);
    return { met: userData.totalPagesRead >= requirement.pages, progress };
  }

  if (requirement.streak !== undefined) {
    // Use longest streak for achievement checking
    const progress = Math.min(100, (userData.longestStreak / requirement.streak) * 100);
    return { met: userData.longestStreak >= requirement.streak, progress };
  }

  if (requirement.genres !== undefined) {
    const progress = Math.min(100, (userData.uniqueGenresCount / requirement.genres) * 100);
    return { met: userData.uniqueGenresCount >= requirement.genres, progress };
  }

  if (requirement.booksPerMonth !== undefined) {
    const progress = Math.min(100, (userData.booksThisMonth / requirement.booksPerMonth) * 100);
    return { met: userData.booksThisMonth >= requirement.booksPerMonth, progress };
  }

  if (requirement.authorBooks !== undefined) {
    const progress = Math.min(100, (userData.maxAuthorBooks / requirement.authorBooks) * 100);
    return { met: userData.maxAuthorBooks >= requirement.authorBooks, progress };
  }

  if (requirement.readingMinutes !== undefined) {
    const progress = Math.min(100, (userData.totalReadingMinutes / requirement.readingMinutes) * 100);
    return { met: userData.totalReadingMinutes >= requirement.readingMinutes, progress };
  }

  return { met: false, progress: 0 };
}

// Get all achievements with user progress
export async function getAllAchievements(
  userId: string = DEFAULT_USER_ID
): Promise<AchievementWithProgress[]> {
  const achievements = await prisma.achievement.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { tier: "asc" }, { points: "asc" }],
  });

  const userAchievements = await prisma.userAchievement.findMany({
    where: { userId },
  });

  const userAchievementMap = new Map(
    userAchievements.map((ua) => [ua.achievementId, ua])
  );

  // Get user data for progress calculation
  const userData = await getUserReadingData(userId);

  return achievements.map((achievement) => {
    const userAchievement = userAchievementMap.get(achievement.id);
    const requirement = achievement.requirement as AchievementRequirement;
    const { progress } = checkRequirement(requirement, userData);

    return {
      ...achievement,
      userProgress: {
        progress: userAchievement?.progress ?? progress,
        isComplete: userAchievement?.isComplete ?? false,
        earnedAt: userAchievement?.isComplete ? userAchievement.earnedAt : null,
      },
    };
  });
}

// Get achievements grouped by category
export async function getAchievementsByCategory(
  userId: string = DEFAULT_USER_ID
): Promise<Record<AchievementCategory, AchievementWithProgress[]>> {
  const achievements = await getAllAchievements(userId);

  const grouped = {} as Record<AchievementCategory, AchievementWithProgress[]>;

  for (const category of Object.values(AchievementCategory)) {
    grouped[category] = achievements.filter((a) => a.category === category);
  }

  return grouped;
}

// Check and award new achievements
export async function checkAndAwardAchievements(
  userId: string = DEFAULT_USER_ID
): Promise<NewlyEarnedAchievement[]> {
  const userData = await getUserReadingData(userId);

  // Get all active achievements
  const achievements = await prisma.achievement.findMany({
    where: { isActive: true },
  });

  // Get user's existing achievements
  const existingUserAchievements = await prisma.userAchievement.findMany({
    where: { userId },
  });

  const existingMap = new Map(
    existingUserAchievements.map((ua) => [ua.achievementId, ua])
  );

  const newlyEarned: NewlyEarnedAchievement[] = [];

  for (const achievement of achievements) {
    const existing = existingMap.get(achievement.id);
    const requirement = achievement.requirement as AchievementRequirement;
    const { met, progress } = checkRequirement(requirement, userData);

    if (met && (!existing || !existing.isComplete)) {
      // Achievement newly earned
      const previousProgress = existing?.progress ?? 0;

      await prisma.userAchievement.upsert({
        where: {
          userId_achievementId: {
            userId,
            achievementId: achievement.id,
          },
        },
        update: {
          progress: 100,
          isComplete: true,
          earnedAt: new Date(),
          metadata: { userData },
        },
        create: {
          userId,
          achievementId: achievement.id,
          progress: 100,
          isComplete: true,
          earnedAt: new Date(),
          metadata: { userData },
        },
      });

      newlyEarned.push({
        achievement,
        earnedAt: new Date(),
        previousProgress,
      });
    } else if (!met && progress !== (existing?.progress ?? 0)) {
      // Update progress (not complete yet)
      await prisma.userAchievement.upsert({
        where: {
          userId_achievementId: {
            userId,
            achievementId: achievement.id,
          },
        },
        update: {
          progress,
        },
        create: {
          userId,
          achievementId: achievement.id,
          progress,
          isComplete: false,
        },
      });
    }
  }

  return newlyEarned;
}

// Get achievement statistics
export async function getAchievementStats(
  userId: string = DEFAULT_USER_ID
): Promise<AchievementStats> {
  const [allAchievements, userAchievements] = await Promise.all([
    prisma.achievement.findMany({ where: { isActive: true } }),
    prisma.userAchievement.findMany({
      where: { userId, isComplete: true },
      include: { achievement: true },
      orderBy: { earnedAt: "desc" },
    }),
  ]);

  const earnedIds = new Set(userAchievements.map((ua) => ua.achievementId));

  // Calculate total and earned points
  const totalPoints = allAchievements.reduce((sum, a) => sum + a.points, 0);
  const earnedPoints = userAchievements.reduce(
    (sum, ua) => sum + ua.achievement.points,
    0
  );

  // Progress by category
  const categoryStats = Object.values(AchievementCategory).map((category) => {
    const categoryAchievements = allAchievements.filter(
      (a) => a.category === category
    );
    const earned = categoryAchievements.filter((a) => earnedIds.has(a.id)).length;

    return {
      category,
      earned,
      total: categoryAchievements.length,
    };
  });

  // Tier breakdown
  const tierStats = Object.values(AchievementTier).map((tier) => {
    const tierAchievements = allAchievements.filter((a) => a.tier === tier);
    const earned = tierAchievements.filter((a) => earnedIds.has(a.id)).length;

    return {
      tier,
      earned,
      total: tierAchievements.length,
    };
  });

  return {
    totalAchievements: allAchievements.length,
    earnedAchievements: userAchievements.length,
    totalPoints,
    earnedPoints,
    progressByCategory: categoryStats,
    recentAchievements: userAchievements.slice(0, 5),
    tierBreakdown: tierStats,
  };
}

// Seed default achievements
export async function seedDefaultAchievements(): Promise<number> {
  const defaultAchievements = [
    // MILESTONE - Reading Volume
    {
      name: "Bookworm",
      description: "Complete 10 books",
      icon: "book",
      category: AchievementCategory.READING_VOLUME,
      type: AchievementType.MILESTONE,
      tier: AchievementTier.BRONZE,
      requirement: { books: 10 },
      points: 100,
    },
    {
      name: "Avid Reader",
      description: "Complete 25 books",
      icon: "books",
      category: AchievementCategory.READING_VOLUME,
      type: AchievementType.MILESTONE,
      tier: AchievementTier.SILVER,
      requirement: { books: 25 },
      points: 250,
    },
    {
      name: "Bibliophile",
      description: "Complete 50 books",
      icon: "library",
      category: AchievementCategory.READING_VOLUME,
      type: AchievementType.MILESTONE,
      tier: AchievementTier.GOLD,
      requirement: { books: 50 },
      points: 500,
    },
    {
      name: "Century Reader",
      description: "Complete 100 books",
      icon: "trophy",
      category: AchievementCategory.READING_VOLUME,
      type: AchievementType.MILESTONE,
      tier: AchievementTier.PLATINUM,
      requirement: { books: 100 },
      points: 1000,
    },
    {
      name: "Page Turner",
      description: "Read 1,000 pages",
      icon: "page",
      category: AchievementCategory.READING_VOLUME,
      type: AchievementType.MILESTONE,
      tier: AchievementTier.BRONZE,
      requirement: { pages: 1000 },
      points: 100,
    },
    {
      name: "Page Master",
      description: "Read 5,000 pages",
      icon: "pages",
      category: AchievementCategory.READING_VOLUME,
      type: AchievementType.MILESTONE,
      tier: AchievementTier.SILVER,
      requirement: { pages: 5000 },
      points: 300,
    },
    {
      name: "Marathon Reader",
      description: "Read 10,000 pages",
      icon: "marathon",
      category: AchievementCategory.READING_VOLUME,
      type: AchievementType.MILESTONE,
      tier: AchievementTier.GOLD,
      requirement: { pages: 10000 },
      points: 500,
    },

    // STREAK - Reading Streak
    {
      name: "Week Warrior",
      description: "Maintain a 7-day reading streak",
      icon: "flame",
      category: AchievementCategory.READING_STREAK,
      type: AchievementType.STREAK,
      tier: AchievementTier.BRONZE,
      requirement: { streak: 7 },
      points: 100,
    },
    {
      name: "Fortnight Focus",
      description: "Maintain a 14-day reading streak",
      icon: "fire",
      category: AchievementCategory.READING_STREAK,
      type: AchievementType.STREAK,
      tier: AchievementTier.SILVER,
      requirement: { streak: 14 },
      points: 200,
    },
    {
      name: "Month Master",
      description: "Maintain a 30-day reading streak",
      icon: "calendar",
      category: AchievementCategory.READING_STREAK,
      type: AchievementType.STREAK,
      tier: AchievementTier.GOLD,
      requirement: { streak: 30 },
      points: 500,
    },
    {
      name: "Year Champion",
      description: "Maintain a 365-day reading streak",
      icon: "crown",
      category: AchievementCategory.READING_STREAK,
      type: AchievementType.STREAK,
      tier: AchievementTier.PLATINUM,
      requirement: { streak: 365 },
      points: 2000,
    },

    // DIVERSITY - Genre Diversity
    {
      name: "Genre Explorer",
      description: "Read books from 5 different genres",
      icon: "compass",
      category: AchievementCategory.GENRE_DIVERSITY,
      type: AchievementType.DIVERSITY,
      tier: AchievementTier.BRONZE,
      requirement: { genres: 5 },
      points: 150,
    },
    {
      name: "Literary Adventurer",
      description: "Read books from 10 different genres",
      icon: "map",
      category: AchievementCategory.GENRE_DIVERSITY,
      type: AchievementType.DIVERSITY,
      tier: AchievementTier.SILVER,
      requirement: { genres: 10 },
      points: 300,
    },
    {
      name: "Genre Master",
      description: "Read books from 15 different genres",
      icon: "world",
      category: AchievementCategory.GENRE_DIVERSITY,
      type: AchievementType.DIVERSITY,
      tier: AchievementTier.GOLD,
      requirement: { genres: 15 },
      points: 500,
    },

    // SPEED - Reading Speed
    {
      name: "Quick Read",
      description: "Complete 5 books in a single month",
      icon: "rocket",
      category: AchievementCategory.READING_SPEED,
      type: AchievementType.SPEED,
      tier: AchievementTier.BRONZE,
      requirement: { booksPerMonth: 5 },
      points: 200,
    },
    {
      name: "Speed Demon",
      description: "Complete 10 books in a single month",
      icon: "lightning",
      category: AchievementCategory.READING_SPEED,
      type: AchievementType.SPEED,
      tier: AchievementTier.GOLD,
      requirement: { booksPerMonth: 10 },
      points: 500,
    },

    // COMPLETIONIST - Author Loyalty
    {
      name: "Author Fan",
      description: "Complete 3 books by the same author",
      icon: "heart",
      category: AchievementCategory.AUTHOR_LOYALTY,
      type: AchievementType.COMPLETIONIST,
      tier: AchievementTier.BRONZE,
      requirement: { authorBooks: 3 },
      points: 150,
    },
    {
      name: "Author Devotee",
      description: "Complete 5 books by the same author",
      icon: "star",
      category: AchievementCategory.AUTHOR_LOYALTY,
      type: AchievementType.COMPLETIONIST,
      tier: AchievementTier.SILVER,
      requirement: { authorBooks: 5 },
      points: 300,
    },
    {
      name: "Author Superfan",
      description: "Complete 10 books by the same author",
      icon: "medal",
      category: AchievementCategory.AUTHOR_LOYALTY,
      type: AchievementType.COMPLETIONIST,
      tier: AchievementTier.GOLD,
      requirement: { authorBooks: 10 },
      points: 500,
    },

    // TIME_INVESTMENT - Reading Time
    {
      name: "Hour Reader",
      description: "Spend 60 minutes reading",
      icon: "clock",
      category: AchievementCategory.TIME_INVESTMENT,
      type: AchievementType.MILESTONE,
      tier: AchievementTier.BRONZE,
      requirement: { readingMinutes: 60 },
      points: 50,
    },
    {
      name: "Ten Hour Club",
      description: "Spend 600 minutes (10 hours) reading",
      icon: "hourglass",
      category: AchievementCategory.TIME_INVESTMENT,
      type: AchievementType.MILESTONE,
      tier: AchievementTier.SILVER,
      requirement: { readingMinutes: 600 },
      points: 200,
    },
    {
      name: "Hundred Hour Legend",
      description: "Spend 6,000 minutes (100 hours) reading",
      icon: "timer",
      category: AchievementCategory.TIME_INVESTMENT,
      type: AchievementType.MILESTONE,
      tier: AchievementTier.PLATINUM,
      requirement: { readingMinutes: 6000 },
      points: 1000,
    },
  ];

  let created = 0;

  for (const achievement of defaultAchievements) {
    try {
      await prisma.achievement.upsert({
        where: { name: achievement.name },
        update: achievement,
        create: achievement,
      });
      created++;
    } catch (error) {
      console.error(`Failed to seed achievement ${achievement.name}:`, error);
    }
  }

  return created;
}
