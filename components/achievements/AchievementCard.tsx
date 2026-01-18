"use client";

import { Achievement, AchievementBadge, AchievementTier } from "./AchievementBadge";

interface AchievementCardProps {
  achievement: Achievement;
  onClose?: () => void;
}

const TIER_LABELS: Record<AchievementTier, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

const TIER_COLORS = {
  bronze: { bg: "#CD7F32", text: "#5D3A1A" },
  silver: { bg: "#C0C0C0", text: "#404040" },
  gold: { bg: "#FFD700", text: "#5D4E1A" },
  platinum: { bg: "#E5E4E2", text: "#404040" },
};

const CATEGORY_LABELS: Record<Achievement["category"], string> = {
  milestones: "Milestone",
  streaks: "Reading Streak",
  diversity: "Genre Diversity",
  speed: "Speed Reading",
  social: "Social",
  special: "Special",
};

export function AchievementCard({ achievement, onClose }: AchievementCardProps) {
  const progressPercent = Math.min(
    (achievement.progress / achievement.maxProgress) * 100,
    100
  );
  const tierColors = TIER_COLORS[achievement.tier];

  return (
    <div
      className="w-full max-w-sm overflow-hidden rounded-sm"
      style={{
        background: "linear-gradient(135deg, #fef9ed 0%, #f5ebe0 100%)",
        fontFamily: "'Georgia', serif",
        border: "2px solid #A07A55",
        boxShadow:
          "0 15px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.5)",
      }}
    >
      {/* Header */}
      <div className="relative px-6 pt-6 pb-4">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 transition-colors"
          >
            <svg
              className="w-4 h-4 text-[#3d2e1f]"
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
        )}

        {/* Badge and title */}
        <div className="flex items-start gap-4">
          <AchievementBadge achievement={achievement} size="lg" showProgress={false} />
          <div className="flex-1 min-w-0 pt-2">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Tier badge */}
              <span
                className="px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider"
                style={{
                  background: tierColors.bg,
                  color: tierColors.text,
                }}
              >
                {TIER_LABELS[achievement.tier]}
              </span>
              {/* Category */}
              <span className="text-xs text-[#6b5a4a] uppercase tracking-wider">
                {CATEGORY_LABELS[achievement.category]}
              </span>
            </div>
            <h3 className="text-xl font-semibold text-[#3d2e1f] mt-2 leading-tight">
              {achievement.name}
            </h3>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-[#c4a77d] to-transparent" />
      </div>

      {/* Content */}
      <div className="px-6 py-4 space-y-4">
        {/* Description */}
        <p className="text-[#4a3f35] text-sm leading-relaxed">
          {achievement.description}
        </p>

        {/* Requirement */}
        <div className="p-3 rounded-lg bg-white/40">
          <div className="text-xs text-[#6b5a4a] uppercase tracking-wider mb-1">
            Requirement
          </div>
          <div className="text-sm text-[#3d2e1f] font-medium">
            {achievement.requirement}
          </div>
        </div>

        {/* Progress */}
        {!achievement.earned && (
          <div>
            <div className="flex justify-between text-xs text-[#6b5a4a] mb-2">
              <span>Progress</span>
              <span>
                {achievement.progress} / {achievement.maxProgress}
              </span>
            </div>
            <div className="h-3 bg-[#d4c4b0] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPercent}%`,
                  background: `linear-gradient(90deg, ${tierColors.bg} 0%, ${tierColors.bg}dd 100%)`,
                }}
              />
            </div>
            <div className="text-center text-xs text-[#6b5a4a] mt-1">
              {Math.round(progressPercent)}% complete
            </div>
          </div>
        )}

        {/* Earned date */}
        {achievement.earned && achievement.earnedDate && (
          <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-[#2d5a27]/10">
            <svg
              className="w-5 h-5 text-[#2d5a27]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm text-[#2d5a27] font-medium">
              Earned on {achievement.earnedDate}
            </span>
          </div>
        )}

        {/* Points */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-[#6b5a4a]">Points</span>
          <div className="flex items-center gap-1">
            <svg
              className="w-5 h-5 text-[#FFD700]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span className="text-lg font-bold text-[#3d2e1f]">
              {achievement.points}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="h-1.5 bg-gradient-to-r from-[#A07A55] via-[#c4a77d] to-[#A07A55]" />
    </div>
  );
}
