"use client";

import { useState } from "react";

interface Goal {
  id?: number;
  type: "books_per_month" | "books_per_year" | "pages_per_day";
  target: number;
  current: number;
  startDate: string;
  endDate?: string;
}

interface GoalsSectionProps {
  goals: Goal[];
}

type GoalType = "books_per_month" | "books_per_year" | "pages_per_day";

export function GoalsSection({ goals }: GoalsSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGoal, setNewGoal] = useState<{ type: GoalType; target: number }>({
    type: "books_per_month",
    target: 4,
  });
  const [saving, setSaving] = useState(false);

  const getGoalLabel = (type: Goal["type"]) => {
    switch (type) {
      case "books_per_month":
        return "Books / Month";
      case "books_per_year":
        return "Books / Year";
      case "pages_per_day":
        return "Pages / Day";
    }
  };

  const getGoalIcon = (type: Goal["type"]) => {
    switch (type) {
      case "books_per_month":
      case "books_per_year":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
      case "pages_per_day":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  const handleAddGoal = async () => {
    setSaving(true);
    try {
      const now = new Date();
      let period: string;
      let endDate: Date;

      if (newGoal.type === "books_per_year") {
        period = now.getFullYear().toString();
        endDate = new Date(now.getFullYear(), 11, 31);
      } else if (newGoal.type === "books_per_month") {
        period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      } else {
        period = now.toISOString().split("T")[0];
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }

      const response = await fetch("/api/reading-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalType: newGoal.type.toUpperCase(),
          target: newGoal.target,
          period,
          startDate: now.toISOString(),
          endDate: endDate.toISOString(),
        }),
      });

      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to add goal:", error);
    } finally {
      setSaving(false);
      setShowAddForm(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-[#e8dfd3] p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#3d2e1f]">Reading Goals</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="p-1.5 text-[#A07A55] hover:bg-[#A07A55]/10 rounded-md transition-colors"
          title="Add goal"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Add Goal Form */}
      {showAddForm && (
        <div className="mb-4 p-4 bg-[#fef9ed] rounded-lg border border-[#e8dfd3]">
          <h3 className="text-sm font-medium text-[#3d2e1f] mb-3">New Goal</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-[#6b5a4a] mb-1">Type</label>
              <select
                value={newGoal.type}
                onChange={(e) => setNewGoal({ ...newGoal, type: e.target.value as GoalType })}
                className="w-full px-3 py-2 text-sm border border-[#c4a77d] rounded-md focus:outline-none focus:ring-2 focus:ring-[#A07A55] bg-white"
              >
                <option value="books_per_month">Books per Month</option>
                <option value="books_per_year">Books per Year</option>
                <option value="pages_per_day">Pages per Day</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#6b5a4a] mb-1">Target</label>
              <input
                type="number"
                value={newGoal.target}
                onChange={(e) => setNewGoal({ ...newGoal, target: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-sm border border-[#c4a77d] rounded-md focus:outline-none focus:ring-2 focus:ring-[#A07A55] bg-white"
                min="1"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddGoal}
                disabled={saving}
                className="flex-1 px-3 py-2 bg-[#2d5a27] text-white text-sm font-medium rounded-md hover:bg-[#4a7c42] transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Add Goal"}
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-3 py-2 bg-[#6b5a4a] text-white text-sm font-medium rounded-md hover:bg-[#3d2e1f] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Goals List */}
      {goals.length === 0 ? (
        <div className="text-center py-6 bg-[#fef9ed] rounded-lg border-2 border-dashed border-[#d4c4b0]">
          <svg className="w-10 h-10 mx-auto text-[#d4c4b0] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-sm text-[#6b5a4a]">No goals set</p>
          <p className="text-xs text-[#8b5a2b]">Add a goal to track your progress</p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal, index) => {
            const percentage = Math.min(100, Math.round((goal.current / goal.target) * 100));
            const isComplete = goal.current >= goal.target;

            return (
              <div
                key={goal.id || index}
                className={`p-4 rounded-lg ${
                  isComplete
                    ? "bg-[#e8f5e9] border border-[#2d5a27]/30"
                    : "bg-[#fef9ed] border border-[#e8dfd3]"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-1.5 rounded-full ${isComplete ? "bg-[#2d5a27] text-white" : "bg-[#A07A55]/20 text-[#A07A55]"}`}>
                    {getGoalIcon(goal.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#3d2e1f]">{getGoalLabel(goal.type)}</p>
                    <p className="text-lg font-bold text-[#3d2e1f]">
                      {goal.current} / {goal.target}
                    </p>
                  </div>
                  {isComplete && (
                    <svg className="w-6 h-6 text-[#2d5a27]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="h-2 bg-[#d4c4b0] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isComplete
                        ? "bg-gradient-to-r from-[#2d5a27] to-[#4a7c42]"
                        : "bg-gradient-to-r from-[#A07A55] to-[#8B6B4F]"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="text-right text-xs text-[#6b5a4a] mt-1">{percentage}%</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
