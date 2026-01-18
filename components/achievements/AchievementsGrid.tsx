"use client";

import { useState, useMemo } from "react";
import { Achievement, AchievementBadge } from "./AchievementBadge";
import { AchievementCard } from "./AchievementCard";

interface AchievementsGridProps {
  achievements: Achievement[];
  title?: string;
}

type CategoryFilter = Achievement["category"] | "all";
type StatusFilter = "all" | "earned" | "in-progress" | "locked";

const CATEGORY_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All Categories" },
  { value: "milestones", label: "Milestones" },
  { value: "streaks", label: "Reading Streaks" },
  { value: "diversity", label: "Genre Diversity" },
  { value: "speed", label: "Speed Reading" },
  { value: "social", label: "Social" },
  { value: "special", label: "Special" },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All Status" },
  { value: "earned", label: "Earned" },
  { value: "in-progress", label: "In Progress" },
  { value: "locked", label: "Locked" },
];

export function AchievementsGrid({ achievements, title = "Achievements" }: AchievementsGridProps) {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  const filteredAchievements = useMemo(() => {
    return achievements.filter((achievement) => {
      // Category filter
      if (categoryFilter !== "all" && achievement.category !== categoryFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "earned" && !achievement.earned) return false;
        if (statusFilter === "in-progress" && (achievement.earned || achievement.progress === 0)) return false;
        if (statusFilter === "locked" && (achievement.earned || achievement.progress > 0)) return false;
      }

      return true;
    });
  }, [achievements, categoryFilter, statusFilter]);

  // Group achievements by tier for display
  const groupedByTier = useMemo(() => {
    const tiers = ["platinum", "gold", "silver", "bronze"] as const;
    return tiers.map((tier) => ({
      tier,
      achievements: filteredAchievements.filter((a) => a.tier === tier),
    })).filter((group) => group.achievements.length > 0);
  }, [filteredAchievements]);

  const earnedCount = achievements.filter((a) => a.earned).length;
  const totalPoints = achievements
    .filter((a) => a.earned)
    .reduce((sum, a) => sum + a.points, 0);

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
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-center gap-3 mb-1">
          <div className="h-px bg-gradient-to-r from-transparent via-[#A07A55] to-transparent flex-1 max-w-16" />
          <svg
            className="w-6 h-6 text-[#8B6B4F]"
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
          <div className="h-px bg-gradient-to-r from-transparent via-[#A07A55] to-transparent flex-1 max-w-16" />
        </div>
        <h2 className="text-center text-2xl text-[#3d2e1f] tracking-wide">
          {title}
        </h2>
        <p className="text-center text-[#6b5a4a] text-sm mt-1">
          {earnedCount} of {achievements.length} earned - {totalPoints} points
        </p>
      </div>

      {/* Divider */}
      <div className="px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-[#c4a77d] to-transparent" />
      </div>

      {/* Filters */}
      <div className="px-6 py-4">
        <div className="flex flex-wrap gap-3 justify-center">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
            className="px-3 py-2 rounded-lg text-sm bg-white/60 border border-[#c4a77d] text-[#3d2e1f] focus:outline-none focus:ring-2 focus:ring-[#A07A55]/50"
            style={{ fontFamily: "'Georgia', serif" }}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2 rounded-lg text-sm bg-white/60 border border-[#c4a77d] text-[#3d2e1f] focus:outline-none focus:ring-2 focus:ring-[#A07A55]/50"
            style={{ fontFamily: "'Georgia', serif" }}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="px-6 pb-6 space-y-6">
        {groupedByTier.length === 0 ? (
          <div className="text-center py-8 text-[#6b5a4a]">
            No achievements match your filters
          </div>
        ) : (
          groupedByTier.map(({ tier, achievements: tierAchievements }) => (
            <div key={tier}>
              {/* Tier label */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    background:
                      tier === "platinum"
                        ? "#E5E4E2"
                        : tier === "gold"
                        ? "#FFD700"
                        : tier === "silver"
                        ? "#C0C0C0"
                        : "#CD7F32",
                  }}
                />
                <span className="text-sm font-medium text-[#6b5a4a] uppercase tracking-wider">
                  {tier} Tier
                </span>
                <div className="flex-1 h-px bg-[#d4c4b0]" />
              </div>

              {/* Badges grid */}
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4">
                {tierAchievements.map((achievement) => (
                  <div key={achievement.id} className="flex flex-col items-center gap-2">
                    <AchievementBadge
                      achievement={achievement}
                      size="md"
                      onClick={() => setSelectedAchievement(achievement)}
                    />
                    <span
                      className={`text-xs text-center leading-tight ${
                        achievement.earned ? "text-[#3d2e1f]" : "text-[#8b8279]"
                      }`}
                    >
                      {achievement.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="h-2 bg-gradient-to-r from-[#A07A55] via-[#c4a77d] to-[#A07A55]" />

      {/* Achievement detail modal */}
      {selectedAchievement && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setSelectedAchievement(null)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <AchievementCard
              achievement={selectedAchievement}
              onClose={() => setSelectedAchievement(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
