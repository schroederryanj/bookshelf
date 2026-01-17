"use client";

type StarRatingProps = {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  showValue?: boolean;
};

export function StarRating({
  value,
  onChange,
  size = "md",
  disabled,
  showValue,
}: StarRatingProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const handleClick = (star: number) => {
    if (!disabled && onChange) {
      onChange(value === star ? 0 : star);
    }
  };

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => handleClick(star)}
          disabled={disabled}
          className={`transition-transform ${
            !disabled ? "hover:scale-110 cursor-pointer" : "cursor-default"
          }`}
        >
          <svg
            className={`${sizeClasses[size]} ${
              star <= Math.round(value)
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-300"
            }`}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
            />
          </svg>
        </button>
      ))}
      {showValue && value > 0 && (
        <span className="ml-1 text-sm text-gray-500">
          {Number.isInteger(value) ? value : value.toFixed(1)}
        </span>
      )}
    </div>
  );
}
