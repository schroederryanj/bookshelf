/**
 * SMS Response Formatter
 * Formats responses for SMS delivery with proper length handling
 */

import { DEFAULT_SMS_CONFIG, SMSConfig } from "./types";

// Standard SMS character limit
const SMS_CHAR_LIMIT = 160;
const MULTI_SMS_CHAR_LIMIT = 153; // When splitting, each segment has less usable chars

// Split markers
const SPLIT_MARKER_FORMAT = " (%d/%d)";

/**
 * Format a response for SMS delivery
 * Ensures responses are concise and add helpful suffixes when appropriate
 */
export function formatResponse(
  message: string,
  options: {
    addHelpSuffix?: boolean;
    enableEmojis?: boolean;
    config?: SMSConfig;
  } = {}
): string {
  const config = options.config || DEFAULT_SMS_CONFIG;
  const addHelpSuffix = options.addHelpSuffix ?? false;
  const enableEmojis = options.enableEmojis ?? config.enableEmojis;

  let formatted = message.trim();

  // Remove emojis if disabled
  if (!enableEmojis) {
    formatted = removeEmojis(formatted);
  }

  // Add help suffix if requested and there's room
  if (addHelpSuffix) {
    const withSuffix = formatted + config.helpSuffix;
    if (withSuffix.length <= SMS_CHAR_LIMIT) {
      formatted = withSuffix;
    }
  }

  return formatted;
}

/**
 * Split a long message into multiple SMS-sized segments
 * Returns an array of messages, each within the SMS character limit
 */
export function splitMessage(
  message: string,
  maxLength: number = SMS_CHAR_LIMIT
): string[] {
  // If message fits in one SMS, return as-is
  if (message.length <= maxLength) {
    return [message];
  }

  const segments: string[] = [];

  // First pass: split by paragraphs (double newlines)
  const paragraphs = message.split(/\n\n+/);

  // If we have logical paragraphs, try to keep them together
  if (paragraphs.length > 1) {
    let currentSegment = "";

    for (const paragraph of paragraphs) {
      const potentialSegment = currentSegment
        ? currentSegment + "\n\n" + paragraph
        : paragraph;

      if (potentialSegment.length <= MULTI_SMS_CHAR_LIMIT) {
        currentSegment = potentialSegment;
      } else {
        // Save current segment if it has content
        if (currentSegment) {
          segments.push(currentSegment.trim());
        }
        // If single paragraph is too long, split by sentences
        if (paragraph.length > MULTI_SMS_CHAR_LIMIT) {
          segments.push(...splitBySentences(paragraph));
          currentSegment = "";
        } else {
          currentSegment = paragraph;
        }
      }
    }

    // Don't forget the last segment
    if (currentSegment) {
      segments.push(currentSegment.trim());
    }
  } else {
    // No logical paragraphs, split by sentences
    segments.push(...splitBySentences(message));
  }

  // Add segment markers if multiple segments
  if (segments.length > 1) {
    return segments.map((seg, i) => {
      const marker = ` (${i + 1}/${segments.length})`;
      // Ensure marker fits
      if (seg.length + marker.length > SMS_CHAR_LIMIT) {
        return seg.slice(0, SMS_CHAR_LIMIT - marker.length) + marker;
      }
      return seg + marker;
    });
  }

  return segments;
}

/**
 * Split text by sentences, keeping each segment under the limit
 */
function splitBySentences(text: string): string[] {
  const segments: string[] = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  let currentSegment = "";

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    const potentialSegment = currentSegment
      ? currentSegment + " " + trimmedSentence
      : trimmedSentence;

    if (potentialSegment.length <= MULTI_SMS_CHAR_LIMIT) {
      currentSegment = potentialSegment;
    } else {
      if (currentSegment) {
        segments.push(currentSegment.trim());
      }
      // If single sentence is too long, split by words
      if (trimmedSentence.length > MULTI_SMS_CHAR_LIMIT) {
        segments.push(...splitByWords(trimmedSentence));
        currentSegment = "";
      } else {
        currentSegment = trimmedSentence;
      }
    }
  }

  if (currentSegment) {
    segments.push(currentSegment.trim());
  }

  return segments;
}

/**
 * Split text by words as last resort
 */
function splitByWords(text: string): string[] {
  const segments: string[] = [];
  const words = text.split(/\s+/);

  let currentSegment = "";

  for (const word of words) {
    const potentialSegment = currentSegment
      ? currentSegment + " " + word
      : word;

    if (potentialSegment.length <= MULTI_SMS_CHAR_LIMIT) {
      currentSegment = potentialSegment;
    } else {
      if (currentSegment) {
        segments.push(currentSegment.trim());
      }
      currentSegment = word;
    }
  }

  if (currentSegment) {
    segments.push(currentSegment.trim());
  }

  return segments;
}

/**
 * Remove emojis from text
 */
function removeEmojis(text: string): string {
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, "") // Emoticons
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, "") // Misc Symbols and Pictographs
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, "") // Transport and Map
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, "") // Flags
    .replace(/[\u{2600}-\u{26FF}]/gu, "")   // Misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, "")   // Dingbats
    .replace(/\s+/g, " ")                    // Clean up extra spaces
    .trim();
}

/**
 * Format book information for SMS
 */
export function formatBookInfo(book: {
  title: string;
  author?: string | null;
  pages?: number | null;
  read?: string | null;
}): string {
  let info = `"${book.title}"`;
  if (book.author) {
    info += ` by ${book.author}`;
  }
  if (book.pages) {
    info += ` (${book.pages} pages)`;
  }
  return info;
}

/**
 * Format a list of items for SMS with numbering
 */
export function formatNumberedList(
  items: string[],
  maxItems: number = 5
): string {
  const limited = items.slice(0, maxItems);
  const formatted = limited.map((item, i) => `${i + 1}. ${item}`).join("\n");

  if (items.length > maxItems) {
    return formatted + `\n...and ${items.length - maxItems} more`;
  }
  return formatted;
}

/**
 * Format reading progress for SMS
 */
export function formatProgress(
  currentPage: number,
  totalPages: number,
  bookTitle: string
): string {
  const percent = Math.round((currentPage / totalPages) * 100);
  const progressBar = createProgressBar(percent);

  return `${bookTitle}\n${progressBar} ${percent}%\nPage ${currentPage}/${totalPages}`;
}

/**
 * Create a simple text-based progress bar
 */
function createProgressBar(percent: number, width: number = 10): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return "[" + "=".repeat(filled) + "-".repeat(empty) + "]";
}

/**
 * Format stats summary for SMS
 */
export function formatStatsSummary(stats: {
  totalBooksRead: number;
  totalBooksReading: number;
  totalPagesRead: number;
  currentStreak: number;
}): string {
  const lines: string[] = [];

  lines.push(`Books read: ${stats.totalBooksRead}`);
  if (stats.totalBooksReading > 0) {
    lines.push(`Currently reading: ${stats.totalBooksReading}`);
  }
  lines.push(`Pages read: ${stats.totalPagesRead.toLocaleString()}`);
  if (stats.currentStreak > 0) {
    lines.push(`Reading streak: ${stats.currentStreak} days`);
  }

  return lines.join("\n");
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + "...";
}

// ============================================
// Enhanced Formatters for Collection Queries
// ============================================

/**
 * Book list item for formatting
 */
interface BookListItem {
  id: number;
  title: string;
  author?: string | null;
  pages?: number | null;
  rating?: number | null;
  status?: string | null;
  progressPercent?: number;
}

/**
 * Format a list of books for SMS (compact format)
 *
 * @param books - Array of book items
 * @param options - Formatting options
 * @returns Formatted string
 */
export function formatBookList(
  books: BookListItem[],
  options: {
    showStatus?: boolean;
    showPages?: boolean;
    showRating?: boolean;
    showProgress?: boolean;
    maxItems?: number;
    totalCount?: number;
    startIndex?: number;
  } = {}
): string {
  const {
    showStatus = false,
    showPages = false,
    showRating = false,
    showProgress = false,
    maxItems = 5,
    totalCount,
    startIndex = 0,
  } = options;

  const limited = books.slice(0, maxItems);

  const lines = limited.map((book, idx) => {
    const num = startIndex + idx + 1;
    let line = `${num}. ${truncate(book.title, 30)}`;

    // Add optional info
    const extras: string[] = [];

    if (showStatus && book.status) {
      const statusIcon = book.status === "Read" ? "[R]" :
                         book.status === "Reading" ? "[*]" :
                         book.status === "DNF" ? "[X]" : "";
      if (statusIcon) extras.push(statusIcon);
    }

    if (showProgress && book.progressPercent !== undefined && book.progressPercent > 0) {
      extras.push(`${Math.round(book.progressPercent)}%`);
    }

    if (showPages && book.pages) {
      extras.push(`${book.pages}p`);
    }

    if (showRating && book.rating) {
      extras.push(`${"*".repeat(Math.round(book.rating))}`);
    }

    if (extras.length > 0) {
      line += ` ${extras.join(" ")}`;
    }

    return line;
  });

  // Add "more" indicator if there are more results
  const total = totalCount ?? books.length;
  if (total > limited.length + startIndex) {
    const remaining = total - (limited.length + startIndex);
    lines.push(`Reply MORE for ${remaining} more.`);
  }

  return lines.join("\n");
}

/**
 * Format a comparison result for SMS
 */
export function formatComparison(
  book1: { title: string; value: number | string },
  book2: { title: string; value: number | string },
  comparisonType: "pages" | "rating" | "date",
  unit?: string
): string {
  const val1 = typeof book1.value === "number" ? book1.value : 0;
  const val2 = typeof book2.value === "number" ? book2.value : 0;

  const winner = val1 > val2 ? book1 : book2;
  const diff = Math.abs(val1 - val2);

  let comparison = "";
  const unitStr = unit || "";

  switch (comparisonType) {
    case "pages":
      comparison = `"${truncate(winner.title, 25)}" is longer by ${diff.toLocaleString()} pages.\n\n`;
      comparison += `${truncate(book1.title, 18)}: ${val1.toLocaleString()}p\n`;
      comparison += `${truncate(book2.title, 18)}: ${val2.toLocaleString()}p`;
      break;

    case "rating":
      if (val1 === val2) {
        comparison = `Both rated ${val1}/5!\n\n`;
        comparison += `${truncate(book1.title, 20)}: ${val1}/5\n`;
        comparison += `${truncate(book2.title, 20)}: ${val2}/5`;
      } else {
        comparison = `"${truncate(winner.title, 25)}" is rated higher.\n\n`;
        comparison += `${truncate(book1.title, 18)}: ${val1}/5\n`;
        comparison += `${truncate(book2.title, 18)}: ${val2}/5`;
      }
      break;

    default:
      comparison = `${truncate(book1.title, 25)}: ${book1.value}${unitStr}\n`;
      comparison += `${truncate(book2.title, 25)}: ${book2.value}${unitStr}`;
  }

  return comparison;
}

/**
 * Format genre statistics for SMS
 */
export function formatGenreStats(
  genres: Array<{ genre: string; count: number; readCount?: number }>
): string {
  if (genres.length === 0) {
    return "No genre data available.";
  }

  const lines = ["Top genres:"];

  genres.slice(0, 5).forEach(({ genre, count, readCount }, idx) => {
    let line = `${idx + 1}. ${genre}: ${count}`;
    if (readCount !== undefined) {
      line += ` (${readCount} read)`;
    }
    lines.push(line);
  });

  return lines.join("\n");
}

/**
 * Format reading goal progress for SMS
 */
export function formatGoalProgress(
  current: number,
  target: number,
  options: {
    showProgressBar?: boolean;
    showDifference?: boolean;
    expectedByNow?: number;
  } = {}
): string {
  const { showProgressBar = true, showDifference = true, expectedByNow } = options;

  const percent = Math.round((current / target) * 100);
  const lines: string[] = [];

  // Main progress line
  lines.push(`Goal: ${current}/${target} books (${percent}%)`);

  // Progress bar
  if (showProgressBar) {
    lines.push(createProgressBar(percent, 10));
  }

  // Difference from expected
  if (showDifference && expectedByNow !== undefined) {
    const diff = current - expectedByNow;
    if (diff >= 0) {
      lines.push(`${diff} books ahead of schedule!`);
    } else {
      lines.push(`${Math.abs(diff)} books behind schedule.`);
    }
  }

  return lines.join("\n");
}

/**
 * Format time-based reading summary
 */
export function formatTimeSummary(
  period: string,
  stats: {
    booksFinished: number;
    pagesRead?: number;
    booksStarted?: number;
  }
): string {
  const lines = [`${period}:`];

  lines.push(`Books finished: ${stats.booksFinished}`);

  if (stats.pagesRead !== undefined && stats.pagesRead > 0) {
    lines.push(`Pages read: ${stats.pagesRead.toLocaleString()}`);
  }

  if (stats.booksStarted !== undefined && stats.booksStarted > 0) {
    lines.push(`Books started: ${stats.booksStarted}`);
  }

  return lines.join("\n");
}

/**
 * Format "did you mean" suggestions
 */
export function formatDidYouMean(suggestions: string[], query: string): string {
  if (suggestions.length === 0) {
    return `No books found matching "${truncate(query, 30)}".`;
  }

  const lines = [`No exact match for "${truncate(query, 25)}".\nDid you mean:`];

  suggestions.slice(0, 3).forEach((suggestion, idx) => {
    lines.push(`${idx + 1}. ${truncate(suggestion, 40)}`);
  });

  return lines.join("\n");
}

/**
 * Format error with helpful suggestion
 */
export function formatErrorWithSuggestion(
  error: string,
  suggestion?: string
): string {
  let message = error;

  if (suggestion) {
    message += `\n\nTry: ${suggestion}`;
  }

  return message;
}

/**
 * Add pagination prompt to response if applicable
 */
export function addPaginationPrompt(
  message: string,
  hasMore: boolean,
  moreCount?: number
): string {
  if (!hasMore) {
    return message;
  }

  const prompt = moreCount
    ? `\nReply MORE for ${moreCount} more results.`
    : `\nReply MORE for more results.`;

  // Only add if it fits
  if (message.length + prompt.length <= SMS_CHAR_LIMIT * 2) {
    return message + prompt;
  }

  return message;
}

/**
 * Format a book's detailed info for follow-up responses
 */
export function formatBookDetail(
  book: {
    title: string;
    author?: string | null;
    pages?: number | null;
    genre?: string | null;
    rating?: number | null;
    status?: string | null;
    progressPercent?: number;
    dateFinished?: string | null;
  },
  attribute?: string
): string {
  // If asking about a specific attribute, just return that
  if (attribute) {
    switch (attribute) {
      case "pages":
        return book.pages
          ? `"${truncate(book.title, 30)}" has ${book.pages.toLocaleString()} pages.`
          : `Page count unknown for "${truncate(book.title, 30)}".`;

      case "author":
        return book.author
          ? `"${truncate(book.title, 30)}" is by ${book.author}.`
          : `Author unknown for "${truncate(book.title, 30)}".`;

      case "rating":
        return book.rating
          ? `"${truncate(book.title, 30)}" is rated ${book.rating}/5.`
          : `No rating yet for "${truncate(book.title, 30)}".`;

      case "genre":
        return book.genre
          ? `"${truncate(book.title, 30)}" is ${book.genre}.`
          : `No genre set for "${truncate(book.title, 30)}".`;

      case "progress":
        if (book.progressPercent !== undefined) {
          return `"${truncate(book.title, 30)}": ${Math.round(book.progressPercent)}% complete.`;
        }
        return book.status === "Read"
          ? `"${truncate(book.title, 30)}" is finished.`
          : `No progress tracked for "${truncate(book.title, 30)}".`;

      case "status":
        return `"${truncate(book.title, 30)}" status: ${book.status || "Unknown"}.`;
    }
  }

  // Full details
  const lines = [
    `"${truncate(book.title, 40)}"`,
    book.author ? `by ${book.author}` : null,
    book.pages ? `${book.pages.toLocaleString()} pages` : null,
    book.genre ? `Genre: ${book.genre}` : null,
    book.rating ? `Rating: ${book.rating}/5` : null,
    book.status ? `Status: ${book.status}` : null,
    book.progressPercent !== undefined && book.progressPercent > 0 && book.progressPercent < 100
      ? `Progress: ${Math.round(book.progressPercent)}%`
      : null,
  ].filter(Boolean);

  return lines.join("\n");
}
