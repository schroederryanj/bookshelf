/**
 * AI Service for SMS Intent Classification
 * Handles OpenAI API interactions for natural language understanding
 */

import OpenAI from 'openai';
import type { AIServiceOptions } from './types';

// Re-export types locally since AIServiceError extends Error
interface AIServiceErrorImpl extends Error {
  code: string;
  statusCode?: number;
  retryable: boolean;
}

// Singleton client instance
let openaiClient: OpenAI | null = null;

/**
 * Get or create the OpenAI client instance
 */
function getClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw createAIError(
        'OPENAI_API_KEY environment variable is not set',
        'MISSING_API_KEY',
        undefined,
        false
      );
    }

    openaiClient = new OpenAI({
      apiKey,
    });
  }

  return openaiClient;
}

/**
 * Create a standardized AI service error
 */
function createAIError(
  message: string,
  code: string,
  statusCode?: number,
  retryable = false
): AIServiceErrorImpl {
  const error = new Error(message) as AIServiceErrorImpl;
  error.code = code;
  error.statusCode = statusCode;
  error.retryable = retryable;
  error.name = 'AIServiceError';
  return error;
}

/**
 * System prompt for intent classification
 */
const INTENT_CLASSIFICATION_SYSTEM_PROMPT = `You are a friendly AI assistant for a personal bookshelf/reading tracker app that communicates via SMS. Your job is to understand what the user wants and respond helpfully.

Be conversational and human-like. Extract the user's intent and respond with structured data.

Available intents:
- SEARCH_BOOKS: User wants to find books in their collection (by title, author, genre, etc.)
- UPDATE_PROGRESS: User wants to update their reading progress (page number, percentage)
- GET_RECOMMENDATIONS: User wants book recommendations or suggestions on what to read next
- ADD_BOOK: User wants to add a new book to their collection
- GET_STATS: User wants general reading statistics (books read, pages, etc.)
- SET_REMINDER: User wants to set a reading reminder
- RATE_BOOK: User wants to rate a book they've read
- LIST_BOOKS: User wants to see their books (currently reading, finished, etc.)
- START_BOOK: User wants to start reading a book
- FINISH_BOOK: User wants to mark a book as finished
- HELP: User needs help understanding what they can do
- BOOK_DETAILS: User wants info about a specific book
- READING_STATUS: User wants to know what they're currently reading
- GENRE_STATS: User wants genre-specific statistics
- READING_PATTERNS: User wants reading habit insights (streak, pace, etc.)
- RATINGS_QUERY: User wants to see their rated books
- GOAL_PROGRESS: User wants reading goal status
- UNREAD_BOOKS: User wants to see their TBR/unread books
- SIMILAR_BOOKS: User wants similar book suggestions
- COMPARE_BOOKS: User wants to compare books
- TIME_QUERY: User wants time-based book history
- COMPLEX_FILTER: User has multiple filter criteria
- UNKNOWN: Cannot determine intent (ask a clarifying question)

For each message, respond with ONLY valid JSON:
{
  "intent": "INTENT_TYPE",
  "confidence": 0.0-1.0,
  "parameters": {
    "bookTitle": "string or null",
    "author": "string or null",
    "genre": "string or null",
    "pageNumber": "number or null",
    "rating": "number (1-5) or null",
    "query": "string or null",
    "statType": "yearly_count|monthly_count|total_pages|current_reading|reading_streak|genre_breakdown|average_rating|pages_per_day|favorite_genre|books_by_genre or null",
    "year": "number or null",
    "month": "number or null",
    "reminderType": "daily|weekly|specific_time or null",
    "reminderTime": "string or null",
    "limit": "number or null",
    "timeframe": "today|week|month|year or specific like '2023' or null",
    "pageLimit": "number or null",
    "ratingThreshold": "number or null",
    "comparisonBooks": "array of book titles or null",
    "sortBy": "rating|pages|date|title|author or null",
    "readingStatus": "reading|unread|finished|dnf or null",
    "comparisonType": "pages|rating|date_read or null"
  },
  "reasoning": "Brief explanation"
}

Guidelines:
- Be generous in interpretation - users may use informal language like "whatcha got" or "gimme something good"
- "What should I read next?" = GET_RECOMMENDATIONS
- "What am I reading?" = READING_STATUS with readingStatus: "reading"
- "What Harry Potter books have I read?" = COMPLEX_FILTER with query: "Harry Potter" and readingStatus: "finished"
- "Have I read any Sanderson?" = COMPLEX_FILTER with query: "Sanderson" and readingStatus: "finished"
- "Which fantasy books haven't I read?" = COMPLEX_FILTER with genre: "fantasy" and readingStatus: "unread"
- Greetings like "hi" or "hello" = HELP (show them what they can do)
- If truly unclear, use UNKNOWN but make confidence low

Respond ONLY with JSON, no additional text.`;

/**
 * Create a completion using OpenAI API
 */
export async function createCompletion(
  userMessage: string,
  systemPrompt: string = INTENT_CLASSIFICATION_SYSTEM_PROMPT,
  options: AIServiceOptions = {}
): Promise<string> {
  const {
    maxTokens = 500,
    temperature = 0.1,
    timeout = 30000,
  } = options;

  const client = getClient();

  try {
    const response = await Promise.race([
      client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: maxTokens,
        temperature,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(createAIError('Request timed out', 'TIMEOUT', undefined, true)),
          timeout
        )
      ),
    ]);

    // Extract text content from response
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw createAIError('No content in response', 'EMPTY_RESPONSE', undefined, true);
    }

    return content;
  } catch (err: unknown) {
    // Handle known OpenAI errors
    if (err instanceof OpenAI.APIError) {
      const isRetryable = err.status === 429 || (err.status && err.status >= 500);
      throw createAIError(
        err.message,
        `API_ERROR_${err.status}`,
        err.status,
        isRetryable
      );
    }

    // Re-throw if already an AIServiceError
    if (err && typeof err === 'object' && 'code' in err) {
      throw err;
    }

    // Handle unexpected errors
    throw createAIError(
      err instanceof Error ? err.message : 'Unknown error occurred',
      'UNKNOWN_ERROR',
      undefined,
      false
    );
  }
}

/**
 * Create completion with retry logic
 */
export async function createCompletionWithRetry(
  userMessage: string,
  systemPrompt?: string,
  options: AIServiceOptions = {},
  maxRetries = 2
): Promise<string> {
  let lastError: AIServiceErrorImpl | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await createCompletion(userMessage, systemPrompt, options);
    } catch (error) {
      lastError = error as AIServiceErrorImpl;

      // Only retry if error is retryable and we have attempts left
      if (!lastError.retryable || attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff: 1s, 2s, 4s
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }

  throw lastError;
}

/**
 * Check if the AI service is available
 */
export function isServiceAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Reset the client (useful for testing)
 */
export function resetClient(): void {
  openaiClient = null;
}

export { INTENT_CLASSIFICATION_SYSTEM_PROMPT };
