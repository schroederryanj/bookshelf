/**
 * Twilio Mock Utilities
 * Mock data and utilities for testing SMS functionality
 */

import { vi } from 'vitest';
import type { TwilioIncomingMessage } from '@/lib/sms/types';

/**
 * Create a mock Twilio incoming message
 */
export function createMockTwilioMessage(
  overrides: Partial<TwilioIncomingMessage> = {}
): TwilioIncomingMessage {
  return {
    MessageSid: 'SM' + 'a'.repeat(32),
    AccountSid: 'AC' + 'b'.repeat(32),
    From: '+15551234567',
    To: '+15559876543',
    Body: 'Test message',
    NumMedia: '0',
    NumSegments: '1',
    ...overrides,
  };
}

/**
 * Create mock FormData from Twilio message
 */
export function createMockFormData(message: TwilioIncomingMessage): FormData {
  const formData = new FormData();
  Object.entries(message).forEach(([key, value]) => {
    formData.append(key, value);
  });
  return formData;
}

/**
 * Common test messages for intent classification
 */
export const TEST_MESSAGES = {
  // Update progress messages
  updateProgress: [
    { input: 'page 150', expectedIntent: 'update_progress', expectedPage: 150 },
    { input: 'I am on page 200', expectedIntent: 'update_progress', expectedPage: 200 },
    { input: "i'm at page 75", expectedIntent: 'update_progress', expectedPage: 75 },
    { input: '50% done', expectedIntent: 'update_progress', expectedPercent: 50 },
    { input: '75% complete', expectedIntent: 'update_progress', expectedPercent: 75 },
    { input: 'page 100', expectedIntent: 'update_progress', expectedPage: 100 },
    { input: '42', expectedIntent: 'update_progress', expectedPage: 42 },
  ],

  // Start book messages
  startBook: [
    { input: 'start The Great Gatsby', expectedIntent: 'start_book', expectedTitle: 'The Great Gatsby' },
    { input: 'starting Dune', expectedIntent: 'start_book', expectedTitle: 'Dune' },
    { input: 'begin The Hobbit', expectedIntent: 'start_book', expectedTitle: 'The Hobbit' },
    { input: 'new book: Project Hail Mary', expectedIntent: 'start_book', expectedTitle: 'Project Hail Mary' },
    { input: 'picked up Animal Farm', expectedIntent: 'start_book', expectedTitle: 'Animal Farm' },
  ],

  // Finish book messages
  finishBook: [
    { input: 'finished The Great Gatsby', expectedIntent: 'finish_book', expectedTitle: 'The Great Gatsby' },
    { input: 'done with 1984', expectedIntent: 'finish_book', expectedTitle: '1984' },
    { input: 'completed Dune', expectedIntent: 'finish_book', expectedTitle: 'Dune' },
    { input: 'just finished Project Hail Mary', expectedIntent: 'finish_book', expectedTitle: 'Project Hail Mary' },
  ],

  // Status messages
  getStatus: [
    { input: 'status', expectedIntent: 'get_status' },
    { input: "what's my progress", expectedIntent: 'get_status' },
    { input: 'where am i in my book', expectedIntent: 'get_status' },
    { input: 'current book', expectedIntent: 'get_status' },
    { input: 'my progress', expectedIntent: 'get_status' },
  ],

  // List reading messages
  listReading: [
    { input: 'what am i reading', expectedIntent: 'list_reading' },
    { input: 'what books am i reading', expectedIntent: 'list_reading' },
    { input: 'list books', expectedIntent: 'list_reading' },
    { input: 'show books', expectedIntent: 'list_reading' },
    { input: 'what books', expectedIntent: 'list_reading' },
  ],

  // Search messages
  searchBook: [
    { input: 'find Harry Potter', expectedIntent: 'search_book', expectedQuery: 'Harry Potter' },
    { input: 'search Stephen King', expectedIntent: 'search_book', expectedQuery: 'Stephen King' },
    { input: 'look for The Shining', expectedIntent: 'search_book', expectedQuery: 'The Shining' },
    { input: 'do i have Dune', expectedIntent: 'search_book', expectedQuery: 'Dune' },
  ],

  // Stats messages
  getStats: [
    { input: 'my stats', expectedIntent: 'get_stats' },
    { input: 'stats', expectedIntent: 'get_stats' },
    { input: 'how much have i read', expectedIntent: 'get_stats' },
    { input: 'total pages', expectedIntent: 'get_stats' },
    { input: 'statistics', expectedIntent: 'get_stats' },
  ],

  // Help messages
  help: [
    { input: 'help', expectedIntent: 'help' },
    { input: '?', expectedIntent: 'help' },
    { input: 'what can you do', expectedIntent: 'help' },
    { input: 'commands', expectedIntent: 'help' },
    { input: 'how do i use this', expectedIntent: 'help' },
  ],

  // Unknown messages
  unknown: [
    { input: 'hello there', expectedIntent: 'unknown' },
    { input: 'asdfghjkl', expectedIntent: 'unknown' },
    { input: 'what is the meaning of life', expectedIntent: 'unknown' },
    { input: '', expectedIntent: 'unknown' },
  ],

  // Edge cases
  edgeCases: [
    { input: '   page 50   ', expectedIntent: 'update_progress', expectedPage: 50 },
    { input: 'PAGE 100', expectedIntent: 'update_progress', expectedPage: 100 },
    { input: 'HELP', expectedIntent: 'help' },
    { input: 'start   The   Great   Gatsby', expectedIntent: 'start_book' },
  ],

  // Enhanced intent messages (for new features)
  bookDetails: [
    { input: 'Tell me about Dune', expectedIntent: 'book_details', expectedBook: 'Dune' },
    { input: 'How many pages is The Hobbit?', expectedIntent: 'book_details', expectedBook: 'The Hobbit' },
    { input: 'Who wrote 1984?', expectedIntent: 'book_details', expectedBook: '1984' },
  ],

  genreQueries: [
    { input: 'List my fantasy books', expectedIntent: 'genre_query', expectedGenre: 'Fantasy' },
    { input: 'How many sci-fi books?', expectedIntent: 'genre_query', expectedGenre: 'Science Fiction' },
    { input: 'Genre breakdown', expectedIntent: 'genre_query' },
  ],

  ratingQueries: [
    { input: '5-star books', expectedIntent: 'rating_query', expectedMinRating: 5 },
    { input: 'Highest rated', expectedIntent: 'rating_query' },
    { input: 'What did I rate The Martian?', expectedIntent: 'rating_query', expectedBook: 'The Martian' },
  ],

  goalQueries: [
    { input: 'Am I on track?', expectedIntent: 'goal_query' },
    { input: 'Reading goal progress', expectedIntent: 'goal_query' },
  ],

  timeQueries: [
    { input: 'Books from 2024', expectedIntent: 'time_query', expectedYear: 2024 },
    { input: 'Read last month', expectedIntent: 'time_query', expectedPeriod: 'last_month' },
  ],

  complexFilters: [
    { input: 'Unread fantasy under 300 pages', expectedIntent: 'complex_filter' },
    { input: '5-star sci-fi books', expectedIntent: 'complex_filter' },
  ],

  comparisons: [
    { input: 'Compare Dune and The Martian', expectedIntent: 'comparison', expectedBooks: ['Dune', 'The Martian'] },
    { input: 'Which is longer, The Hobbit or Dune?', expectedIntent: 'comparison' },
  ],

  similarBooks: [
    { input: 'Books like The Martian', expectedIntent: 'similar_books', expectedBook: 'The Martian' },
    { input: 'More by Andy Weir', expectedIntent: 'similar_books', expectedAuthor: 'Andy Weir' },
  ],

  followUps: [
    { input: 'Tell me more', expectedIntent: 'followup', expectedType: 'more_info' },
    { input: 'Start it', expectedIntent: 'followup', expectedType: 'action' },
    { input: 'Next', expectedIntent: 'followup', expectedType: 'pagination' },
    { input: 'The first one', expectedIntent: 'followup', expectedType: 'list_reference' },
  ],
};

/**
 * Mock Twilio validation function
 */
export const mockValidateTwilioSignature = vi.fn().mockReturnValue(true);

/**
 * Generate a valid-looking Twilio signature (for testing)
 */
export function generateMockSignature(): string {
  return 'mock-signature-' + Math.random().toString(36).substring(7);
}
