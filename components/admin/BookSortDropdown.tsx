"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export type SortOption =
  | "dateAdded-desc"
  | "dateAdded-asc"
  | "dateFinished-desc"
  | "dateFinished-asc"
  | "rating-desc"
  | "rating-asc"
  | "author-asc"
  | "author-desc"
  | "pages-desc"
  | "pages-asc"
  | "title-asc"
  | "title-desc";

type BookSortDropdownProps = {
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  className?: string;
};

const sortOptions: { value: SortOption; label: string; icon: string }[] = [
  {
    value: "dateAdded-desc",
    label: "Newest Added",
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
  },
  {
    value: "dateAdded-asc",
    label: "Oldest Added",
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
  },
  {
    value: "dateFinished-desc",
    label: "Recently Finished",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
  },
  {
    value: "dateFinished-asc",
    label: "First Finished",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
  },
  {
    value: "rating-desc",
    label: "Highest Rated",
    icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
  },
  {
    value: "rating-asc",
    label: "Lowest Rated",
    icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
  },
  {
    value: "author-asc",
    label: "Author (A-Z)",
    icon: "M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
  },
  {
    value: "author-desc",
    label: "Author (Z-A)",
    icon: "M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
  },
  {
    value: "title-asc",
    label: "Title (A-Z)",
    icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
  },
  {
    value: "title-desc",
    label: "Title (Z-A)",
    icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
  },
  {
    value: "pages-desc",
    label: "Most Pages",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
  },
  {
    value: "pages-asc",
    label: "Least Pages",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
  },
];

export function BookSortDropdown({ currentSort, onSortChange, className }: BookSortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption = sortOptions.find(opt => opt.value === currentSort) || sortOptions[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (option: SortOption) => {
    onSortChange(option);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#e8dfd3] rounded-lg hover:bg-[#fef9ed] transition-colors text-[#3d2e1f] font-medium text-sm min-w-[200px] justify-between"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[#8B6B4F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
          </svg>
          <span className="text-sm">{currentOption.label}</span>
        </div>
        <svg
          className={cn(
            "w-4 h-4 text-[#6b5a4a] transition-transform",
            isOpen && "rotate-180"
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-[#e8dfd3] rounded-lg shadow-lg overflow-hidden z-50 min-w-[240px]">
          <div className="max-h-[400px] overflow-y-auto">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={cn(
                  "w-full px-4 py-2.5 text-left hover:bg-[#fef9ed] transition-colors flex items-center gap-3",
                  currentSort === option.value && "bg-[#A07A55]/10"
                )}
              >
                <svg
                  className={cn(
                    "w-4 h-4",
                    currentSort === option.value ? "text-[#A07A55]" : "text-[#6b5a4a]"
                  )}
                  fill={option.icon.includes("M11.049") ? "currentColor" : "none"}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={option.icon}
                  />
                </svg>
                <span className={cn(
                  "text-sm font-medium",
                  currentSort === option.value ? "text-[#A07A55]" : "text-[#3d2e1f]"
                )}>
                  {option.label}
                </span>
                {currentSort === option.value && (
                  <svg
                    className="w-4 h-4 text-[#A07A55] ml-auto"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
