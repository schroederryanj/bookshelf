"use client";

import { useMemo } from "react";
import { Achievement, AchievementBadge, AchievementTier } from "./AchievementBadge";

interface AchievementsSummaryProps {
  achievements: Achievement[];
  maxRecent?: number;
  onViewAll?: () => void;
}

const TIER_COLORS = {
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#FFD700",
  platinum: "#E5E4E2",
};

export function AchievementsSummary({
  achievements,
  maxRecent = 3,
  onViewAll,
}: AchievementsSummaryProps) {
  const stats = useMemo(() => {
    const earned = achievements.filter((a) => a.earned);
    const inProgress = achievements.filter((a) => !a.earned && a.progress > 0);
    const totalPoints = earned.reduce((sum, a) => sum + a.points, 0);
    const maxPoints = achievements.reduce((sum, a) => sum + a.points, 0);

    // Get recently earned (sorted by earned date)
    const recentlyEarned = earned
      .filter((a) => a.earnedDate)
      .sort((a, b) => {
        const dateA = a.earnedDate ? new Date(a.earnedDate).getTime() : 0;
        const dateB = b.earnedDate ? new Date(b.earnedDate).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, maxRecent);

    // Find next closest achievement to earn
    const nextClosest = inProgress
      .map((a) => ({
        ...a,
        percentComplete: (a.progress / a.maxProgress) * 100,
      }))
      .sort((a, b) => b.percentComplete - a.percentComplete)[0];

    // Count by tier
    const tierCounts = {
      platinum: earned.filter((a) => a.tier === "platinum").length,
      gold: earned.filter((a) => a.tier === "gold").length,
      silver: earned.filter((a) => a.tier === "silver").length,
      bronze: earned.filter((a) => a.tier === "bronze").length,
    };

    return {
      earnedCount: earned.length,
      totalCount: achievements.length,
      totalPoints,
      maxPoints,
      recentlyEarned,
      nextClosest,
      tierCounts,
    };
  }, [achievements, maxRecent]);

  const completionPercent = Math.round(
    (stats.earnedCount / stats.totalCount) * 100
  );

  return (
    <div
      className="w-full overflow-hidden rounded-sm"
      style={{
        background: "linear-gradient(135deg, #fef9ed 0%, #f5ebe0 100%)",
        fontFamily: "'Georgia', serif",
        border: "2px solid #A07A55",
        boxShadow:
          "0 10px 30px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.5)",
      }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-[#8B6B4F]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"
              />
            </svg>
            <h3 className="text-lg font-semibold text-[#3d2e1f]">Achievements</h3>
          </div>
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-sm text-[#8b5a2b] hover:text-[#a67c52] font-medium transition-colors"
            >
              View All
            </button>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="px-5">
        <div className="h-px bg-gradient-to-r from-transparent via-[#c4a77d] to-transparent" />
      </div>

      {/* Main stats */}
      <div className="px-5 py-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Earned count */}
          <div className="text-center p-3 rounded-lg bg-white/40">
            <div className="text-2xl font-bold text-[#3d2e1f]">
              {stats.earnedCount}
              <span className="text-lg text-[#6b5a4a] font-normal">
                /{stats.totalCount}
              </span>
            </div>
            <div className="text-xs text-[#6b5a4a] uppercase tracking-wider mt-1">
              Earned
            </div>
          </div>

          {/* Total points */}
          <div className="text-center p-3 rounded-lg bg-white/40">
            <div className="text-2xl font-bold text-[#FFD700] flex items-center justify-center gap-1">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              {stats.totalPoints}
            </div>
            <div className="text-xs text-[#6b5a4a] uppercase tracking-wider mt-1">
              Points
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-[#6b5a4a] mb-2">
            <span>Completion</span>
            <span>{completionPercent}%</span>
          </div>
          <div className="h-2.5 bg-[#d4c4b0] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${completionPercent}%`,
                background: "linear-gradient(90deg, #CD7F32, #FFD700)",
              }}
            />
          </div>
        </div>

        {/* Tier breakdown */}
        <div className="mt-4 flex justify-center gap-4">
          {(["platinum", "gold", "silver", "bronze"] as AchievementTier[]).map((tier) => (
            <div key={tier} className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: TIER_COLORS[tier] }}
              />
              <span className="text-sm text-[#3d2e1f] font-medium">
                {stats.tierCounts[tier]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent achievements */}
      {stats.recentlyEarned.length > 0 && (
        <>
          <div className="px-5">
            <div className="h-px bg-gradient-to-r from-transparent via-[#c4a77d] to-transparent" />
          </div>
          <div className="px-5 py-4">
            <div className="text-xs text-[#6b5a4a] uppercase tracking-wider mb-3">
              Recently Earned
            </div>
            <div className="flex gap-3 justify-center">
              {stats.recentlyEarned.map((achievement) => (
                <div key={achievement.id} className="flex flex-col items-center gap-1">
                  <AchievementBadge
                    achievement={achievement}
                    size="sm"
                    showProgress={false}
                  />
                  <span className="text-xs text-[#3d2e1f] text-center leading-tight max-w-[60px] truncate">
                    {achievement.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Next closest */}
      {stats.nextClosest && (
        <>
          <div className="px-5">
            <div className="h-px bg-gradient-to-r from-transparent via-[#c4a77d] to-transparent" />
          </div>
          <div className="px-5 py-4">
            <div className="text-xs text-[#6b5a4a] uppercase tracking-wider mb-3">
              Almost There
            </div>
            <div className="flex items-center gap-3">
              <AchievementBadge
                achievement={stats.nextClosest}
                size="sm"
                showProgress={true}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#3d2e1f] truncate">
                  {stats.nextClosest.name}
                </div>
                <div className="text-xs text-[#6b5a4a] mt-0.5">
                  {stats.nextClosest.progress} / {stats.nextClosest.maxProgress}
                </div>
                <div className="h-1.5 bg-[#d4c4b0] rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${stats.nextClosest.percentComplete}%`,
                      background: TIER_COLORS[stats.nextClosest.tier],
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      <div className="h-1.5 bg-gradient-to-r from-[#A07A55] via-[#c4a77d] to-[#A07A55]" />
    </div>
  );
}
