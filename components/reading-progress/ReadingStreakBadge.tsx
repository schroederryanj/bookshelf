"use client";

interface ReadingStreakBadgeProps {
  currentStreak: number;
  longestStreak: number;
  size?: "sm" | "md" | "lg";
  showLongest?: boolean;
}

export function ReadingStreakBadge({
  currentStreak,
  longestStreak,
  size = "md",
  showLongest = true,
}: ReadingStreakBadgeProps) {
  const isOnFire = currentStreak >= 7;
  const isMilestone = currentStreak % 10 === 0 && currentStreak > 0;

  const sizeClasses = {
    sm: {
      container: "p-3",
      icon: "w-6 h-6",
      number: "text-2xl",
      label: "text-xs",
    },
    md: {
      container: "p-4",
      icon: "w-8 h-8",
      number: "text-3xl",
      label: "text-sm",
    },
    lg: {
      container: "p-6",
      icon: "w-10 h-10",
      number: "text-4xl",
      label: "text-base",
    },
  };

  const classes = sizeClasses[size];

  return (
    <div
      className={`${classes.container} rounded-lg text-center relative overflow-hidden`}
      style={{
        background: isOnFire
          ? "linear-gradient(135deg, #ffd54f 0%, #ffb300 100%)"
          : "linear-gradient(135deg, #fef9ed 0%, #f5ebe0 100%)",
        border: `2px solid ${isOnFire ? "#f57c00" : "#c4a77d"}`,
        boxShadow: isOnFire
          ? "0 4px 20px rgba(245, 124, 0, 0.3)"
          : "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      {isMilestone && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full animate-pulse bg-gradient-to-br from-yellow-200/30 to-transparent" />
        </div>
      )}

      <div className="relative z-10">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div
            className={`${classes.icon} ${
              isOnFire ? "text-orange-600" : "text-[#8B6B4F]"
            }`}
          >
            {isOnFire ? (
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.66 11.2c-.23-.3-.51-.56-.77-.82-.67-.6-1.43-1.03-2.07-1.66C13.33 7.26 13 4.85 13.95 3c-.95.23-1.78.75-2.49 1.32-2.59 2.08-3.61 5.75-2.39 8.9.04.1.08.2.08.33 0 .22-.15.42-.35.5-.23.1-.47.04-.66-.12a.58.58 0 01-.14-.17c-1.13-1.43-1.31-3.48-.55-5.12C5.78 10 4.87 12.3 5 14.47c.06.5.12 1 .29 1.5.14.6.41 1.2.71 1.73 1.08 1.73 2.95 2.97 4.96 3.22 2.14.27 4.43-.12 6.07-1.6 1.83-1.66 2.47-4.32 1.53-6.6l-.13-.26c-.21-.46-.77-1.26-.77-1.26m-3.16 6.3c-.28.24-.74.5-1.1.6-1.12.4-2.24-.16-2.9-.82 1.19-.28 1.9-1.16 2.11-2.05.17-.8-.15-1.46-.28-2.23-.12-.74-.1-1.37.17-2.06.19.38.39.76.63 1.06.77 1 1.98 1.44 2.24 2.8.04.14.06.28.06.43.03.82-.33 1.72-.93 2.27z" />
              </svg>
            ) : (
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            )}
          </div>
        </div>

        <div className={`${classes.number} font-bold ${isOnFire ? "text-orange-900" : "text-[#3d2e1f]"}`}>
          {currentStreak}
        </div>

        <div className={`${classes.label} ${isOnFire ? "text-orange-800" : "text-[#6b5a4a]"} uppercase tracking-wider font-medium`}>
          Day Streak
        </div>

        {isOnFire && (
          <div className="mt-2 text-xs text-orange-900 font-semibold">
            On Fire!
          </div>
        )}

        {isMilestone && (
          <div className="mt-1 text-xs text-[#2d5a27] font-semibold animate-bounce">
            Milestone Reached!
          </div>
        )}

        {showLongest && longestStreak > currentStreak && (
          <div className="mt-3 pt-3 border-t border-[#c4a77d]/30">
            <div className="text-xs text-[#6b5a4a] uppercase tracking-wider">
              Longest Streak
            </div>
            <div className="text-lg font-bold text-[#8b5a2b]">
              {longestStreak} days
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
