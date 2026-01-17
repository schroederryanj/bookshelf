export type Book = {
  title: string;
  img: string;
  height: number;
  read?: string;
  author?: string;
  pages?: number;
  genre?: string;
  description?: string;
  rating?: number; // Legacy - kept for compatibility

  // Multi-factor rating system
  ratingWriting?: number;
  ratingPlot?: number;
  ratingCharacters?: number;
  ratingPacing?: number;
  ratingWorldBuilding?: number;
  ratingEnjoyment?: number;
  ratingRecommend?: number;
  ratingOverall?: number;
  ratingOverrideManual?: boolean;

  shelf?: number;
};
