/**
 * SMS Assistant Types
 * Type definitions for the SMS-based book tracking assistant
 */

// Legacy SMSIntent type for backward compatibility
export type SMSIntent =
  | 'STATS'
  | 'CURRENTLY_READING'
  | 'ADD_PROGRESS'
  | 'SEARCH_BOOK'
  | 'RECOMMEND'
  | 'START_BOOK'
  | 'FINISH_BOOK'
  | 'HELP'
  | 'GREETING'
  | 'UNKNOWN';

// SMS configuration
export interface SMSConfig {
  maxMessageLength: number;
  helpSuffix: string;
  enableEmojis: boolean;
  defaultUserId: string;
}

// Default configuration
export const DEFAULT_SMS_CONFIG: SMSConfig = {
  maxMessageLength: 160,
  helpSuffix: '\n\nReply HELP for commands.',
  enableEmojis: true,
  defaultUserId: 'default',
};

// Intent types that can be classified from user messages
export type IntentType =
  | 'update_progress'
  | 'start_book'
  | 'finish_book'
  | 'get_status'
  | 'list_reading'
  | 'search_book'
  | 'get_stats'
  | 'help'
  | 'unknown';

// Extracted parameters from user messages
export interface IntentParameters {
  bookTitle?: string;
  bookId?: number;
  pageNumber?: number;
  percentComplete?: number;
  author?: string;
  query?: string;
}

// Result of intent classification
export interface ClassificationResult {
  intent: IntentType;
  confidence: number;
  parameters: IntentParameters;
  rawMessage: string;
}

// Handler response with message to send back
export interface HandlerResponse {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

// Twilio webhook incoming message format
export interface TwilioIncomingMessage {
  MessageSid: string;
  AccountSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia: string;
  NumSegments: string;
}

// Twilio webhook response format (TwiML)
export interface TwilioResponse {
  message: string;
}

// Conversation context for multi-turn conversations
export interface ConversationContext {
  phoneNumber: string;
  lastIntent?: IntentType;
  lastBookId?: number;
  lastBookTitle?: string;
  awaitingConfirmation?: boolean;
  confirmationType?: 'finish_book' | 'start_book';
  timestamp: Date;
}

// Book summary for SMS responses
export interface BookSummary {
  id: number;
  title: string;
  author: string | null;
  pages: number | null;
  currentPage: number;
  progressPercent: number;
  status: string;
}

// Reading statistics for SMS responses
export interface ReadingStatsSummary {
  booksReading: number;
  booksCompleted: number;
  totalPagesRead: number;
  currentStreak: number;
  recentlyRead: string[];
}

// ============================================
// AI Service Types
// ============================================

export interface AIServiceOptions {
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export interface AIServiceError extends Error {
  code: string;
  statusCode?: number;
  retryable: boolean;
}

// ============================================
// AI-Powered Intent Classification Types
// ============================================

/**
 * Enhanced intent types for AI classification
 */
export enum AIIntentType {
  // Existing intents
  SEARCH_BOOKS = 'SEARCH_BOOKS',
  UPDATE_PROGRESS = 'UPDATE_PROGRESS',
  GET_RECOMMENDATIONS = 'GET_RECOMMENDATIONS',
  ADD_BOOK = 'ADD_BOOK',
  GET_STATS = 'GET_STATS',
  SET_REMINDER = 'SET_REMINDER',
  RATE_BOOK = 'RATE_BOOK',
  LIST_BOOKS = 'LIST_BOOKS',
  START_BOOK = 'START_BOOK',
  FINISH_BOOK = 'FINISH_BOOK',
  HELP = 'HELP',
  UNKNOWN = 'UNKNOWN',

  // New intent types for comprehensive book collection queries
  BOOK_DETAILS = 'BOOK_DETAILS',           // "Tell me about The Hobbit", "How many pages is Dune?"
  READING_STATUS = 'READING_STATUS',       // "What books am I reading?", "Which books haven't I started?"
  GENRE_STATS = 'GENRE_STATS',             // "What's my favorite genre?", "How many fantasy books?"
  READING_PATTERNS = 'READING_PATTERNS',   // "What's my reading streak?", "Average pages per day?"
  RATINGS_QUERY = 'RATINGS_QUERY',         // "What's my highest rated book?", "Show me 5-star books"
  GOAL_PROGRESS = 'GOAL_PROGRESS',         // "Am I on track for my goal?", "How many books behind?"
  UNREAD_BOOKS = 'UNREAD_BOOKS',           // "What should I read next?", "Show unread sci-fi"
  SIMILAR_BOOKS = 'SIMILAR_BOOKS',         // "Find books like The Martian", "Other books by this author?"
  COMPARE_BOOKS = 'COMPARE_BOOKS',         // "Which is longer, Dune or LOTR?", "Compare ratings"
  TIME_QUERY = 'TIME_QUERY',               // "What did I read last month?", "Books finished in 2023"
  COMPLEX_FILTER = 'COMPLEX_FILTER',       // "Unread books under 300 pages", "Fantasy rated 4+ stars"
}

export type StatType =
  | 'yearly_count'
  | 'monthly_count'
  | 'total_pages'
  | 'current_reading'
  | 'reading_streak'
  | 'genre_breakdown'
  | 'average_rating'
  | 'pages_per_day'
  | 'favorite_genre'
  | 'books_by_genre';

export type ReminderType = 'daily' | 'weekly' | 'specific_time';

export type TimeframeType = 'today' | 'week' | 'month' | 'year' | string;

export type ReadingStatusType = 'reading' | 'unread' | 'finished' | 'dnf' | 'all';

export type SortByType = 'rating' | 'pages' | 'date' | 'title' | 'author';

export type ComparisonType = 'pages' | 'rating' | 'date_read';

/**
 * Extended parameters for AI-powered classification
 */
export interface AIIntentParameters {
  // Existing parameters
  bookTitle?: string;
  author?: string;
  genre?: string;
  pageNumber?: number;
  percentComplete?: number;
  rating?: number;
  query?: string;
  statType?: StatType;
  year?: number;
  month?: number;
  reminderType?: ReminderType;
  reminderTime?: string;
  shelfId?: number;
  limit?: number;

  // New parameters for comprehensive book collection queries
  timeframe?: TimeframeType;           // "today", "week", "month", "year", "2023", "last month"
  pageLimit?: number;                  // "under 300 pages"
  ratingThreshold?: number;            // "4+ stars", "rated above 3"
  comparisonBooks?: string[];          // For compare queries: ["Dune", "LOTR"]
  sortBy?: SortByType;                 // "sort by rating", "by pages"
  readingStatus?: ReadingStatusType;   // "reading", "unread", "finished", "dnf"
  comparisonType?: ComparisonType;     // What to compare: "pages", "rating", "date_read"
  minRating?: number;                  // Minimum rating filter
  maxPages?: number;                   // Maximum pages filter
  minPages?: number;                   // Minimum pages filter
}

/**
 * Result of AI-powered intent classification
 */
export interface ParsedIntent {
  intent: AIIntentType;
  confidence: number;
  parameters: AIIntentParameters;
  rawMessage: string;
  needsMoreInfo?: boolean;
  followUpQuestion?: string;
}

/**
 * Context for multi-turn conversations with AI classifier
 */
export interface AIConversationContext {
  previousIntent?: AIIntentType;
  previousParameters?: AIIntentParameters;
  awaitingResponse?: boolean;
  lastInteractionTime?: Date;
  sessionId?: string;
}
