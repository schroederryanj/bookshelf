"use client";

import { useEffect, useState } from "react";
import { Achievement, AchievementTier } from "./AchievementBadge";

interface AchievementToastProps {
  achievement: Achievement;
  onClose: () => void;
  duration?: number;
}

const TIER_COLORS = {
  bronze: { bg: "#CD7F32", border: "#A65E20", text: "#5D3A1A" },
  silver: { bg: "#C0C0C0", border: "#A0A0A0", text: "#404040" },
  gold: { bg: "#FFD700", border: "#DAA520", text: "#5D4E1A" },
  platinum: { bg: "#E5E4E2", border: "#B8B8B8", text: "#404040" },
};

const TIER_LABELS: Record<AchievementTier, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

const CATEGORY_ICONS: Record<Achievement["category"], string> = {
  milestones: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  streaks: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z",
  diversity: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
  speed: "M13 10V3L4 14h7v7l9-11h-7z",
  social: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  special: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
};

export function AchievementToast({
  achievement,
  onClose,
  duration = 5000,
}: AchievementToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const tierColors = TIER_COLORS[achievement.tier];

  useEffect(() => {
    // Trigger entrance animation
    const showTimer = setTimeout(() => setIsVisible(true), 50);

    // Auto-close after duration
    const closeTimer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(closeTimer);
    };
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <div
      className={`fixed top-4 right-4 z-[100] transition-all duration-300 ${
        isVisible && !isExiting
          ? "translate-x-0 opacity-100"
          : "translate-x-full opacity-0"
      }`}
      style={{ fontFamily: "'Georgia', serif" }}
    >
      <div
        className="relative overflow-hidden rounded-lg max-w-sm"
        style={{
          background: "linear-gradient(135deg, #fef9ed 0%, #f5ebe0 100%)",
          border: `2px solid ${tierColors.border}`,
          boxShadow: `0 10px 40px rgba(0,0,0,0.3), 0 0 20px ${tierColors.bg}40`,
        }}
      >
        {/* Animated shimmer overlay */}
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${tierColors.bg}30 50%, transparent 100%)`,
            animation: "shimmer 2s ease-in-out infinite",
          }}
        />

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 transition-colors z-10"
        >
          <svg
            className="w-3.5 h-3.5 text-[#3d2e1f]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="relative z-10 p-4">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <svg
              className="w-5 h-5"
              style={{ color: tierColors.bg }}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span className="text-sm font-semibold text-[#2d5a27] uppercase tracking-wider">
              Achievement Unlocked!
            </span>
          </div>

          {/* Content */}
          <div className="flex items-center gap-4">
            {/* Badge */}
            <div
              className="shrink-0 w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${tierColors.bg} 0%, ${tierColors.border} 100%)`,
                border: `3px solid ${tierColors.border}`,
                animation: "pulse-glow 1.5s ease-in-out infinite",
              }}
            >
              <svg
                className="w-8 h-8"
                style={{ color: tierColors.text }}
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

            {/* Text */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider"
                  style={{
                    background: tierColors.bg,
                    color: tierColors.text,
                  }}
                >
                  {TIER_LABELS[achievement.tier]}
                </span>
              </div>
              <h4 className="text-lg font-semibold text-[#3d2e1f] leading-tight">
                {achievement.name}
              </h4>
              <p className="text-xs text-[#6b5a4a] mt-1">
                +{achievement.points} points
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="h-1"
          style={{
            background: `linear-gradient(90deg, ${tierColors.border}, ${tierColors.bg}, ${tierColors.border})`,
          }}
        />
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        @keyframes pulse-glow {
          0%,
          100% {
            box-shadow: 0 0 10px ${tierColors.bg}60;
          }
          50% {
            box-shadow: 0 0 25px ${tierColors.bg}90;
          }
        }
      `}</style>
    </div>
  );
}
