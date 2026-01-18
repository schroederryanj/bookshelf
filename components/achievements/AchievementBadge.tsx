"use client";

export type AchievementTier = "bronze" | "silver" | "gold" | "platinum";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: AchievementTier;
  category: "milestones" | "streaks" | "diversity" | "speed" | "social" | "special";
  points: number;
  requirement: string;
  progress: number;
  maxProgress: number;
  earned: boolean;
  earnedDate?: string;
}

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: "sm" | "md" | "lg";
  showProgress?: boolean;
  onClick?: () => void;
}

const TIER_COLORS = {
  bronze: {
    bg: "#CD7F32",
    border: "#A65E20",
    text: "#5D3A1A",
    glow: "rgba(205, 127, 50, 0.4)",
  },
  silver: {
    bg: "#C0C0C0",
    border: "#A0A0A0",
    text: "#404040",
    glow: "rgba(192, 192, 192, 0.4)",
  },
  gold: {
    bg: "#FFD700",
    border: "#DAA520",
    text: "#5D4E1A",
    glow: "rgba(255, 215, 0, 0.5)",
  },
  platinum: {
    bg: "#E5E4E2",
    border: "#B8B8B8",
    text: "#404040",
    glow: "rgba(229, 228, 226, 0.5)",
  },
};

const CATEGORY_ICONS: Record<Achievement["category"], string> = {
  milestones: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  streaks: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z",
  diversity: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
  speed: "M13 10V3L4 14h7v7l9-11h-7z",
  social: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  special: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
};

export function AchievementBadge({
  achievement,
  size = "md",
  showProgress = true,
  onClick,
}: AchievementBadgeProps) {
  const tierColors = TIER_COLORS[achievement.tier];
  const progressPercent = Math.min(
    (achievement.progress / achievement.maxProgress) * 100,
    100
  );

  const sizeClasses = {
    sm: {
      container: "w-16 h-16",
      icon: "w-6 h-6",
      ring: "w-14 h-14",
      strokeWidth: 3,
    },
    md: {
      container: "w-20 h-20",
      icon: "w-8 h-8",
      ring: "w-18 h-18",
      strokeWidth: 4,
    },
    lg: {
      container: "w-24 h-24",
      icon: "w-10 h-10",
      ring: "w-22 h-22",
      strokeWidth: 5,
    },
  };

  const classes = sizeClasses[size];
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div
      className={`relative ${classes.container} flex items-center justify-center cursor-pointer transition-transform duration-200 hover:scale-110`}
      onClick={onClick}
      title={achievement.name}
    >
      {/* Outer glow for earned badges */}
      {achievement.earned && (
        <div
          className="absolute inset-0 rounded-full animate-pulse"
          style={{
            background: `radial-gradient(circle, ${tierColors.glow} 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Progress ring (SVG) */}
      {showProgress && !achievement.earned && (
        <svg
          className="absolute inset-0 -rotate-90"
          viewBox="0 0 100 100"
        >
          {/* Background ring */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#d4c4b0"
            strokeWidth={classes.strokeWidth}
          />
          {/* Progress ring */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={tierColors.bg}
            strokeWidth={classes.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500"
          />
        </svg>
      )}

      {/* Badge background */}
      <div
        className={`absolute rounded-full flex items-center justify-center transition-all duration-300 ${
          achievement.earned ? "shadow-lg" : "opacity-50"
        }`}
        style={{
          width: size === "sm" ? "48px" : size === "md" ? "60px" : "72px",
          height: size === "sm" ? "48px" : size === "md" ? "60px" : "72px",
          background: achievement.earned
            ? `linear-gradient(135deg, ${tierColors.bg} 0%, ${tierColors.border} 100%)`
            : "linear-gradient(135deg, #e0d5c8 0%, #c4b9ad 100%)",
          border: `2px solid ${achievement.earned ? tierColors.border : "#a09588"}`,
          boxShadow: achievement.earned
            ? `0 4px 12px ${tierColors.glow}, inset 0 1px 0 rgba(255,255,255,0.3)`
            : "inset 0 1px 0 rgba(255,255,255,0.2)",
        }}
      >
        {/* Icon */}
        <svg
          className={`${classes.icon} ${
            achievement.earned ? "" : "opacity-40"
          }`}
          style={{ color: achievement.earned ? tierColors.text : "#8b8279" }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d={CATEGORY_ICONS[achievement.category]}
          />
        </svg>
      </div>

      {/* Lock icon for locked badges */}
      {!achievement.earned && achievement.progress === 0 && (
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#6b5a4a] rounded-full flex items-center justify-center">
          <svg
            className="w-3 h-3 text-[#fef9ed]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
      )}

      {/* Checkmark for earned badges */}
      {achievement.earned && (
        <div
          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #2d5a27 0%, #4a7c42 100%)",
            border: "2px solid #fef9ed",
          }}
        >
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
