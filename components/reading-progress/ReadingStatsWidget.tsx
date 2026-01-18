"use client";

interface ReadingStats {
  booksReadThisMonth: number;
  booksReadThisYear: number;
  pagesReadThisWeek: number;
  pagesReadThisMonth: number;
  averageReadingSpeed: number; // pages per hour
  totalReadingTime: number; // in minutes
  currentStreak: number;
  favoriteGenre?: string;
}

interface ReadingStatsWidgetProps {
  stats: ReadingStats;
  compact?: boolean;
}

export function ReadingStatsWidget({ stats, compact = false }: ReadingStatsWidgetProps) {
  const formatReadingTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const StatItem = ({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) => (
    <div className={`${compact ? "p-3" : "p-4"} rounded-lg bg-white/40`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="text-[#8B6B4F]">{icon}</div>
        <div className="text-xs text-[#6b5a4a] uppercase tracking-wider">{label}</div>
      </div>
      <div className={`${compact ? "text-xl" : "text-2xl"} font-bold text-[#3d2e1f]`}>
        {value}
      </div>
    </div>
  );

  return (
    <div
      className={`${compact ? "p-4" : "p-6"} rounded-lg`}
      style={{
        background: "linear-gradient(135deg, #fef9ed 0%, #f5ebe0 100%)",
        border: "2px solid #c4a77d",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <svg className="w-6 h-6 text-[#8B6B4F]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
          <path d="M21 7h-6.8l.2-.8C14.6 5.5 14 4.9 13.3 4.7L6.5 3.2C5.8 3 5 3.5 4.8 4.2l-3 10.5c-.2.7.3 1.5 1 1.7l1.7.5v.1c0 1.7 1.3 3 3 3s3-1.3 3-3h6c0 1.7 1.3 3 3 3s3-1.3 3-3h1c.6 0 1-.4 1-1V8c0-.6-.4-1-1-1z" />
        </svg>
        <h3 className="text-xl font-semibold text-[#3d2e1f]">Reading Statistics</h3>
      </div>

      <div className={`grid ${compact ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3"} gap-3`}>
        <StatItem
          label="This Month"
          value={stats.booksReadThisMonth}
          icon={
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          }
        />

        <StatItem
          label="This Year"
          value={stats.booksReadThisYear}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />

        <StatItem
          label="Pages/Week"
          value={stats.pagesReadThisWeek}
          icon={
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
            </svg>
          }
        />

        <StatItem
          label="Reading Time"
          value={formatReadingTime(stats.totalReadingTime)}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <StatItem
          label="Reading Speed"
          value={`${stats.averageReadingSpeed} p/h`}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />

        <StatItem
          label="Streak"
          value={`${stats.currentStreak} days`}
          icon={
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.66 11.2c-.23-.3-.51-.56-.77-.82-.67-.6-1.43-1.03-2.07-1.66C13.33 7.26 13 4.85 13.95 3c-.95.23-1.78.75-2.49 1.32-2.59 2.08-3.61 5.75-2.39 8.9.04.1.08.2.08.33 0 .22-.15.42-.35.5-.23.1-.47.04-.66-.12a.58.58 0 01-.14-.17c-1.13-1.43-1.31-3.48-.55-5.12C5.78 10 4.87 12.3 5 14.47c.06.5.12 1 .29 1.5.14.6.41 1.2.71 1.73 1.08 1.73 2.95 2.97 4.96 3.22 2.14.27 4.43-.12 6.07-1.6 1.83-1.66 2.47-4.32 1.53-6.6l-.13-.26c-.21-.46-.77-1.26-.77-1.26m-3.16 6.3c-.28.24-.74.5-1.1.6-1.12.4-2.24-.16-2.9-.82 1.19-.28 1.9-1.16 2.11-2.05.17-.8-.15-1.46-.28-2.23-.12-.74-.1-1.37.17-2.06.19.38.39.76.63 1.06.77 1 1.98 1.44 2.24 2.8.04.14.06.28.06.43.03.82-.33 1.72-.93 2.27z" />
            </svg>
          }
        />
      </div>

      {stats.favoriteGenre && (
        <div className="mt-4 pt-4 border-t border-[#c4a77d]/30 text-center">
          <div className="text-xs text-[#6b5a4a] uppercase tracking-wider mb-1">
            Favorite Genre
          </div>
          <div className="text-lg font-semibold text-[#3d2e1f]">
            {stats.favoriteGenre}
          </div>
        </div>
      )}
    </div>
  );
}
