export const RATING_FACTORS = [
  { key: "ratingWriting", label: "Writing", shortLabel: "Writing" },
  { key: "ratingPlot", label: "Plot", shortLabel: "Plot" },
  { key: "ratingCharacters", label: "Characters", shortLabel: "Characters" },
  { key: "ratingPacing", label: "Pacing", shortLabel: "Pacing" },
  { key: "ratingWorldBuilding", label: "World-building", shortLabel: "World" },
  { key: "ratingEnjoyment", label: "Enjoyment", shortLabel: "Enjoyment" },
  { key: "ratingRecommend", label: "Would Recommend", shortLabel: "Recommend" },
] as const;

export type RatingFactorKey = (typeof RATING_FACTORS)[number]["key"];

export type BookRatings = {
  ratingWriting?: number | null;
  ratingPlot?: number | null;
  ratingCharacters?: number | null;
  ratingPacing?: number | null;
  ratingWorldBuilding?: number | null;
  ratingEnjoyment?: number | null;
  ratingRecommend?: number | null;
  ratingOverall?: number | null;
  ratingOverrideManual?: boolean;
};

/**
 * Calculate overall rating from factor ratings
 * Returns null if no factors are rated
 */
export function calculateOverallRating(book: BookRatings): number | null {
  const factorValues = RATING_FACTORS.map(
    (f) => book[f.key as keyof BookRatings] as number | null | undefined
  ).filter((v): v is number => v !== null && v !== undefined && v > 0);

  if (factorValues.length === 0) return null;

  const sum = factorValues.reduce((acc, val) => acc + val, 0);
  return Math.round((sum / factorValues.length) * 10) / 10; // Round to 1 decimal
}

/**
 * Get the effective overall rating (manual or calculated)
 */
export function getEffectiveRating(book: BookRatings): number | null {
  if (book.ratingOverrideManual && book.ratingOverall) {
    return book.ratingOverall;
  }
  return calculateOverallRating(book);
}

/**
 * Count how many factors have been rated
 */
export function getRatedFactorCount(book: BookRatings): number {
  return RATING_FACTORS.filter((f) => {
    const val = book[f.key as RatingFactorKey] as number | null | undefined;
    return val !== null && val !== undefined && val > 0;
  }).length;
}
