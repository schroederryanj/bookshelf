"use client";

interface Stats {
  booksReadThisMonth: number;
  booksReadThisYear: number;
  pagesReadThisWeek: number;
  pagesReadThisMonth: number;
  averageReadingSpeed: number;
  totalReadingTime: number;
  currentStreak: number;
  favoriteGenre?: string;
}

interface StatsSectionProps {
  stats: Stats;
}

export function StatsSection({ stats }: StatsSectionProps) {
  const formatReadingTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const statItems = [
    {
      label: "Books This Year",
      value: stats.booksReadThisYear,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      label: "Pages This Month",
      value: stats.pagesReadThisMonth.toLocaleString(),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      label: "Total Reading Time",
      value: formatReadingTime(stats.totalReadingTime),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Reading Speed",
      value: `${stats.averageReadingSpeed} p/h`,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-md border border-[#e8dfd3] p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-[#A07A55]/10 rounded-lg">
          <svg className="w-5 h-5 text-[#A07A55]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-[#3d2e1f]">Statistics</h2>
      </div>

      <div className="space-y-3">
        {statItems.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-[#fef9ed] rounded-lg"
          >
            <div className="flex items-center gap-2">
              <span className="text-[#A07A55]">{item.icon}</span>
              <span className="text-sm text-[#6b5a4a]">{item.label}</span>
            </div>
            <span className="text-lg font-bold text-[#3d2e1f]">{item.value}</span>
          </div>
        ))}
      </div>

      {/* Quick insights */}
      <div className="mt-4 pt-4 border-t border-[#e8dfd3]">
        <p className="text-xs text-[#6b5a4a]">
          {stats.booksReadThisYear > 0 ? (
            <>
              You have read <span className="font-semibold text-[#3d2e1f]">{stats.booksReadThisYear} books</span> this year.
              {stats.currentStreak > 0 && (
                <> Keep up your <span className="font-semibold text-[#2d5a27]">{stats.currentStreak}-day streak</span>!</>
              )}
            </>
          ) : (
            "Start reading to see your stats grow!"
          )}
        </p>
      </div>
    </div>
  );
}
