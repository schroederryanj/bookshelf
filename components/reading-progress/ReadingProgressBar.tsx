"use client";

interface ReadingProgressBarProps {
  currentPage: number;
  totalPages: number;
  size?: "sm" | "md" | "lg";
  showPercentage?: boolean;
  className?: string;
}

export function ReadingProgressBar({
  currentPage,
  totalPages,
  size = "md",
  showPercentage = true,
  className = "",
}: ReadingProgressBarProps) {
  const percentage = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;
  const clampedPercentage = Math.min(100, Math.max(0, percentage));

  const heightClasses = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  return (
    <div className={className}>
      {showPercentage && (
        <div className="flex justify-between text-xs text-[#6b5a4a] mb-1.5">
          <span>
            {currentPage} / {totalPages} pages
          </span>
          <span className="font-medium">{clampedPercentage}%</span>
        </div>
      )}
      <div
        className={`${heightClasses[size]} bg-[#d4c4b0] rounded-full overflow-hidden shadow-inner`}
      >
        <div
          className="h-full bg-gradient-to-r from-[#2d5a27] to-[#4a7c42] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${clampedPercentage}%` }}
        />
      </div>
    </div>
  );
}
