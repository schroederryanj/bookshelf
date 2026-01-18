"use client";

import { useState } from "react";

export interface ReadingGoal {
  id?: number;
  type: "books_per_month" | "books_per_year" | "pages_per_day";
  target: number;
  current: number;
  startDate: string;
  endDate?: string;
}

interface ReadingGoalCardProps {
  goal: ReadingGoal;
  onUpdate?: (goal: ReadingGoal) => void;
  onDelete?: (goalId: number) => void;
  editable?: boolean;
}

export function ReadingGoalCard({
  goal,
  onUpdate,
  onDelete,
  editable = false,
}: ReadingGoalCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTarget, setEditedTarget] = useState(goal.target);

  const percentage = Math.min(100, Math.round((goal.current / goal.target) * 100));
  const isComplete = goal.current >= goal.target;

  const getGoalLabel = () => {
    switch (goal.type) {
      case "books_per_month":
        return "Books per Month";
      case "books_per_year":
        return "Books per Year";
      case "pages_per_day":
        return "Pages per Day";
    }
  };

  const getGoalIcon = () => {
    switch (goal.type) {
      case "books_per_month":
      case "books_per_year":
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
      case "pages_per_day":
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
          </svg>
        );
    }
  };

  const handleSave = () => {
    if (onUpdate && editedTarget !== goal.target) {
      onUpdate({ ...goal, target: editedTarget });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedTarget(goal.target);
    setIsEditing(false);
  };

  return (
    <div
      className="p-5 rounded-lg"
      style={{
        background: isComplete
          ? "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)"
          : "linear-gradient(135deg, #fef9ed 0%, #f5ebe0 100%)",
        border: `2px solid ${isComplete ? "#2d5a27" : "#c4a77d"}`,
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-full ${
              isComplete ? "bg-[#2d5a27] text-white" : "bg-[#8B6B4F] text-white"
            }`}
          >
            {getGoalIcon()}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#3d2e1f]">
              {getGoalLabel()}
            </h3>
            <p className="text-xs text-[#6b5a4a]">
              Started: {new Date(goal.startDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        {editable && (
          <div className="flex gap-1">
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1.5 rounded hover:bg-black/10 transition-colors"
                  title="Edit goal"
                >
                  <svg className="w-4 h-4 text-[#6b5a4a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                {goal.id && onDelete && (
                  <button
                    onClick={() => onDelete(goal.id!)}
                    className="p-1.5 rounded hover:bg-red-100 transition-colors"
                    title="Delete goal"
                  >
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </>
            ) : (
              <div className="flex gap-1">
                <button
                  onClick={handleSave}
                  className="p-1.5 rounded bg-[#2d5a27] text-white hover:bg-[#4a7c42] transition-colors"
                  title="Save"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  onClick={handleCancel}
                  className="p-1.5 rounded bg-[#6b5a4a] text-white hover:bg-[#3d2e1f] transition-colors"
                  title="Cancel"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="mb-3">
          <label className="text-sm text-[#6b5a4a] block mb-1">Target:</label>
          <input
            type="number"
            value={editedTarget}
            onChange={(e) => setEditedTarget(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-[#c4a77d] rounded focus:outline-none focus:ring-2 focus:ring-[#8B6B4F]"
            min="1"
          />
        </div>
      ) : (
        <div className="text-center mb-3">
          <div className="text-3xl font-bold text-[#3d2e1f]">
            {goal.current} / {goal.target}
          </div>
          <div className="text-sm text-[#6b5a4a]">
            {goal.type === "pages_per_day" ? "pages" : "books"}
          </div>
        </div>
      )}

      <div className="relative">
        <div className="h-3 bg-[#d4c4b0] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isComplete
                ? "bg-gradient-to-r from-[#2d5a27] to-[#4a7c42]"
                : "bg-gradient-to-r from-[#8b5a2b] to-[#a67c52]"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="text-right text-xs text-[#6b5a4a] mt-1 font-medium">
          {percentage}%
        </div>
      </div>

      {isComplete && (
        <div className="mt-3 flex items-center justify-center gap-2 text-[#2d5a27] text-sm font-medium">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Goal Achieved!
        </div>
      )}
    </div>
  );
}
