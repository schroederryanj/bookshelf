import { calculateMilestones, calculateStreak, getReadingStats } from "@/lib/reading-stats";

const DEFAULT_USER_ID = "default";

// Achievement categories for filtering
const ACHIEVEMENT_CATEGORIES = {
  books: {
    label: "Books",
    ids: ["first_book", "bookworm", "avid_reader", "bibliophile", "book_dragon", "literary_legend"],
  },
  sessions: {
    label: "Sessions",
    ids: ["first_session", "consistent_reader", "dedicated_reader"],
  },
  pages: {
    label: "Pages",
    ids: ["page_turner", "thousand_pages", "page_master", "page_legend"],
  },
  time: {
    label: "Time",
    ids: ["hour_reader", "ten_hours", "hundred_hours"],
  },
  streaks: {
    label: "Streaks",
    ids: ["three_day_streak", "week_streak", "two_week_streak", "month_streak"],
  },
};

// Icon mapping for achievement categories
const getCategoryIcon = (category: string) => {
  switch (category) {
    case "books":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      );
    case "sessions":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "pages":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case "time":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "streaks":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
        </svg>
      );
    default:
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      );
  }
};

// Get achievement badge color based on tier/category
const getAchievementColor = (id: string, achieved: boolean) => {
  if (!achieved) return { bg: "bg-gray-100", text: "text-gray-400", ring: "ring-gray-200" };

  // Gold tier achievements (highest)
  if (["literary_legend", "book_dragon", "page_legend", "hundred_hours", "month_streak"].includes(id)) {
    return { bg: "bg-gradient-to-br from-yellow-400 to-amber-500", text: "text-white", ring: "ring-yellow-300" };
  }
  // Silver tier achievements (high)
  if (["bibliophile", "dedicated_reader", "page_master", "ten_hours", "two_week_streak"].includes(id)) {
    return { bg: "bg-gradient-to-br from-gray-300 to-gray-400", text: "text-gray-800", ring: "ring-gray-300" };
  }
  // Bronze tier achievements (medium)
  if (["avid_reader", "consistent_reader", "thousand_pages", "hour_reader", "week_streak"].includes(id)) {
    return { bg: "bg-gradient-to-br from-amber-600 to-orange-700", text: "text-white", ring: "ring-amber-400" };
  }
  // Starter achievements (base)
  return { bg: "bg-gradient-to-br from-green-500 to-emerald-600", text: "text-white", ring: "ring-green-300" };
};

// Calculate points for each achievement
const getAchievementPoints = (id: string): number => {
  const pointsMap: Record<string, number> = {
    // Book milestones
    first_book: 10,
    bookworm: 25,
    avid_reader: 50,
    bibliophile: 100,
    book_dragon: 200,
    literary_legend: 500,
    // Session milestones
    first_session: 5,
    consistent_reader: 50,
    dedicated_reader: 100,
    // Page milestones
    page_turner: 15,
    thousand_pages: 30,
    page_master: 75,
    page_legend: 150,
    // Time milestones
    hour_reader: 10,
    ten_hours: 40,
    hundred_hours: 100,
    // Streak milestones
    three_day_streak: 15,
    week_streak: 35,
    two_week_streak: 70,
    month_streak: 150,
  };
  return pointsMap[id] || 10;
};

export default async function AchievementsPage() {
  // Fetch all achievement data in parallel
  const [milestones, streak, stats] = await Promise.all([
    calculateMilestones(DEFAULT_USER_ID),
    calculateStreak(DEFAULT_USER_ID),
    getReadingStats(DEFAULT_USER_ID),
  ]);

  // Calculate summary stats
  const earnedAchievements = milestones.filter((m) => m.achieved);
  const totalAchievements = milestones.length;
  const totalPoints = earnedAchievements.reduce((sum, m) => sum + getAchievementPoints(m.id), 0);
  const maxPossiblePoints = milestones.reduce((sum, m) => sum + getAchievementPoints(m.id), 0);

  // Get recent achievements (sorted by progress or achieved status)
  const recentAchievements = [...milestones]
    .filter((m) => m.achieved)
    .sort((a, b) => {
      if (a.achievedAt && b.achievedAt) {
        return new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime();
      }
      return 0;
    })
    .slice(0, 3);

  // Get next achievements to earn (closest to completion)
  const nextToEarn = [...milestones]
    .filter((m) => !m.achieved)
    .sort((a, b) => (b.progress / b.target) - (a.progress / a.target))
    .slice(0, 3);

  // Group achievements by category
  const achievementsByCategory = Object.entries(ACHIEVEMENT_CATEGORIES).map(([key, data]) => ({
    key,
    label: data.label,
    achievements: milestones.filter((m) => data.ids.includes(m.id)),
    earned: milestones.filter((m) => data.ids.includes(m.id) && m.achieved).length,
    total: data.ids.length,
  }));

  return (
    <div className="min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Achievements & Badges</h1>
          <p className="text-gray-600 text-sm sm:text-base mt-1">
            Track your reading milestones and earn badges for your accomplishments
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
        {/* Achievements Earned */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Earned</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                {earnedAchievements.length}
                <span className="text-lg text-gray-400 font-normal">/{totalAchievements}</span>
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Points */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Total Points</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{totalPoints}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Current Streak */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Current Streak</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                {streak.currentStreak}
                <span className="text-lg text-gray-400 font-normal ml-1">days</span>
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Completion</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                {Math.round((earnedAchievements.length / totalAchievements) * 100)}%
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content - 2 columns on large screens */}
        <div className="lg:col-span-2 space-y-8">
          {/* Category Filter Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Progress by Category</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {achievementsByCategory.map((cat) => (
                <div
                  key={cat.key}
                  className="flex flex-col items-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mb-2">
                    {getCategoryIcon(cat.key)}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{cat.label}</span>
                  <span className="text-xs text-gray-500">
                    {cat.earned}/{cat.total}
                  </span>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${(cat.earned / cat.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* All Achievements Grid */}
          {achievementsByCategory.map((category) => (
            <div key={category.key} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  {getCategoryIcon(category.key)}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{category.label}</h2>
                  <p className="text-sm text-gray-500">
                    {category.earned} of {category.total} earned
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {category.achievements.map((achievement) => {
                  const colors = getAchievementColor(achievement.id, achievement.achieved);
                  const points = getAchievementPoints(achievement.id);
                  const progressPercent = Math.min(100, Math.round((achievement.progress / achievement.target) * 100));

                  return (
                    <div
                      key={achievement.id}
                      className={`relative flex items-start gap-4 p-4 rounded-xl border transition-all ${
                        achievement.achieved
                          ? "border-gray-200 bg-white"
                          : "border-gray-100 bg-gray-50 opacity-75"
                      }`}
                    >
                      {/* Badge Icon */}
                      <div
                        className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ring-2 ${colors.bg} ${colors.text} ${colors.ring}`}
                      >
                        {achievement.achieved ? (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className={`font-semibold ${achievement.achieved ? "text-gray-900" : "text-gray-500"}`}>
                              {achievement.name}
                            </h3>
                            <p className="text-sm text-gray-500 mt-0.5">{achievement.description}</p>
                          </div>
                          <span
                            className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${
                              achievement.achieved
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            +{points} pts
                          </span>
                        </div>

                        {/* Progress */}
                        <div className="mt-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500">
                              {achievement.progress.toLocaleString()} / {achievement.target.toLocaleString()}
                            </span>
                            <span className={achievement.achieved ? "text-green-600 font-medium" : "text-gray-500"}>
                              {progressPercent}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                achievement.achieved ? "bg-green-500" : "bg-blue-500"
                              }`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Achievement date */}
                        {achievement.achieved && achievement.achievedAt && (
                          <p className="text-xs text-gray-400 mt-2">
                            Earned on {new Date(achievement.achievedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recent Achievements */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Achievements</h2>
            {recentAchievements.length > 0 ? (
              <div className="space-y-4">
                {recentAchievements.map((achievement) => {
                  const colors = getAchievementColor(achievement.id, true);
                  return (
                    <div key={achievement.id} className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors.bg} ${colors.text}`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{achievement.name}</p>
                        <p className="text-xs text-gray-500">
                          {achievement.achievedAt
                            ? new Date(achievement.achievedAt).toLocaleDateString()
                            : "Recently earned"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No achievements earned yet. Start reading to unlock badges!</p>
            )}
          </div>

          {/* Next to Earn */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Up Next</h2>
            {nextToEarn.length > 0 ? (
              <div className="space-y-4">
                {nextToEarn.map((achievement) => {
                  const progressPercent = Math.round((achievement.progress / achievement.target) * 100);
                  return (
                    <div key={achievement.id}>
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <p className="font-medium text-gray-900">{achievement.name}</p>
                          <p className="text-xs text-gray-500">{achievement.description}</p>
                        </div>
                        <span className="text-xs font-medium text-blue-600">{progressPercent}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {achievement.target - achievement.progress} more to go
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">All achievements earned! Amazing!</p>
            )}
          </div>

          {/* Points Breakdown */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Points Summary</h2>
            <div className="space-y-3">
              {achievementsByCategory.map((cat) => {
                const earnedPoints = cat.achievements
                  .filter((a) => a.achieved)
                  .reduce((sum, a) => sum + getAchievementPoints(a.id), 0);
                const totalCatPoints = cat.achievements.reduce((sum, a) => sum + getAchievementPoints(a.id), 0);
                const percentage = totalCatPoints > 0 ? Math.round((earnedPoints / totalCatPoints) * 100) : 0;

                return (
                  <div key={cat.key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{cat.label}</span>
                      <span className="text-gray-500">
                        {earnedPoints}/{totalCatPoints}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="pt-3 mt-3 border-t border-gray-100">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-semibold text-purple-600">
                    {totalPoints} / {maxPossiblePoints}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Reading Stats Quick View */}
          <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-xl shadow-md p-6 text-white">
            <h2 className="text-lg font-semibold mb-4">Your Reading Stats</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-blue-100">Books Completed</span>
                <span className="font-semibold">{stats.totalBooksRead}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-100">Pages Read</span>
                <span className="font-semibold">{stats.totalPagesRead.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-100">Reading Time</span>
                <span className="font-semibold">{Math.round(stats.totalReadingTime / 3600)}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-100">Longest Streak</span>
                <span className="font-semibold">{streak.longestStreak} days</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
