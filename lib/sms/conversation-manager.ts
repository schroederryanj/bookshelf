/**
 * SMS Conversation Manager
 *
 * Handles conversation state management including:
 * - Creating and retrieving conversations
 * - Managing conversation context
 * - Handling conversation expiry
 * - Supporting multi-turn interactions
 */

import { prisma } from "@/lib/prisma";
import type { SMSConversation, SMSMessage, Prisma } from "@prisma/client";

// Conversation timeout in milliseconds (30 minutes)
const CONVERSATION_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * Pagination context for multi-message result sets
 */
export interface PaginationContext {
  /** All result IDs from the query */
  resultIds: number[];
  /** Total number of results */
  totalCount: number;
  /** Current offset (how many already shown) */
  currentOffset: number;
  /** Page size (results per page) */
  pageSize: number;
  /** Query parameters to re-run the query if needed */
  queryParams?: Record<string, unknown>;
  /** The intent that generated these results */
  sourceIntent?: string;
}

/**
 * Book reference context for follow-up questions
 */
export interface BookReferenceContext {
  /** The book ID */
  bookId: number;
  /** The book title */
  title: string;
  /** The book author */
  author?: string;
  /** Number of pages */
  pages?: number;
  /** Current reading progress (if applicable) */
  progressPercent?: number;
}

/**
 * Conversation context type
 */
export interface ConversationContext {
  state: "idle" | "searching" | "selecting" | "confirming" | "rating" | "updating" | "paginating";
  pendingAction: string | null;
  selectedBookId: number | null;
  searchQuery: string | null;
  searchResults?: number[];
  lastInteraction: number;

  // Enhanced context for follow-ups and pagination
  /** The last book that was queried or mentioned */
  lastQueriedBook?: BookReferenceContext;
  /** The last list of books returned (for follow-up queries) */
  lastBookList?: BookReferenceContext[];
  /** Pagination state for multi-message results */
  pagination?: PaginationContext;
  /** The last intent type processed */
  lastIntentType?: string;
  /** Parameters from the last query (for refinements) */
  lastQueryParams?: Record<string, unknown>;
  /** Filters currently active */
  activeFilters?: {
    genre?: string;
    readingStatus?: string;
    minRating?: number;
    maxPages?: number;
    timeframe?: string;
  };

  [key: string]: unknown;
}

// Default conversation context
const DEFAULT_CONTEXT: ConversationContext = {
  state: "idle",
  pendingAction: null,
  selectedBookId: null,
  searchQuery: null,
  lastInteraction: Date.now(),
};

/**
 * Helper to convert ConversationContext to Prisma Json
 */
function contextToJson(context: ConversationContext): Prisma.InputJsonValue {
  return context as unknown as Prisma.InputJsonValue;
}

/**
 * Conversation with messages type
 */
export interface ConversationWithMessages extends SMSConversation {
  messages: SMSMessage[];
}

/**
 * Get or create a conversation for a phone number
 *
 * @param phoneNumber - Phone number in E.164 format
 * @param userId - Optional user ID for multi-user support
 * @returns The conversation record
 */
export async function getOrCreateConversation(
  phoneNumber: string,
  userId: string = "default"
): Promise<SMSConversation> {
  // Try to find existing conversation
  let conversation = await prisma.sMSConversation.findUnique({
    where: { phoneNumber },
  });

  if (conversation) {
    // Check if conversation has expired
    const context = conversation.context as ConversationContext | null;
    const lastInteraction = context?.lastInteraction || conversation.updatedAt.getTime();
    const isExpired = Date.now() - lastInteraction > CONVERSATION_TIMEOUT_MS;

    if (isExpired) {
      // Reset context for expired conversations
      conversation = await prisma.sMSConversation.update({
        where: { id: conversation.id },
        data: {
          context: contextToJson({ ...DEFAULT_CONTEXT, lastInteraction: Date.now() }),
          lastIntent: null,
        },
      });
    }
  } else {
    // Create new conversation
    conversation = await prisma.sMSConversation.create({
      data: {
        phoneNumber,
        userId,
        context: contextToJson({ ...DEFAULT_CONTEXT, lastInteraction: Date.now() }),
      },
    });
  }

  return conversation;
}

/**
 * Get conversation by ID
 *
 * @param conversationId - Conversation ID
 * @returns The conversation record or null
 */
export async function getConversation(
  conversationId: string
): Promise<SMSConversation | null> {
  return prisma.sMSConversation.findUnique({
    where: { id: conversationId },
  });
}

/**
 * Get conversation with recent messages
 *
 * @param phoneNumber - Phone number in E.164 format
 * @param messageLimit - Number of recent messages to include
 * @returns Conversation with messages
 */
export async function getConversationWithMessages(
  phoneNumber: string,
  messageLimit: number = 10
): Promise<ConversationWithMessages | null> {
  return prisma.sMSConversation.findUnique({
    where: { phoneNumber },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: messageLimit,
      },
    },
  });
}

/**
 * Update conversation context
 *
 * @param conversationId - Conversation ID
 * @param updates - Partial context updates
 * @returns Updated conversation
 */
export async function updateContext(
  conversationId: string,
  updates: Partial<ConversationContext>
): Promise<SMSConversation> {
  const conversation = await prisma.sMSConversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new Error(`Conversation not found: ${conversationId}`);
  }

  const currentContext = (conversation.context as ConversationContext) || { ...DEFAULT_CONTEXT, lastInteraction: Date.now() };
  const newContext: ConversationContext = {
    ...currentContext,
    ...updates,
    lastInteraction: Date.now(),
  };

  return prisma.sMSConversation.update({
    where: { id: conversationId },
    data: {
      context: contextToJson(newContext),
    },
  });
}

/**
 * Update conversation intent
 *
 * @param conversationId - Conversation ID
 * @param intent - The detected intent
 * @returns Updated conversation
 */
export async function updateIntent(
  conversationId: string,
  intent: string
): Promise<SMSConversation> {
  return prisma.sMSConversation.update({
    where: { id: conversationId },
    data: {
      lastIntent: intent,
    },
  });
}

/**
 * Reset conversation state to idle
 *
 * @param conversationId - Conversation ID
 * @returns Updated conversation
 */
export async function resetConversation(
  conversationId: string
): Promise<SMSConversation> {
  return prisma.sMSConversation.update({
    where: { id: conversationId },
    data: {
      context: contextToJson({ ...DEFAULT_CONTEXT, lastInteraction: Date.now() }),
      lastIntent: null,
    },
  });
}

/**
 * Store an inbound message
 *
 * @param conversationId - Conversation ID
 * @param body - Message body
 * @param twilioSid - Twilio message SID
 * @returns Created message record
 */
export async function storeInboundMessage(
  conversationId: string,
  body: string,
  twilioSid?: string
): Promise<SMSMessage> {
  return prisma.sMSMessage.create({
    data: {
      conversationId,
      direction: "inbound",
      body,
      twilioSid: twilioSid || null,
    },
  });
}

/**
 * Store an outbound message
 *
 * @param conversationId - Conversation ID
 * @param body - Message body
 * @param twilioSid - Twilio message SID
 * @returns Created message record
 */
export async function storeOutboundMessage(
  conversationId: string,
  body: string,
  twilioSid?: string
): Promise<SMSMessage> {
  return prisma.sMSMessage.create({
    data: {
      conversationId,
      direction: "outbound",
      body,
      twilioSid: twilioSid || null,
    },
  });
}

/**
 * Get recent messages for a conversation
 *
 * @param conversationId - Conversation ID
 * @param limit - Maximum number of messages to return
 * @returns Array of messages (newest first)
 */
export async function getRecentMessages(
  conversationId: string,
  limit: number = 10
): Promise<SMSMessage[]> {
  return prisma.sMSMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Check if conversation is active (not expired)
 *
 * @param conversation - Conversation record
 * @returns Boolean indicating if conversation is active
 */
export function isConversationActive(conversation: SMSConversation): boolean {
  const context = conversation.context as ConversationContext | null;
  const lastInteraction = context?.lastInteraction || conversation.updatedAt.getTime();
  return Date.now() - lastInteraction < CONVERSATION_TIMEOUT_MS;
}

/**
 * Get conversation state
 *
 * @param conversation - Conversation record
 * @returns Current conversation state
 */
export function getConversationState(
  conversation: SMSConversation
): ConversationContext["state"] {
  const context = conversation.context as ConversationContext | null;
  return context?.state || "idle";
}

/**
 * Clean up expired conversations (for maintenance)
 *
 * @param olderThanDays - Remove conversations older than this many days
 * @returns Number of deleted conversations
 */
export async function cleanupExpiredConversations(
  olderThanDays: number = 30
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const result = await prisma.sMSConversation.deleteMany({
    where: {
      updatedAt: {
        lt: cutoffDate,
      },
    },
  });

  return result.count;
}

/**
 * Get conversation context safely with defaults
 *
 * @param conversation - Conversation record
 * @returns Conversation context with defaults applied
 */
export function getContext(conversation: SMSConversation): ConversationContext {
  const context = conversation.context as ConversationContext | null;
  const defaultContext: ConversationContext = { ...DEFAULT_CONTEXT, lastInteraction: Date.now() };
  return {
    ...defaultContext,
    ...context,
  } as ConversationContext;
}

// ============================================
// Enhanced Context Management for Follow-ups
// ============================================

/**
 * Update the last queried book in context
 *
 * @param conversationId - Conversation ID
 * @param book - Book reference to store
 * @returns Updated conversation
 */
export async function setLastQueriedBook(
  conversationId: string,
  book: BookReferenceContext
): Promise<SMSConversation> {
  return updateContext(conversationId, {
    lastQueriedBook: book,
    selectedBookId: book.bookId,
  });
}

/**
 * Update pagination state
 *
 * @param conversationId - Conversation ID
 * @param pagination - Pagination context
 * @returns Updated conversation
 */
export async function setPaginationContext(
  conversationId: string,
  pagination: PaginationContext
): Promise<SMSConversation> {
  return updateContext(conversationId, {
    pagination,
    state: "paginating",
  });
}

/**
 * Clear pagination state
 *
 * @param conversationId - Conversation ID
 * @returns Updated conversation
 */
export async function clearPaginationContext(
  conversationId: string
): Promise<SMSConversation> {
  const conversation = await prisma.sMSConversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new Error(`Conversation not found: ${conversationId}`);
  }

  const currentContext = (conversation.context as ConversationContext) || { ...DEFAULT_CONTEXT, lastInteraction: Date.now() };

  // Remove pagination but keep other context
  const { pagination: _, ...restContext } = currentContext;

  return prisma.sMSConversation.update({
    where: { id: conversationId },
    data: {
      context: contextToJson({
        ...restContext,
        state: "idle",
        lastInteraction: Date.now(),
      } as ConversationContext),
    },
  });
}

/**
 * Get the next page of results from pagination context
 *
 * @param conversation - Conversation record
 * @returns Object with next page IDs and updated offset, or null if no more
 */
export function getNextPage(
  conversation: SMSConversation
): { ids: number[]; newOffset: number; hasMore: boolean } | null {
  const context = getContext(conversation);
  const pagination = context.pagination;

  if (!pagination || !pagination.resultIds) {
    return null;
  }

  const { resultIds, currentOffset, pageSize, totalCount } = pagination;

  if (currentOffset >= totalCount) {
    return null;
  }

  const nextIds = resultIds.slice(currentOffset, currentOffset + pageSize);
  const newOffset = currentOffset + pageSize;
  const hasMore = newOffset < totalCount;

  return {
    ids: nextIds,
    newOffset,
    hasMore,
  };
}

/**
 * Store query results for pagination
 *
 * @param conversationId - Conversation ID
 * @param results - Array of book IDs from query
 * @param pageSize - Number of results to show per page
 * @param sourceIntent - The intent that generated these results
 * @param queryParams - Original query parameters
 * @returns Updated conversation
 */
export async function storeQueryResults(
  conversationId: string,
  results: number[],
  pageSize: number = 5,
  sourceIntent?: string,
  queryParams?: Record<string, unknown>
): Promise<SMSConversation> {
  const pagination: PaginationContext = {
    resultIds: results,
    totalCount: results.length,
    currentOffset: Math.min(pageSize, results.length),
    pageSize,
    sourceIntent,
    queryParams,
  };

  return setPaginationContext(conversationId, pagination);
}

/**
 * Update the last book list in context
 *
 * @param conversationId - Conversation ID
 * @param books - Array of book references
 * @returns Updated conversation
 */
export async function setLastBookList(
  conversationId: string,
  books: BookReferenceContext[]
): Promise<SMSConversation> {
  return updateContext(conversationId, {
    lastBookList: books,
  });
}

/**
 * Store the last query parameters for refinement
 *
 * @param conversationId - Conversation ID
 * @param intent - The intent type
 * @param params - Query parameters
 * @returns Updated conversation
 */
export async function setLastQuery(
  conversationId: string,
  intent: string,
  params: Record<string, unknown>
): Promise<SMSConversation> {
  return updateContext(conversationId, {
    lastIntentType: intent,
    lastQueryParams: params,
  });
}

/**
 * Check if the user is asking for more results
 *
 * @param message - The user's message
 * @returns Boolean indicating if this is a "more" request
 */
export function isMoreRequest(message: string): boolean {
  const normalized = message.toLowerCase().trim();
  const morePatterns = [
    /^more$/,
    /^show more$/,
    /^next$/,
    /^next \d+$/,
    /^more results$/,
    /^continue$/,
    /^show next$/,
    /^next page$/,
  ];

  return morePatterns.some((pattern) => pattern.test(normalized));
}

/**
 * Check if this is a follow-up question about a book
 *
 * @param message - The user's message
 * @returns Object with isFollowUp flag and the attribute being asked about
 */
export function detectFollowUpQuestion(
  message: string
): { isFollowUp: boolean; attribute?: string } {
  const normalized = message.toLowerCase().trim();

  // Patterns for follow-up questions
  const followUpPatterns: Array<{ pattern: RegExp; attribute: string }> = [
    // Page count questions
    { pattern: /^how many pages/i, attribute: "pages" },
    { pattern: /^how long is it/i, attribute: "pages" },
    { pattern: /^page count/i, attribute: "pages" },

    // Author questions
    { pattern: /^who wrote it/i, attribute: "author" },
    { pattern: /^who('s| is) the author/i, attribute: "author" },
    { pattern: /^by who/i, attribute: "author" },

    // Rating questions
    { pattern: /^what('s| is) (the )?rating/i, attribute: "rating" },
    { pattern: /^how (did i|do i) rate it/i, attribute: "rating" },
    { pattern: /^rating\??$/i, attribute: "rating" },

    // Genre questions
    { pattern: /^what genre/i, attribute: "genre" },
    { pattern: /^genre\??$/i, attribute: "genre" },

    // Progress questions
    { pattern: /^(what('s| is) my )?progress/i, attribute: "progress" },
    { pattern: /^how far (am i|did i get)/i, attribute: "progress" },
    { pattern: /^where (am i|did i stop)/i, attribute: "progress" },

    // Status questions
    { pattern: /^(have i|did i) (read|finish)/i, attribute: "status" },
    { pattern: /^status\??$/i, attribute: "status" },

    // Generic "tell me more"
    { pattern: /^tell me more/i, attribute: "details" },
    { pattern: /^more details/i, attribute: "details" },
    { pattern: /^more about it/i, attribute: "details" },
  ];

  for (const { pattern, attribute } of followUpPatterns) {
    if (pattern.test(normalized)) {
      return { isFollowUp: true, attribute };
    }
  }

  // Check for pronoun references without specific attribute
  const pronounPatterns = [
    /^(what about )?(it|this|that|this book|that book|the book)/i,
  ];

  for (const pattern of pronounPatterns) {
    if (pattern.test(normalized)) {
      return { isFollowUp: true, attribute: "general" };
    }
  }

  return { isFollowUp: false };
}

/**
 * Resolve a pronoun reference to a book from context
 *
 * @param conversation - Conversation record
 * @param pronounOrIndex - The pronoun or list index (e.g., "it", "1", "the first one")
 * @returns The book reference or null if not found
 */
export function resolveBookReference(
  conversation: SMSConversation,
  pronounOrIndex: string
): BookReferenceContext | null {
  const context = getContext(conversation);
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
