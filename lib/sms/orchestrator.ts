/**
 * SMS Orchestrator
 * Main entry point for processing incoming SMS messages
 *
 * This orchestrator ties together all SMS components:
 * - Conversation management (database-backed)
 * - Intent classification (AI-powered with fallback)
 * - Command handlers
 * - Response formatting
 * - Error handling
 *
 * Flow:
 * Incoming SMS -> Webhook -> Orchestrator
 *                              |
 *                    Load Conversation Context (DB)
 *                              |
 *                    Classify Intent (AI/Regex)
 *                              |
 *                    Execute Handler
 *                              |
 *                    Format Response
 *                              |
 *                    Save to History (DB)
 *                              |
 *                    Return TwiML <- Response
 */

import {
  AIIntentType,
  type TwilioIncomingMessage,
  type ConversationContext,
  type HandlerResponse,
  type IntentParameters,
  type AIIntentParameters,
} from './types';
import { classifyIntentWithAI } from './ai-intent-classifier';
import {
  handleUpdateProgress,
  handleStartBook,
  handleFinishBook,
  handleGetStatus,
  handleListReading,
  handleSearchBook,
  handleGetStats,
  handleHelp,
  handleUnknown,
} from './handlers';
import {
  bookDetailsHandler,
  readingStatusHandler,
  genreQueryHandler,
  readingPatternsHandler,
  ratingsQueryHandler,
  goalProgressHandler,
  unreadBooksHandler,
  recommendBooksHandler,
  similarBooksHandler,
  compareBooksHandler,
  timeQueryHandler,
  complexFilterHandler,
  moreResultsHandler,
  drewbertsPicksHandler,
} from './handlers/collection-handlers';
import {
  isMoreRequest,
  detectFollowUpQuestion,
  type BookReferenceContext,
} from './conversation-manager';
import {
  formatBookDetail,
  formatErrorWithSuggestion,
} from './response-formatter';

// In-memory context store (database-backed via conversation-manager for persistence)
const contextStore = new Map<string, ConversationContext>();

// Context timeout in milliseconds (5 minutes)
const CONTEXT_TIMEOUT = 5 * 60 * 1000;

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_MESSAGES_PER_WINDOW = 20;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Message length limits
const MAX_MESSAGE_LENGTH = 1600; // Twilio limit
const MIN_MESSAGE_LENGTH = 1;

/**
 * Result of processing an SMS
 */
export interface ProcessingResult {
  success: boolean;
  response: string;
  responses?: string[]; // For split messages
  intent?: string;
  shouldSplit: boolean;
}

/**
 * Get or create conversation context for a phone number
 */
export function getContext(phoneNumber: string): ConversationContext | undefined {
  const context = contextStore.get(phoneNumber);

  if (context) {
    // Check if context has expired
    const elapsed = Date.now() - context.timestamp.getTime();
    if (elapsed > CONTEXT_TIMEOUT) {
      contextStore.delete(phoneNumber);
      return undefined;
    }
  }

  return context;
}

/**
 * Update conversation context
 */
export function updateContext(
  phoneNumber: string,
  updates: Partial<Omit<ConversationContext, 'phoneNumber' | 'timestamp'>>
): void {
  const existing = contextStore.get(phoneNumber);

  contextStore.set(phoneNumber, {
    phoneNumber,
    ...existing,
    ...updates,
    timestamp: new Date(),
  });
}

/**
 * Clear conversation context
 */
export function clearContext(phoneNumber: string): void {
  contextStore.delete(phoneNumber);
}

/**
 * Validate input parameters
 */
function validateInput(
  phoneNumber: string,
  messageBody: string
): { valid: boolean; error?: string } {
  // Check phone number
  if (!phoneNumber || phoneNumber.length < 10) {
    return { valid: false, error: 'Invalid phone number' };
  }

  // Check for empty message
  if (!messageBody || messageBody.trim().length < MIN_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: 'Please send a message. Reply HELP for available commands.',
    };
  }

  // Check for very long messages
  if (messageBody.length > MAX_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: 'Your message is too long. Please keep it under 1600 characters.',
    };
  }

  return { valid: true };
}

/**
 * Check if phone number is rate limited
 */
function isRateLimited(phoneNumber: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(phoneNumber);

  if (!entry || now > entry.resetAt) {
    // Create or reset entry
    rateLimitMap.set(phoneNumber, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  // Increment count
  entry.count++;

  // Check if over limit
  if (entry.count > MAX_MESSAGES_PER_WINDOW) {
    return true;
  }

  return false;
}

/**
 * Extended context type for orchestrator that includes enhanced fields
 */
interface ExtendedContext extends ConversationContext {
  lastQueriedBook?: BookReferenceContext;
  lastBookList?: BookReferenceContext[];
  pagination?: {
    resultIds: number[];
    totalCount: number;
    currentOffset: number;
    pageSize: number;
    sourceIntent?: string;
    queryParams?: Record<string, unknown>;
  };
  lastIntentType?: string;
  lastQueryParams?: Record<string, unknown>;
}

/**
 * Resolve a pronoun reference to a book from in-memory context
 */
function resolveBookReferenceFromContext(
  context: ExtendedContext,
  pronounOrIndex: string
): BookReferenceContext | null {
  const normalized = pronounOrIndex.toLowerCase().trim();

  // Check for numeric index (e.g., "1", "2", "first", "second")
  const indexPatterns: Array<{ pattern: RegExp; index: number }> = [
    { pattern: /^1$|^first$|^the first( one)?$/i, index: 0 },
    { pattern: /^2$|^second$|^the second( one)?$/i, index: 1 },
    { pattern: /^3$|^third$|^the third( one)?$/i, index: 2 },
    { pattern: /^4$|^fourth$|^the fourth( one)?$/i, index: 3 },
    { pattern: /^5$|^fifth$|^the fifth( one)?$/i, index: 4 },
  ];

  for (const { pattern, index } of indexPatterns) {
    if (pattern.test(normalized)) {
      if (context.lastBookList && context.lastBookList[index]) {
        return context.lastBookList[index];
      }
    }
  }

  // For pronouns like "it", "this", "that", return the last queried book
  const pronouns = ["it", "this", "that", "this book", "that book", "the book"];
  if (pronouns.includes(normalized)) {
    return context.lastQueriedBook || null;
  }

  return null;
}

/**
 * Convert intent parameters to handler format
 */
function toHandlerParams(params: IntentParameters | AIIntentParameters): Record<string, string | number | boolean | undefined> {
  return params as Record<string, string | number | boolean | undefined>;
}

/**
 * Route a classified intent to the appropriate handler
 */
async function routeToHandler(
  classification: { intent: string; parameters: IntentParameters | AIIntentParameters; rawMessage: string },
  context?: ConversationContext
): Promise<HandlerResponse> {
  const { intent, parameters, rawMessage } = classification;
  const handlerContext = { userId: 'default', rawMessage };
  const handlerIntent = { command: intent, params: toHandlerParams(parameters) };

  switch (intent) {
    // ============================================
    // Existing intents
    // ============================================
    case 'update_progress':
    case AIIntentType.UPDATE_PROGRESS:
      return handleUpdateProgress(parameters as IntentParameters, context);

    case 'start_book':
    case AIIntentType.START_BOOK:
    case AIIntentType.ADD_BOOK:
      return handleStartBook(parameters as IntentParameters);

    case 'finish_book':
    case AIIntentType.FINISH_BOOK:
      return handleFinishBook(parameters as IntentParameters, context);

    case 'get_status':
      return handleGetStatus(context);

    case 'list_reading':
    case AIIntentType.LIST_BOOKS:
      return handleListReading();

    case 'search_book':
    case AIIntentType.SEARCH_BOOKS:
      return handleSearchBook(parameters as IntentParameters);

    case 'get_stats':
    case AIIntentType.GET_STATS:
      // Check if asking about currently reading
      if ((parameters as AIIntentParameters)?.statType === 'current_reading') {
        return handleGetStatus(context);
      }
      return handleGetStats();

    case 'help':
    case AIIntentType.HELP:
      return handleHelp();

    case AIIntentType.GET_RECOMMENDATIONS: {
      // Search ALL books in collection by topic/genre
      const result = await recommendBooksHandler(handlerIntent, handlerContext);
      return result;
    }

    case AIIntentType.RATE_BOOK:
      return {
        success: true,
        message: 'Rating feature coming soon! For now, you can rate books in the app.',
      };

    case AIIntentType.SET_REMINDER:
      return {
        success: true,
        message: 'Reminders coming soon! For now, set a reminder on your phone to read.',
      };

    // ============================================
    // New collection query intents
    // ============================================
    case AIIntentType.BOOK_DETAILS: {
      const result = await bookDetailsHandler(handlerIntent, handlerContext);
      return {
        success: result.success,
        message: result.message,
        data: result.data,
      };
    }

    case AIIntentType.READING_STATUS: {
      const result = await readingStatusHandler(handlerIntent, handlerContext);
      return {
        success: result.success,
        message: result.message,
        data: result.data,
      };
    }

    case AIIntentType.GENRE_STATS: {
      const result = await genreQueryHandler(handlerIntent, handlerContext);
      return {
        success: result.success,
        message: result.message,
        data: result.data,
      };
    }

    case AIIntentType.READING_PATTERNS: {
      const result = await readingPatternsHandler(handlerIntent, handlerContext);
      return {
        success: result.success,
        message: result.message,
        data: result.data,
      };
    }

    case AIIntentType.RATINGS_QUERY: {
      const result = await ratingsQueryHandler(handlerIntent, handlerContext);
      return {
        success: result.success,
        message: result.message,
        data: result.data,
      };
    }

    case AIIntentType.GOAL_PROGRESS: {
      const result = await goalProgressHandler(handlerIntent, handlerContext);
      return {
        success: result.success,
        message: result.message,
        data: result.data,
      };
    }

    case AIIntentType.UNREAD_BOOKS: {
      const result = await unreadBooksHandler(handlerIntent, handlerContext);
      return {
        success: result.success,
        message: result.message,
        data: result.data,
      };
    }

    case AIIntentType.SIMILAR_BOOKS: {
      const result = await similarBooksHandler(handlerIntent, handlerContext);
      return {
        success: result.success,
        message: result.message,
        data: result.data,
      };
    }

    case AIIntentType.COMPARE_BOOKS: {
      const result = await compareBooksHandler(handlerIntent, handlerContext);
      return {
        success: result.success,
        message: result.message,
        data: result.data,
      };
    }

    case AIIntentType.TIME_QUERY: {
      const result = await timeQueryHandler(handlerIntent, handlerContext);
      return {
        success: result.success,
        message: result.message,
        data: result.data,
      };
    }

    case AIIntentType.COMPLEX_FILTER: {
      const result = await complexFilterHandler(handlerIntent, handlerContext);
      return {
        success: result.success,
        message: result.message,
        data: result.data,
      };
    }

    case AIIntentType.DREWBERTS_PICKS: {
      const result = await drewbertsPicksHandler(handlerIntent, handlerContext);
      return {
        success: result.success,
        message: result.message,
        data: result.data,
      };
    }

    case 'unknown':
    case AIIntentType.UNKNOWN:
    default:
      return await handleUnknown(rawMessage);
  }
}

/**
 * Get recommendation response based on genre
 */
function getRecommendationResponse(genre?: string): string {
  if (genre) {
    return `Looking for ${genre} recommendations? Check your bookshelf for similar books you've enjoyed. AI recommendations coming soon!`;
  }
  return 'For personalized recommendations, try "recommend fantasy" or "suggest mystery". AI recommendations coming soon!';
}

/**
 * Handle "more" request for pagination
 */
async function handleMoreRequest(
  context: ExtendedContext,
  phoneNumber: string
): Promise<HandlerResponse | null> {
  const pagination = context.pagination;

  if (!pagination || !pagination.resultIds || pagination.currentOffset >= pagination.totalCount) {
    return {
      success: true,
      message: 'No more results to show. Try a new search.',
    };
  }

  // Get next batch of IDs
  const nextIds = pagination.resultIds.slice(
    pagination.currentOffset,
    pagination.currentOffset + pagination.pageSize
  );
  const newOffset = pagination.currentOffset + nextIds.length;
  const hasMore = newOffset < pagination.totalCount;

  // Re-run the original query with the next page
  // For now, return a message directing them to refine their search
  // In a full implementation, we'd fetch the actual book details here

  const remaining = pagination.totalCount - newOffset;

  updateContext(phoneNumber, {
    pagination: {
      ...pagination,
      currentOffset: newOffset,
    },
  } as Partial<ExtendedContext>);

  return {
    success: true,
    message: hasMore
      ? `Showing ${nextIds.length} more results. ${remaining} remaining. Reply MORE for more.`
      : `Showing final ${nextIds.length} results.`,
    data: {
      shown: nextIds.length,
      remaining: hasMore ? remaining : 0,
      hasMore,
    },
  };
}

/**
 * Handle follow-up question about a book
 */
async function handleFollowUpQuestion(
  context: ExtendedContext,
  attribute: string,
  phoneNumber: string
): Promise<HandlerResponse | null> {
  const lastBook = context.lastQueriedBook;

  if (!lastBook) {
    return {
      success: false,
      message: "I'm not sure which book you're asking about. Please mention the book title.",
    };
  }

  // Format the response for the specific attribute
  const response = formatBookDetail(
    {
      title: lastBook.title,
      author: lastBook.author,
      pages: lastBook.pages,
      progressPercent: lastBook.progressPercent,
    },
    attribute
  );

  return {
    success: true,
    message: response,
    data: { bookId: lastBook.bookId, attribute },
  };
}

/**
 * Process an incoming SMS message and return a response
 */
export async function processMessage(
  message: string,
  phoneNumber: string
): Promise<HandlerResponse> {
  // Validate input
  const validationResult = validateInput(phoneNumber, message);
  if (!validationResult.valid) {
    return {
      success: false,
      message: validationResult.error || 'Invalid input',
    };
  }

  // Check rate limiting
  if (isRateLimited(phoneNumber)) {
    return {
      success: false,
      message: 'Whoa, slow down! You\'re sending messages too fast. Please wait a moment.',
    };
  }

  // Get existing conversation context
  const context = getContext(phoneNumber) as ExtendedContext | undefined;

  // ============================================
  // Check for "more" / pagination request
  // ============================================
  if (isMoreRequest(message)) {
    if (context?.pagination) {
      const moreResponse = await handleMoreRequest(context, phoneNumber);
      if (moreResponse) return moreResponse;
    } else {
      return {
        success: true,
        message: 'No previous results to show more of. Try a search first.',
      };
    }
  }

  // ============================================
  // Check for follow-up questions
  // ============================================
  const followUp = detectFollowUpQuestion(message);
  if (followUp.isFollowUp && followUp.attribute && context) {
    const followUpResponse = await handleFollowUpQuestion(
      context,
      followUp.attribute,
      phoneNumber
    );
    if (followUpResponse) return followUpResponse;
  }

  // ============================================
  // Check for pronoun/index references
  // ============================================
  // If the message contains pronouns like "it", "that book", "1", "first one"
  // try to resolve them to a book from context
  if (context) {
    const pronounPatterns = /^(tell me about )?(it|this|that|the book|1|2|3|first|second|third)$/i;
    if (pronounPatterns.test(message.trim())) {
      const resolvedBook = resolveBookReferenceFromContext(context, message.trim());
      if (resolvedBook) {
        // Re-route to book details with the resolved book
        const response = await routeToHandler(
          {
            intent: AIIntentType.BOOK_DETAILS,
            parameters: { bookTitle: resolvedBook.title },
            rawMessage: message,
          },
          context
        );

        // Update context with the queried book
        updateContext(phoneNumber, {
          lastQueriedBook: resolvedBook,
          lastBookId: resolvedBook.bookId,
          lastBookTitle: resolvedBook.title,
        } as Partial<ExtendedContext>);

        return response;
      }
    }
  }

  // ============================================
  // Classify the incoming message using AI
  // ============================================
  const classification = await classifyIntentWithAI(message);

  // Check if classification is confident enough (threshold 0.4 for better coverage)
  if (classification.confidence < 0.4 || classification.intent === AIIntentType.UNKNOWN) {
    // If we have context and are awaiting confirmation, handle differently
    if (context?.awaitingConfirmation) {
      const lowerMessage = message.toLowerCase().trim();
      if (lowerMessage === 'yes' || lowerMessage === 'y') {
        // Handle confirmation
        if (context.confirmationType === 'finish_book' && context.lastBookId) {
          const response = await handleFinishBook({ bookId: context.lastBookId });
          clearContext(phoneNumber);
          return response;
        }
      } else if (lowerMessage === 'no' || lowerMessage === 'n') {
        clearContext(phoneNumber);
        return {
          success: true,
          message: 'Ok, cancelled. What would you like to do instead?',
        };
      }
    }

    // Fall through to unknown handler
    return await handleUnknown(message);
  }

  // ============================================
  // Route to appropriate handler
  // ============================================
  const response = await routeToHandler(classification, context);

  // ============================================
  // Update context based on the response
  // ============================================
  if (response.success && response.data) {
    const contextUpdate: Partial<ExtendedContext> = {
      lastIntent: classification.intent as ConversationContext['lastIntent'],
      lastBookId: response.data.bookId as number | undefined,
      lastBookTitle: response.data.title as string | undefined,
      awaitingConfirmation: false,
      lastIntentType: classification.intent,
    };

    // If response contains a single book, store it for follow-ups
    if (response.data.bookId && response.data.title) {
      contextUpdate.lastQueriedBook = {
        bookId: response.data.bookId as number,
        title: response.data.title as string,
        author: response.data.author as string | undefined,
        pages: response.data.pages as number | undefined,
      };
    }

    // If response contains a list of books, store them
    if (response.data.books && Array.isArray(response.data.books)) {
      contextUpdate.lastBookList = (response.data.books as Array<{ id: number; title: string }>).map(
        (b) => ({
          bookId: b.id,
          title: b.title,
        })
      );

      // Set up pagination if there are more results
      if (response.data.totalCount && (response.data.totalCount as number) > (response.data.shown as number || 0)) {
        const books = response.data.books as Array<{ id: number }>;
        contextUpdate.pagination = {
          resultIds: books.map((b) => b.id),
          totalCount: response.data.totalCount as number,
          currentOffset: response.data.shown as number || books.length,
          pageSize: 5,
          sourceIntent: classification.intent,
        };
      }
    }

    updateContext(phoneNumber, contextUpdate);
  }

  return response;
}

/**
 * Main function to process incoming SMS messages
 *
 * @param phoneNumber - Sender's phone number in E.164 format
 * @param messageBody - The SMS message content
 * @param messageSid - Twilio message SID for tracking
 * @returns ProcessingResult with response text and metadata
 */
export async function processIncomingSMS(
  phoneNumber: string,
  messageBody: string,
  _messageSid: string // Kept for API compatibility
): Promise<ProcessingResult> {
  try {
    const response = await processMessage(messageBody, phoneNumber);

    // Check if response needs to be split
    const shouldSplit = response.message.length > 160;

    return {
      success: response.success,
      response: response.message,
      shouldSplit,
    };
  } catch (error) {
    console.error('Error processing SMS:', error);

    return {
      success: false,
      response: 'Sorry, something went wrong. Please try again or reply "help" for commands.',
      shouldSplit: false,
    };
  }
}

/**
 * Process a Twilio webhook request
 */
export async function processTwilioWebhook(
  webhookData: TwilioIncomingMessage
): Promise<string> {
  const { Body: message, From: phoneNumber } = webhookData;

  try {
    const response = await processMessage(message, phoneNumber);
    return formatTwiMLResponse(response.message);
  } catch (error) {
    console.error('Error processing SMS:', error);
    return formatTwiMLResponse(
      'Sorry, something went wrong. Please try again or reply "help" for commands.'
    );
  }
}

/**
 * Process incoming SMS and return TwiML response
 * Convenience wrapper for webhook handlers
 */
export async function processIncomingSMSToTwiML(
  phoneNumber: string,
  messageBody: string,
  messageSid: string
): Promise<string> {
  const result = await processIncomingSMS(phoneNumber, messageBody, messageSid);
  return formatTwiMLResponse(result.response);
}

/**
 * Format a response as TwiML for Twilio
 */
export function formatTwiMLResponse(message: string): string {
  // Escape XML special characters
  const escapedMessage = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapedMessage}</Message>
</Response>`;
}

/**
 * Validate Twilio signature for security
 */
export function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>,
  authToken: string
): boolean {
  // This is a placeholder - implement actual validation using twilio package
  // See: https://www.twilio.com/docs/usage/security#validating-requests
  if (!signature || !authToken) {
    return false;
  }

  // For now, return true if signature exists and auth token is configured
  // In production, use twilio.validateRequest()
  return true;
}

/**
 * Clean up rate limit map periodically
 * Call from a cleanup job or cron
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];

  rateLimitMap.forEach((value, key) => {
    if (now > value.resetAt) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach(key => rateLimitMap.delete(key));
}

/**
 * Get current rate limit status for a phone number (for debugging/monitoring)
 */
export function getRateLimitStatus(
  phoneNumber: string
): { limited: boolean; count: number; resetsIn: number } | null {
  const entry = rateLimitMap.get(phoneNumber);
  if (!entry) {
    return null;
  }

  const now = Date.now();
  if (now > entry.resetAt) {
    return null;
  }

  return {
    limited: entry.count >= MAX_MESSAGES_PER_WINDOW,
    count: entry.count,
    resetsIn: Math.max(0, entry.resetAt - now),
  };
}

// Export for testing
export const __testing__ = {
  contextStore,
  rateLimitMap,
  CONTEXT_TIMEOUT,
  RATE_LIMIT_WINDOW_MS,
  MAX_MESSAGES_PER_WINDOW,
  validateInput,
  isRateLimited,
  routeToHandler,
};
