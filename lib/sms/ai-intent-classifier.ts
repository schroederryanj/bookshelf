/**
 * AI-Powered Intent Classifier for SMS Messages
 * Uses Claude API to parse natural language messages and extract intent + parameters
 * Falls back to regex-based classification when AI is unavailable
 */

import {
  AIIntentType,
  ParsedIntent,
  AIIntentParameters,
  AIConversationContext,
} from './types';
import {
  createCompletionWithRetry,
  isServiceAvailable,
  INTENT_CLASSIFICATION_SYSTEM_PROMPT,
} from './ai-service';

/**
 * Helper to extract genre from text
 */
const KNOWN_GENRES = [
  'fantasy', 'sci-fi', 'science fiction', 'scifi', 'mystery', 'romance',
  'thriller', 'horror', 'non-fiction', 'nonfiction', 'biography', 'memoir',
  'history', 'historical fiction', 'literary fiction', 'young adult', 'ya',
  'middle grade', 'children', 'poetry', 'self-help', 'business', 'psychology'
];

function extractGenre(text: string): string | undefined {
  const lower = text.toLowerCase();
  return KNOWN_GENRES.find((g) => lower.includes(g));
}

/**
 * Helper to extract timeframe from text
 */
function extractTimeframe(text: string): AIIntentParameters['timeframe'] {
  const lower = text.toLowerCase();
  if (/today|this day/i.test(lower)) return 'today';
  if (/this week|past week/i.test(lower)) return 'week';
  if (/this month|past month|last month/i.test(lower)) return 'month';
  if (/this year|past year|last year/i.test(lower)) return 'year';
  // Check for specific year like "2023", "in 2024"
  const yearMatch = lower.match(/\b(20\d{2})\b/);
  if (yearMatch) return yearMatch[1];
  return undefined;
}

/**
 * Helper to extract page limit from text (e.g., "under 300 pages")
 */
function extractPageLimit(text: string): { maxPages?: number; minPages?: number } {
  const lower = text.toLowerCase();
  const underMatch = lower.match(/(?:under|less than|below|shorter than)\s*(\d+)\s*(?:pages?|pg)/i);
  const overMatch = lower.match(/(?:over|more than|above|longer than)\s*(\d+)\s*(?:pages?|pg)/i);

  return {
    maxPages: underMatch ? parseInt(underMatch[1], 10) : undefined,
    minPages: overMatch ? parseInt(overMatch[1], 10) : undefined,
  };
}

/**
 * Helper to extract rating threshold from text (e.g., "4+ stars", "rated 4 or above")
 */
function extractRatingThreshold(text: string): number | undefined {
  const lower = text.toLowerCase();
  const matches = [
    lower.match(/(\d(?:\.\d)?)\+\s*(?:star|rating)/i),
    lower.match(/(?:rated|rating)\s*(?:above|over|at least|minimum)\s*(\d(?:\.\d)?)/i),
    lower.match(/(?:above|over|at least)\s*(\d(?:\.\d)?)\s*star/i),
    lower.match(/(\d(?:\.\d)?)\s*(?:star|rating)\s*(?:or\s+(?:above|higher|more|better))/i),
  ];

  for (const match of matches) {
    if (match) {
      return Math.min(5, Math.max(1, parseFloat(match[1])));
    }
  }
  return undefined;
}

/**
 * Helper to extract comparison books from text
 */
function extractComparisonBooks(text: string): string[] | undefined {
  // Patterns like "Dune or LOTR", "Dune and LOTR", "Dune vs LOTR", "between Dune and LOTR"
  const patterns = [
    /(?:compare|comparing|between)\s+(.+?)\s+(?:and|vs\.?|or|versus)\s+(.+?)(?:\?|$)/i,
    /(?:which is|what is)\s+(?:longer|shorter|better|higher rated)[,:]?\s*(.+?)\s+(?:or|vs\.?|and|versus)\s+(.+?)(?:\?|$)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return [match[1].trim(), match[2].trim()];
    }
  }
  return undefined;
}

/**
 * Fallback patterns for basic intent detection without AI
 */
const FALLBACK_PATTERNS: Array<{
  pattern: RegExp;
  intent: AIIntentType;
  extractParams: (match: RegExpMatchArray, message: string) => AIIntentParameters;
}> = [
  // Help patterns
  {
    pattern: /^(help|commands|\?|what can you do)/i,
    intent: AIIntentType.HELP,
    extractParams: () => ({}),
  },

  // ============================================
  // NEW INTENT PATTERNS
  // ============================================

  // BOOK_DETAILS - "Tell me about The Hobbit", "How many pages is Dune?"
  {
    pattern: /(?:tell me about|info(?:rmation)?\s+(?:on|about)|details?\s+(?:on|about|for)|how many pages\s+(?:is|does|in)|who wrote|author of)\s+(.+?)(?:\?|$)/i,
    intent: AIIntentType.BOOK_DETAILS,
    extractParams: (match) => ({
      bookTitle: match[1]?.trim().replace(/^the book\s+/i, ''),
    }),
  },

  // READING_STATUS - "What books am I reading?", "Which books haven't I started?"
  {
    pattern: /(?:what|which|show|list)\s+(?:books?\s+)?(?:am i|are you|i am)\s+(?:currently\s+)?reading/i,
    intent: AIIntentType.READING_STATUS,
    extractParams: () => ({
      readingStatus: 'reading' as const,
    }),
  },
  {
    pattern: /(?:which|what|show)\s+books?\s+(?:haven'?t\s+i\s+started|i\s+haven'?t\s+started|are\s+unstarted)/i,
    intent: AIIntentType.READING_STATUS,
    extractParams: () => ({
      readingStatus: 'unread' as const,
    }),
  },
  {
    pattern: /(?:in[- ]?progress|currently\s+reading)\s+books?/i,
    intent: AIIntentType.READING_STATUS,
    extractParams: () => ({
      readingStatus: 'reading' as const,
    }),
  },

  // GENRE_STATS - "What's my favorite genre?", "How many fantasy books?"
  {
    pattern: /(?:what(?:'s| is)\s+my\s+)?(?:favorite|most read|top)\s+genre/i,
    intent: AIIntentType.GENRE_STATS,
    extractParams: () => ({
      statType: 'favorite_genre' as const,
    }),
  },
  {
    pattern: /(?:how many|count|number of)\s+(fantasy|sci-?fi|science fiction|mystery|romance|thriller|horror|non-?fiction|biography)\s+books?/i,
    intent: AIIntentType.GENRE_STATS,
    extractParams: (match) => ({
      genre: match[1]?.trim().toLowerCase(),
      statType: 'books_by_genre' as const,
    }),
  },
  {
    pattern: /genre\s+(?:breakdown|stats?|statistics)/i,
    intent: AIIntentType.GENRE_STATS,
    extractParams: () => ({
      statType: 'genre_breakdown' as const,
    }),
  },

  // READING_PATTERNS - "What's my reading streak?", "Average pages per day?"
  {
    pattern: /(?:what(?:'s| is)\s+my\s+)?(?:reading\s+)?streak/i,
    intent: AIIntentType.READING_PATTERNS,
    extractParams: () => ({
      statType: 'reading_streak' as const,
    }),
  },
  {
    pattern: /(?:average|avg)\s+(?:pages?\s+per\s+day|daily\s+pages?|reading\s+pace)/i,
    intent: AIIntentType.READING_PATTERNS,
    extractParams: () => ({
      statType: 'pages_per_day' as const,
    }),
  },
  {
    pattern: /(?:reading|my)\s+(?:pace|habits?|patterns?)/i,
    intent: AIIntentType.READING_PATTERNS,
    extractParams: () => ({}),
  },

  // COMPLEX_FILTER with genre + rating - MUST come BEFORE RATINGS_QUERY to catch "Fantasy books rated 4+"
  {
    pattern: /(fantasy|sci-?fi|science fiction|mystery|romance|thriller|horror|non-?fiction)\s+(?:books?\s+)?(?:rated|with\s+rating)?\s*(\d)\+?\s*(?:stars?)?/i,
    intent: AIIntentType.COMPLEX_FILTER,
    extractParams: (match) => ({
      genre: match[1]?.trim().toLowerCase(),
      ratingThreshold: parseInt(match[2], 10),
      minRating: parseInt(match[2], 10),
    }),
  },

  // RATINGS_QUERY - "What's my highest rated book?", "Show me 5-star books"
  // Note: More specific genre+rating patterns above take precedence
  {
    pattern: /(?:what(?:'s| is)\s+my\s+)?(?:highest|best|top)\s+rated\s+books?/i,
    intent: AIIntentType.RATINGS_QUERY,
    extractParams: () => ({
      sortBy: 'rating' as const,
      limit: 1,
    }),
  },
  {
    pattern: /(?:show|list|what are)\s+(?:me\s+)?(?:my\s+)?(\d)\s*[-]?\s*star\s+books?/i,
    intent: AIIntentType.RATINGS_QUERY,
    extractParams: (match) => ({
      ratingThreshold: parseInt(match[1], 10),
      minRating: parseInt(match[1], 10),
    }),
  },
  {
    pattern: /books?\s+(?:rated|with rating)\s+(\d)(?:\+|\s+(?:or\s+)?(?:above|higher|more))?/i,
    intent: AIIntentType.RATINGS_QUERY,
    extractParams: (match, message) => ({
      ratingThreshold: extractRatingThreshold(message) || parseInt(match[1], 10),
      minRating: parseInt(match[1], 10),
    }),
  },

  // GOAL_PROGRESS - "Am I on track for my goal?", "How many books behind?"
  {
    pattern: /(?:am i|are we)\s+on\s+track\s+(?:for|with)?\s*(?:my|the)?\s*(?:reading\s+)?goal/i,
    intent: AIIntentType.GOAL_PROGRESS,
    extractParams: () => ({}),
  },
  {
    pattern: /(?:how many|how far)\s+(?:books?\s+)?(?:behind|ahead)\s*(?:am i|on my goal)?/i,
    intent: AIIntentType.GOAL_PROGRESS,
    extractParams: () => ({}),
  },
  {
    pattern: /(?:goal|target)\s+(?:progress|status|check)/i,
    intent: AIIntentType.GOAL_PROGRESS,
    extractParams: () => ({}),
  },
  {
    pattern: /(?:reading\s+)?goal\s+(?:progress|status)/i,
    intent: AIIntentType.GOAL_PROGRESS,
    extractParams: () => ({}),
  },

  // UNREAD_BOOKS - "What should I read next?", "Show unread sci-fi"
  {
    pattern: /(?:what|which)\s+(?:should|could)\s+i\s+read\s+next/i,
    intent: AIIntentType.UNREAD_BOOKS,
    extractParams: () => ({
      readingStatus: 'unread' as const,
    }),
  },
  {
    pattern: /(?:show|list|my)\s+(?:unread|tbr|to[- ]be[- ]read)\s*(.+)?/i,
    intent: AIIntentType.UNREAD_BOOKS,
    extractParams: (match, message) => ({
      readingStatus: 'unread' as const,
      genre: extractGenre(message),
    }),
  },
  {
    pattern: /(?:unread|tbr)\s+(fantasy|sci-?fi|science fiction|mystery|romance|thriller|horror|non-?fiction)/i,
    intent: AIIntentType.UNREAD_BOOKS,
    extractParams: (match) => ({
      readingStatus: 'unread' as const,
      genre: match[1]?.trim().toLowerCase(),
    }),
  },

  // SIMILAR_BOOKS - "Find books like The Martian", "Other books by this author?"
  {
    pattern: /(?:find|show|suggest|get)\s+(?:me\s+)?books?\s+(?:like|similar to)\s+(.+)/i,
    intent: AIIntentType.SIMILAR_BOOKS,
    extractParams: (match) => ({
      bookTitle: match[1]?.trim(),
    }),
  },
  {
    pattern: /similar\s+to\s+(.+?)(?:\?|$)/i,
    intent: AIIntentType.SIMILAR_BOOKS,
    extractParams: (match) => ({
      bookTitle: match[1]?.trim(),
    }),
  },
  {
    pattern: /books?\s+like\s+(.+?)(?:\?|$)/i,
    intent: AIIntentType.SIMILAR_BOOKS,
    extractParams: (match) => ({
      bookTitle: match[1]?.trim(),
    }),
  },
  {
    pattern: /other\s+books?\s+by\s+(?:this\s+author|the\s+same\s+author|(.+))/i,
    intent: AIIntentType.SIMILAR_BOOKS,
    extractParams: (match) => ({
      author: match[1]?.trim() || undefined,
    }),
  },

  // COMPARE_BOOKS - "Which is longer, Dune or LOTR?", "Compare ratings"
  {
    pattern: /(?:which|what)\s+(?:is|book is)\s+(?:longer|shorter|better|higher rated)[,:]?\s*(.+?)\s+(?:or|vs\.?|versus)\s+(.+?)(?:\?|$)/i,
    intent: AIIntentType.COMPARE_BOOKS,
    extractParams: (match, message) => {
      const comparison = message.toLowerCase();
      let comparisonType: AIIntentParameters['comparisonType'] = 'pages';
      if (/better|rated|rating/.test(comparison)) comparisonType = 'rating';
      return {
        comparisonBooks: [match[1]?.trim(), match[2]?.trim()],
        comparisonType,
      };
    },
  },
  {
    pattern: /compare\s+(?:ratings?\s+(?:of|for)\s+)?(.+?)\s+(?:and|vs\.?|to|versus)\s+(.+?)(?:\?|$)/i,
    intent: AIIntentType.COMPARE_BOOKS,
    extractParams: (match) => ({
      comparisonBooks: [match[1]?.trim(), match[2]?.trim()],
    }),
  },

  // TIME_QUERY - "What did I read last month?", "Books finished in 2023"
  {
    pattern: /(?:what|which|show)\s+(?:did\s+i|books?\s+(?:did\s+)?i)\s+(?:read|finish)\s+(?:in\s+|last\s+|this\s+)?(.+?)(?:\?|$)/i,
    intent: AIIntentType.TIME_QUERY,
    extractParams: (match, message) => ({
      timeframe: extractTimeframe(message) || match[1]?.trim(),
      readingStatus: 'finished' as const,
    }),
  },
  {
    pattern: /books?\s+(?:finished|completed|read)\s+(?:in\s+)?(20\d{2}|last\s+(?:week|month|year)|this\s+(?:week|month|year))/i,
    intent: AIIntentType.TIME_QUERY,
    extractParams: (match, message) => ({
      timeframe: extractTimeframe(message),
      readingStatus: 'finished' as const,
    }),
  },
  {
    pattern: /(?:this|last)\s+(?:week|month|year)(?:'?s)?\s+(?:reading|books?)/i,
    intent: AIIntentType.TIME_QUERY,
    extractParams: (_, message) => ({
      timeframe: extractTimeframe(message),
    }),
  },

  // COMPLEX_FILTER - "Unread books under 300 pages", "Short fantasy books"
  // Note: Genre + rating pattern moved earlier to take precedence over RATINGS_QUERY
  {
    pattern: /(?:unread|tbr)\s+(?:books?\s+)?(?:under|less than)\s+(\d+)\s+pages?/i,
    intent: AIIntentType.COMPLEX_FILTER,
    extractParams: (match, message) => ({
      readingStatus: 'unread' as const,
      maxPages: parseInt(match[1], 10),
      genre: extractGenre(message),
    }),
  },
  {
    pattern: /(?:short|quick)\s+(fantasy|sci-?fi|science fiction|mystery|romance|thriller|horror|non-?fiction)\s+books?/i,
    intent: AIIntentType.COMPLEX_FILTER,
    extractParams: (match) => ({
      genre: match[1]?.trim().toLowerCase(),
      maxPages: 300, // Default "short" book threshold
    }),
  },

  // ============================================
  // EXISTING INTENT PATTERNS
  // ============================================

  // Update progress patterns
  {
    pattern: /(?:i'?m\s+(?:on\s+)?(?:page|pg|p\.?)\s*(\d+)|(?:page|pg|p\.?)\s*(\d+))\s*(?:of|in)?\s*(.+)?/i,
    intent: AIIntentType.UPDATE_PROGRESS,
    extractParams: (match) => ({
      pageNumber: parseInt(match[1] || match[2], 10),
      bookTitle: match[3]?.trim() || undefined,
    }),
  },
  {
    pattern: /(?:finished|done|completed)\s+(?:reading\s+)?(.+)/i,
    intent: AIIntentType.FINISH_BOOK,
    extractParams: (match) => ({
      bookTitle: match[1]?.trim(),
    }),
  },
  {
    pattern: /(?:start(?:ed|ing)?|begin|began)\s+(?:reading\s+)?(.+)/i,
    intent: AIIntentType.START_BOOK,
    extractParams: (match) => ({
      bookTitle: match[1]?.trim(),
    }),
  },

  // Search patterns
  {
    pattern: /(?:books?\s+by|author)\s+(.+)/i,
    intent: AIIntentType.SEARCH_BOOKS,
    extractParams: (match) => ({
      author: match[1]?.trim(),
    }),
  },
  {
    pattern: /(?:find|search|do i have|where'?s?)\s+(.+)/i,
    intent: AIIntentType.SEARCH_BOOKS,
    extractParams: (match) => ({
      query: match[1]?.trim(),
    }),
  },

  // Add book patterns
  {
    pattern: /(?:add|new)\s+book:?\s*(.+?)(?:\s+by\s+(.+))?$/i,
    intent: AIIntentType.ADD_BOOK,
    extractParams: (match) => ({
      bookTitle: match[1]?.trim(),
      author: match[2]?.trim() || undefined,
    }),
  },

  // Stats patterns
  {
    pattern: /(?:how many|count|total)\s+(?:books?|pages?)\s*(?:this\s+)?(?:year|month|week)?/i,
    intent: AIIntentType.GET_STATS,
    extractParams: (_, message) => {
      const lowerMsg = message.toLowerCase();
      let statType: AIIntentParameters['statType'] = 'yearly_count';
      if (lowerMsg.includes('month')) statType = 'monthly_count';
      if (lowerMsg.includes('page')) statType = 'total_pages';
      return { statType };
    },
  },
  {
    pattern: /(?:what(?:'?s| am| is)\s*(?:i\s+)?(?:reading|currently))/i,
    intent: AIIntentType.GET_STATS,
    extractParams: () => ({
      statType: 'current_reading' as const,
    }),
  },
  {
    pattern: /(?:my\s+)?(?:reading\s+)?stats?(?:istics)?/i,
    intent: AIIntentType.GET_STATS,
    extractParams: () => ({}),
  },

  // Recommendation patterns
  {
    pattern: /(?:recommend|suggest|what (?:should|can|do) i read(?: next)?|read next|next book|what to read)\s*(?:a\s+)?(.+)?/i,
    intent: AIIntentType.GET_RECOMMENDATIONS,
    extractParams: (match) => {
      const text = match[1]?.trim().toLowerCase() || '';
      const genre = extractGenre(text);
      return { genre };
    },
  },

  // Rate book patterns
  {
    pattern: /(?:rate|rating)\s+(.+?)\s+(\d(?:\.\d)?)\s*(?:stars?|\/5)?/i,
    intent: AIIntentType.RATE_BOOK,
    extractParams: (match) => ({
      bookTitle: match[1]?.trim(),
      rating: Math.min(5, Math.max(1, parseFloat(match[2]))),
    }),
  },

  // List books patterns
  {
    pattern: /(?:list|show|my)\s+(?:all\s+)?(?:books?|library|collection)/i,
    intent: AIIntentType.LIST_BOOKS,
    extractParams: () => ({}),
  },

  // Reminder patterns
  {
    pattern: /(?:remind|reminder|set reminder)\s*(?:me\s+)?(?:to read)?\s*(?:at\s+)?(.+)?/i,
    intent: AIIntentType.SET_REMINDER,
    extractParams: (match) => {
      const text = match[1]?.toLowerCase() || '';
      let reminderType: AIIntentParameters['reminderType'] = 'daily';
      if (text.includes('week')) reminderType = 'weekly';
      return { reminderType, reminderTime: match[1]?.trim() };
    },
  },
];

/**
 * Attempt fallback classification using regex patterns
 */
function fallbackClassify(message: string): ParsedIntent | null {
  const normalizedMessage = message.trim();

  for (const { pattern, intent, extractParams } of FALLBACK_PATTERNS) {
    const match = normalizedMessage.match(pattern);
    if (match) {
      return {
        intent,
        confidence: 0.6, // Lower confidence for regex-based classification
        parameters: extractParams(match, normalizedMessage),
        rawMessage: message,
      };
    }
  }

  // For short messages (1-3 words) that didn't match any pattern, treat as search
  const wordCount = normalizedMessage.split(/\s+/).length;
  if (wordCount <= 3 && normalizedMessage.length >= 2) {
    return {
      intent: AIIntentType.SEARCH_BOOKS,
      confidence: 0.5,
      parameters: { query: normalizedMessage },
      rawMessage: message,
    };
  }

  return null;
}

/**
 * Parse the AI response into a classification result
 */
function parseAIResponse(responseText: string): {
  intent: AIIntentType;
  confidence: number;
  parameters: AIIntentParameters;
  reasoning?: string;
} {
  try {
    // Clean the response - remove any markdown code blocks if present
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/```(?:json)?\n?/g, '').trim();
    }

    const parsed = JSON.parse(cleanedResponse);

    // Validate required fields
    if (!parsed.intent || typeof parsed.confidence !== 'number') {
      throw new Error('Missing required fields in response');
    }

    // Map AI intent strings to enum values (existing + new intents)
    const intentMap: Record<string, AIIntentType> = {
      // Existing intents
      'SEARCH_BOOKS': AIIntentType.SEARCH_BOOKS,
      'UPDATE_PROGRESS': AIIntentType.UPDATE_PROGRESS,
      'GET_RECOMMENDATIONS': AIIntentType.GET_RECOMMENDATIONS,
      'ADD_BOOK': AIIntentType.ADD_BOOK,
      'GET_STATS': AIIntentType.GET_STATS,
      'SET_REMINDER': AIIntentType.SET_REMINDER,
      'RATE_BOOK': AIIntentType.RATE_BOOK,
      'LIST_BOOKS': AIIntentType.LIST_BOOKS,
      'START_BOOK': AIIntentType.START_BOOK,
      'FINISH_BOOK': AIIntentType.FINISH_BOOK,
      'HELP': AIIntentType.HELP,
      'UNKNOWN': AIIntentType.UNKNOWN,
      // New intents
      'BOOK_DETAILS': AIIntentType.BOOK_DETAILS,
      'READING_STATUS': AIIntentType.READING_STATUS,
      'GENRE_STATS': AIIntentType.GENRE_STATS,
      'READING_PATTERNS': AIIntentType.READING_PATTERNS,
      'RATINGS_QUERY': AIIntentType.RATINGS_QUERY,
      'GOAL_PROGRESS': AIIntentType.GOAL_PROGRESS,
      'UNREAD_BOOKS': AIIntentType.UNREAD_BOOKS,
      'SIMILAR_BOOKS': AIIntentType.SIMILAR_BOOKS,
      'COMPARE_BOOKS': AIIntentType.COMPARE_BOOKS,
      'TIME_QUERY': AIIntentType.TIME_QUERY,
      'COMPLEX_FILTER': AIIntentType.COMPLEX_FILTER,
    };

    const intent = intentMap[parsed.intent] || AIIntentType.UNKNOWN;
    const confidence = intent === AIIntentType.UNKNOWN && !intentMap[parsed.intent]
      ? 0.3
      : Math.min(1, Math.max(0, parsed.confidence));

    // Sanitize parameters
    const parameters: AIIntentParameters = {};

    if (parsed.parameters) {
      const p = parsed.parameters;

      // Existing parameter extraction
      if (p.bookTitle && typeof p.bookTitle === 'string') {
        parameters.bookTitle = p.bookTitle.trim();
      }
      if (p.author && typeof p.author === 'string') {
        parameters.author = p.author.trim();
      }
      if (p.genre && typeof p.genre === 'string') {
        parameters.genre = p.genre.trim().toLowerCase();
      }
      if (p.pageNumber !== null && p.pageNumber !== undefined && !isNaN(Number(p.pageNumber))) {
        parameters.pageNumber = Math.max(0, Math.floor(Number(p.pageNumber)));
      }
      if (p.rating !== null && p.rating !== undefined && !isNaN(Number(p.rating))) {
        parameters.rating = Math.min(5, Math.max(1, Number(p.rating)));
      }
      if (p.query && typeof p.query === 'string') {
        parameters.query = p.query.trim();
      }
      if (p.statType && typeof p.statType === 'string') {
        parameters.statType = p.statType as AIIntentParameters['statType'];
      }
      if (p.year !== null && p.year !== undefined && !isNaN(Number(p.year))) {
        parameters.year = Math.floor(Number(p.year));
      }
      if (p.month !== null && p.month !== undefined && !isNaN(Number(p.month))) {
        parameters.month = Math.min(12, Math.max(1, Math.floor(Number(p.month))));
      }
      if (p.reminderType && typeof p.reminderType === 'string') {
        parameters.reminderType = p.reminderType as AIIntentParameters['reminderType'];
      }
      if (p.reminderTime && typeof p.reminderTime === 'string') {
        parameters.reminderTime = p.reminderTime.trim();
      }
      if (p.limit !== null && p.limit !== undefined && !isNaN(Number(p.limit))) {
        parameters.limit = Math.max(1, Math.floor(Number(p.limit)));
      }

      // New parameter extraction
      if (p.timeframe && typeof p.timeframe === 'string') {
        parameters.timeframe = p.timeframe.trim().toLowerCase() as AIIntentParameters['timeframe'];
      }
      if (p.pageLimit !== null && p.pageLimit !== undefined && !isNaN(Number(p.pageLimit))) {
        parameters.pageLimit = Math.max(1, Math.floor(Number(p.pageLimit)));
      }
      if (p.ratingThreshold !== null && p.ratingThreshold !== undefined && !isNaN(Number(p.ratingThreshold))) {
        parameters.ratingThreshold = Math.min(5, Math.max(1, Number(p.ratingThreshold)));
      }
      if (Array.isArray(p.comparisonBooks) && p.comparisonBooks.every((b: unknown) => typeof b === 'string')) {
        parameters.comparisonBooks = p.comparisonBooks.map((b: string) => b.trim());
      }
      if (p.sortBy && typeof p.sortBy === 'string') {
        const validSortBy = ['rating', 'pages', 'date', 'title', 'author'];
        if (validSortBy.includes(p.sortBy.toLowerCase())) {
          parameters.sortBy = p.sortBy.toLowerCase() as AIIntentParameters['sortBy'];
        }
      }
      if (p.readingStatus && typeof p.readingStatus === 'string') {
        const validStatus = ['reading', 'unread', 'finished', 'dnf', 'all'];
        if (validStatus.includes(p.readingStatus.toLowerCase())) {
          parameters.readingStatus = p.readingStatus.toLowerCase() as AIIntentParameters['readingStatus'];
        }
      }
      if (p.comparisonType && typeof p.comparisonType === 'string') {
        const validTypes = ['pages', 'rating', 'date_read'];
        if (validTypes.includes(p.comparisonType.toLowerCase())) {
          parameters.comparisonType = p.comparisonType.toLowerCase() as AIIntentParameters['comparisonType'];
        }
      }
      if (p.minRating !== null && p.minRating !== undefined && !isNaN(Number(p.minRating))) {
        parameters.minRating = Math.min(5, Math.max(1, Number(p.minRating)));
      }
      if (p.maxPages !== null && p.maxPages !== undefined && !isNaN(Number(p.maxPages))) {
        parameters.maxPages = Math.max(1, Math.floor(Number(p.maxPages)));
      }
      if (p.minPages !== null && p.minPages !== undefined && !isNaN(Number(p.minPages))) {
        parameters.minPages = Math.max(1, Math.floor(Number(p.minPages)));
      }
    }

    return {
      intent,
      confidence,
      parameters,
      reasoning: parsed.reasoning,
    };
  } catch (error) {
    console.error('Failed to parse AI response:', error, responseText);
    throw new Error('Failed to parse AI classification response');
  }
}

/**
 * Build context-aware prompt for classification
 */
function buildContextualPrompt(
  message: string,
  context?: AIConversationContext
): string {
  let prompt = `User message: "${message}"`;

  if (context?.previousIntent && context?.awaitingResponse) {
    prompt += `\n\nContext: Previous intent was ${context.previousIntent}`;
    if (context.previousParameters) {
      prompt += ` with parameters: ${JSON.stringify(context.previousParameters)}`;
    }
    prompt += '. The user may be providing additional information for that request.';
  }

  return prompt;
}

/**
 * Determine if more information is needed based on intent and parameters
 */
function checkNeedsMoreInfo(
  intent: AIIntentType,
  parameters: AIIntentParameters
): { needsMoreInfo: boolean; followUpQuestion?: string } {
  switch (intent) {
    case AIIntentType.UPDATE_PROGRESS:
      if (!parameters.bookTitle) {
        return {
          needsMoreInfo: true,
          followUpQuestion: 'Which book are you reading?',
        };
      }
      if (parameters.pageNumber === undefined && parameters.percentComplete === undefined) {
        return {
          needsMoreInfo: true,
          followUpQuestion: `What page are you on in "${parameters.bookTitle}"?`,
        };
      }
      break;

    case AIIntentType.ADD_BOOK:
      if (!parameters.bookTitle) {
        return {
          needsMoreInfo: true,
          followUpQuestion: 'What is the title of the book you want to add?',
        };
      }
      break;

    case AIIntentType.RATE_BOOK:
      if (!parameters.bookTitle) {
        return {
          needsMoreInfo: true,
          followUpQuestion: 'Which book would you like to rate?',
        };
      }
      if (parameters.rating === undefined) {
        return {
          needsMoreInfo: true,
          followUpQuestion: `What rating (1-5) would you give "${parameters.bookTitle}"?`,
        };
      }
      break;

    case AIIntentType.SEARCH_BOOKS:
      if (!parameters.query && !parameters.author && !parameters.bookTitle && !parameters.genre) {
        return {
          needsMoreInfo: true,
          followUpQuestion: 'What would you like to search for? (title, author, or genre)',
        };
      }
      break;

    case AIIntentType.START_BOOK:
    case AIIntentType.FINISH_BOOK:
      if (!parameters.bookTitle) {
        return {
          needsMoreInfo: true,
          followUpQuestion: 'Which book?',
        };
      }
      break;

    // New intent checks
    case AIIntentType.BOOK_DETAILS:
      if (!parameters.bookTitle) {
        return {
          needsMoreInfo: true,
          followUpQuestion: 'Which book would you like details about?',
        };
      }
      break;

    case AIIntentType.SIMILAR_BOOKS:
      if (!parameters.bookTitle && !parameters.author) {
        return {
          needsMoreInfo: true,
          followUpQuestion: 'Which book or author would you like to find similar books for?',
        };
      }
      break;

    case AIIntentType.COMPARE_BOOKS:
      if (!parameters.comparisonBooks || parameters.comparisonBooks.length < 2) {
        return {
          needsMoreInfo: true,
          followUpQuestion: 'Which two books would you like to compare?',
        };
      }
      break;

    case AIIntentType.TIME_QUERY:
      if (!parameters.timeframe && !parameters.year && !parameters.month) {
        return {
          needsMoreInfo: true,
          followUpQuestion: 'What time period would you like to see? (e.g., "last month", "2023", "this year")',
        };
      }
      break;

    // These intents generally don't need additional info
    case AIIntentType.READING_STATUS:
    case AIIntentType.GENRE_STATS:
    case AIIntentType.READING_PATTERNS:
    case AIIntentType.RATINGS_QUERY:
    case AIIntentType.GOAL_PROGRESS:
    case AIIntentType.UNREAD_BOOKS:
    case AIIntentType.COMPLEX_FILTER:
      // These intents can work with defaults or extract from context
      break;
  }

  return { needsMoreInfo: false };
}

/**
 * Main function to classify user intent from SMS message using AI
 */
export async function classifyIntentWithAI(
  message: string,
  context?: AIConversationContext
): Promise<ParsedIntent> {
  const trimmedMessage = message.trim();

  // Handle empty messages
  if (!trimmedMessage) {
    return {
      intent: AIIntentType.UNKNOWN,
      confidence: 0,
      parameters: {},
      rawMessage: message,
      needsMoreInfo: true,
      followUpQuestion: 'How can I help you with your bookshelf today?',
    };
  }

  // Try AI classification first if available
  if (isServiceAvailable()) {
    try {
      const prompt = buildContextualPrompt(trimmedMessage, context);
      const response = await createCompletionWithRetry(
        prompt,
        INTENT_CLASSIFICATION_SYSTEM_PROMPT,
        { maxTokens: 500, temperature: 0.1 }
      );

      const classification = parseAIResponse(response);
      const { needsMoreInfo, followUpQuestion } = checkNeedsMoreInfo(
        classification.intent,
        classification.parameters
      );

      return {
        intent: classification.intent,
        confidence: classification.confidence,
        parameters: classification.parameters,
        rawMessage: message,
        needsMoreInfo,
        followUpQuestion,
      };
    } catch (error) {
      console.error('AI classification failed, falling back to regex:', error);
      // Fall through to fallback classification
    }
  }

  // Use fallback regex-based classification
  const fallbackResult = fallbackClassify(trimmedMessage);

  if (fallbackResult) {
    const { needsMoreInfo, followUpQuestion } = checkNeedsMoreInfo(
      fallbackResult.intent,
      fallbackResult.parameters
    );

    return {
      ...fallbackResult,
      needsMoreInfo,
      followUpQuestion,
    };
  }

  // No match found
  return {
    intent: AIIntentType.UNKNOWN,
    confidence: 0.2,
    parameters: {},
    rawMessage: message,
    needsMoreInfo: true,
    followUpQuestion:
      'I didn\'t quite understand that. You can ask me to search books, update reading progress, get stats, or say "help" for more options.',
  };
}

/**
 * Batch classify multiple messages using AI
 */
export async function classifyIntentsWithAI(
  messages: string[],
  context?: AIConversationContext
): Promise<ParsedIntent[]> {
  return Promise.all(messages.map((msg) => classifyIntentWithAI(msg, context)));
}

/**
 * Quick intent check without full AI classification
 * Useful for routing decisions - always uses regex patterns
 * Note: Order matters! More specific patterns must come before more general ones.
 */
export function quickIntentCheck(message: string): AIIntentType {
  const lower = message.toLowerCase().trim();

  // Help - only exact matches to avoid false positives
  if (/^(help|commands|\?)$/i.test(lower)) return AIIntentType.HELP;

  // New comprehensive query intents (more specific, check first)
  // COMPLEX_FILTER - multiple criteria
  if (/unread.*under\s*\d+\s*pages?|under\s*\d+\s*pages?.*unread/i.test(lower)) return AIIntentType.COMPLEX_FILTER;
  if (/over\s*\d+\s*pages?/i.test(lower)) return AIIntentType.COMPLEX_FILTER;
  if (/(fantasy|sci-?fi|mystery|romance|thriller|horror).*\d\+\s*stars?/i.test(lower)) return AIIntentType.COMPLEX_FILTER;
  if (/\d\+\s*stars?.*(fantasy|sci-?fi|mystery|romance|thriller|horror)/i.test(lower)) return AIIntentType.COMPLEX_FILTER;

  // TIME_QUERY - time-based queries
  if (/(?:what|which).*(?:read|finish).*(?:last|this)\s*(?:week|month|year)/i.test(lower)) return AIIntentType.TIME_QUERY;
  if (/(?:last|this)\s*(?:week|month|year)(?:'?s)?\s*(?:reading|books?)/i.test(lower)) return AIIntentType.TIME_QUERY;
  if (/books?\s*(?:finished|completed|read)\s*(?:in\s*)?\s*20\d{2}/i.test(lower)) return AIIntentType.TIME_QUERY;
  if (/in\s*20\d{2}/i.test(lower)) return AIIntentType.TIME_QUERY;

  // COMPARE_BOOKS - comparison queries
  if (/which\s+is\s+(?:longer|shorter|better|higher\s*rated)/i.test(lower)) return AIIntentType.COMPARE_BOOKS;
  if (/compare\s+/i.test(lower)) return AIIntentType.COMPARE_BOOKS;
  if (/\bvs\.?\b/i.test(lower)) return AIIntentType.COMPARE_BOOKS;

  // SIMILAR_BOOKS - similarity queries (before SEARCH_BOOKS to avoid "find" capturing)
  if (/books?\s+like\s+/i.test(lower)) return AIIntentType.SIMILAR_BOOKS;
  if (/similar\s+to\s+/i.test(lower)) return AIIntentType.SIMILAR_BOOKS;
  if (/other\s+books?\s+by/i.test(lower)) return AIIntentType.SIMILAR_BOOKS;

  // BOOK_DETAILS - specific book info queries
  if (/tell\s+me\s+about\s+/i.test(lower)) return AIIntentType.BOOK_DETAILS;
  if (/how\s+many\s+pages\s+(?:is|does|in|has)/i.test(lower)) return AIIntentType.BOOK_DETAILS;
  if (/who\s+wrote\s+/i.test(lower)) return AIIntentType.BOOK_DETAILS;
  if (/author\s+of\s+/i.test(lower)) return AIIntentType.BOOK_DETAILS;
  if (/info(?:rmation)?\s+(?:on|about)\s+/i.test(lower)) return AIIntentType.BOOK_DETAILS;

  // READING_STATUS - current reading status queries
  if (/what\s+(?:books?\s+)?am\s+i\s+(?:currently\s+)?reading/i.test(lower)) return AIIntentType.READING_STATUS;
  if (/(?:which|what)\s+books?\s+haven'?t\s+i\s+started/i.test(lower)) return AIIntentType.READING_STATUS;
  if (/in[- ]?progress\s+books?/i.test(lower)) return AIIntentType.READING_STATUS;
  if (/currently\s+reading/i.test(lower)) return AIIntentType.READING_STATUS;

  // GENRE_STATS - genre-related statistics
  if (/(?:what(?:'s| is))?\s*my\s*(?:favorite|most\s+read|top)\s+genre/i.test(lower)) return AIIntentType.GENRE_STATS;
  if (/how\s+many\s+(?:fantasy|sci-?fi|mystery|romance|thriller|horror|non-?fiction)\s+books?/i.test(lower)) return AIIntentType.GENRE_STATS;
  if (/genre\s+(?:breakdown|stats?|statistics)/i.test(lower)) return AIIntentType.GENRE_STATS;

  // READING_PATTERNS - reading habit insights
  if (/(?:what(?:'s| is))?\s*(?:my\s+)?reading\s+streak/i.test(lower)) return AIIntentType.READING_PATTERNS;
  if (/(?:average|avg)\s+pages?\s+per\s+day/i.test(lower)) return AIIntentType.READING_PATTERNS;
  if (/reading\s+(?:pace|habits?|patterns?)/i.test(lower)) return AIIntentType.READING_PATTERNS;
  if (/pages?\s+per\s+day/i.test(lower)) return AIIntentType.READING_PATTERNS;

  // RATINGS_QUERY - rating-related queries
  if (/(?:what(?:'s| is))?\s*(?:my\s+)?(?:highest|best|top)\s+rated/i.test(lower)) return AIIntentType.RATINGS_QUERY;
  if (/\d[- ]?star\s+books?/i.test(lower)) return AIIntentType.RATINGS_QUERY;
  if (/books?\s+rated\s+\d/i.test(lower)) return AIIntentType.RATINGS_QUERY;

  // GOAL_PROGRESS - reading goal queries
  if (/(?:am\s+i\s+)?on\s+track\s+(?:for|with)?\s*(?:my\s+)?(?:reading\s+)?goal/i.test(lower)) return AIIntentType.GOAL_PROGRESS;
  if (/(?:how\s+many|how\s+far)\s+books?\s+(?:behind|ahead)/i.test(lower)) return AIIntentType.GOAL_PROGRESS;
  if (/goal\s+(?:progress|status)/i.test(lower)) return AIIntentType.GOAL_PROGRESS;
  if (/books?\s+(?:behind|ahead)/i.test(lower)) return AIIntentType.GOAL_PROGRESS;

  // UNREAD_BOOKS - unread/TBR queries
  if (/what\s+should\s+i\s+read\s+next/i.test(lower)) return AIIntentType.UNREAD_BOOKS;
  if (/(?:show|list|my)\s+(?:unread|tbr)/i.test(lower)) return AIIntentType.UNREAD_BOOKS;
  if (/to[- ]?be[- ]?read/i.test(lower)) return AIIntentType.UNREAD_BOOKS;
  if (/\bunread\b/i.test(lower)) return AIIntentType.UNREAD_BOOKS;
  if (/\btbr\b/i.test(lower)) return AIIntentType.UNREAD_BOOKS;

  // Existing intents (more general patterns)
  if (/page\s*\d|pg\s*\d/i.test(lower)) return AIIntentType.UPDATE_PROGRESS;
  if (/finished|done\s+reading/i.test(lower)) return AIIntentType.UPDATE_PROGRESS;
  if (/add\s+book|new\s+book/i.test(lower)) return AIIntentType.ADD_BOOK;
  if (/recommend|suggest/i.test(lower)) return AIIntentType.GET_RECOMMENDATIONS;
  if (/how\s+many\s+(?:books?|pages?)/i.test(lower)) return AIIntentType.GET_STATS;
  if (/\bstats?\b|statistics/i.test(lower)) return AIIntentType.GET_STATS;
  if (/\bcount\b.*books?|books?\s*count/i.test(lower)) return AIIntentType.GET_STATS;
  if (/find\s+|search\s+|do\s+i\s+have|books?\s+by\s+/i.test(lower)) return AIIntentType.SEARCH_BOOKS;
  if (/\brate\b|\brating\b/i.test(lower)) return AIIntentType.RATE_BOOK;
  if (/list\s+(?:all\s+)?(?:my\s+)?books?|show\s+(?:all\s+)?(?:my\s+)?books?|my\s+books/i.test(lower)) return AIIntentType.LIST_BOOKS;
  if (/remind|reminder/i.test(lower)) return AIIntentType.SET_REMINDER;
  if (/start(?:ed|ing)?\s+(?:reading\s+)?/i.test(lower)) return AIIntentType.START_BOOK;
  if (/begin|began/i.test(lower)) return AIIntentType.START_BOOK;
  if (/finish(?:ed)?\s+|done\s+|complete(?:d)?/i.test(lower)) return AIIntentType.FINISH_BOOK;

  // Single words or short phrases that don't match patterns - treat as search
  const wordCount = lower.trim().split(/\s+/).length;
  if (wordCount <= 3 && lower.length >= 2) {
    // Could be a topic, genre, or author search
    return AIIntentType.SEARCH_BOOKS;
  }

  return AIIntentType.UNKNOWN;
}

/**
 * Check if AI classification is available and recommended
 */
export function shouldUseAI(message: string): boolean {
  // Use AI for complex or ambiguous messages
  const wordCount = message.trim().split(/\s+/).length;

  // Simple messages (1-3 words) can often be handled by regex
  if (wordCount <= 3) {
    const quickCheck = quickIntentCheck(message);
    // If regex can confidently classify, skip AI
    if (quickCheck !== AIIntentType.UNKNOWN) {
      return false;
    }
  }

  // Use AI for longer/complex messages when available
  return isServiceAvailable();
}

export { AIIntentType };
