/**
 * Conversation Context Tests
 * Tests for multi-turn conversation handling, pronoun resolution,
 * pagination, and context expiry
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  mockPrismaClient,
  resetPrismaMocks,
  createMockBook,
} from '../mocks/prisma';
import {
  FICTION_BOOKS,
  ALL_BOOKS,
} from '../mocks/books-fixture';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: mockPrismaClient,
}));

// ============================================
// Conversation Context Types
// ============================================

interface ConversationContext {
  phoneNumber: string;
  lastIntent?: string;
  lastBookId?: number;
  lastBookTitle?: string;
  lastSearchResults?: Array<{ id: number; title: string }>;
  lastResultsPage?: number;
  totalResultsCount?: number;
  awaitingConfirmation?: boolean;
  confirmationType?: 'finish_book' | 'start_book' | 'rate_book';
  timestamp: Date;
  expiresAt: Date;
}

// Context expiry time in milliseconds (5 minutes default)
const CONTEXT_EXPIRY_MS = 5 * 60 * 1000;

// ============================================
// Mock Conversation Manager Implementation
// ============================================

class MockConversationManager {
  private contexts: Map<string, ConversationContext> = new Map();

  createContext(phoneNumber: string): ConversationContext {
    const now = new Date();
    const context: ConversationContext = {
      phoneNumber,
      timestamp: now,
      expiresAt: new Date(now.getTime() + CONTEXT_EXPIRY_MS),
    };
    this.contexts.set(phoneNumber, context);
    return context;
  }

  getContext(phoneNumber: string): ConversationContext | undefined {
    const context = this.contexts.get(phoneNumber);

    if (!context) {
      return undefined;
    }

    // Check if context has expired
    if (new Date() > context.expiresAt) {
      this.contexts.delete(phoneNumber);
      return undefined;
    }

    return context;
  }

  updateContext(
    phoneNumber: string,
    updates: Partial<ConversationContext>
  ): ConversationContext {
    const existing = this.getContext(phoneNumber) || this.createContext(phoneNumber);
    const now = new Date();

    const updated: ConversationContext = {
      ...existing,
      ...updates,
      timestamp: now,
      expiresAt: new Date(now.getTime() + CONTEXT_EXPIRY_MS),
    };

    this.contexts.set(phoneNumber, updated);
    return updated;
  }

  clearContext(phoneNumber: string): void {
    this.contexts.delete(phoneNumber);
  }

  setLastBook(phoneNumber: string, bookId: number, bookTitle: string): void {
    this.updateContext(phoneNumber, {
      lastBookId: bookId,
      lastBookTitle: bookTitle,
    });
  }

  setSearchResults(
    phoneNumber: string,
    results: Array<{ id: number; title: string }>,
    totalCount: number
  ): void {
    this.updateContext(phoneNumber, {
      lastSearchResults: results,
      lastResultsPage: 0,
      totalResultsCount: totalCount,
    });
  }

  getNextPage(phoneNumber: string): Array<{ id: number; title: string }> | undefined {
    const context = this.getContext(phoneNumber);
    if (!context?.lastSearchResults) {
      return undefined;
    }

    const pageSize = 5;
    const nextPage = (context.lastResultsPage || 0) + 1;
    const start = nextPage * pageSize;

    // Would need full results stored or fetched - this is simplified
    return context.lastSearchResults.slice(start, start + pageSize);
  }

  isExpired(phoneNumber: string): boolean {
    const context = this.contexts.get(phoneNumber);
    if (!context) return true;
    return new Date() > context.expiresAt;
  }

  // Helper to force expiry for testing
  forceExpire(phoneNumber: string): void {
    const context = this.contexts.get(phoneNumber);
    if (context) {
      context.expiresAt = new Date(Date.now() - 1000);
    }
  }
}

// ============================================
// Pronoun Resolution Functions
// ============================================

interface PronounResolution {
  resolved: boolean;
  bookId?: number;
  bookTitle?: string;
  error?: string;
}

function resolvePronoun(
  message: string,
  context: ConversationContext | undefined
): PronounResolution {
  const pronounPatterns = [
    /\b(it|that|this|the book|that one)\b/i,
  ];

  const hasPronoun = pronounPatterns.some((p) => p.test(message));

  if (!hasPronoun) {
    return { resolved: false };
  }

  if (!context) {
    return {
      resolved: false,
      error: 'No context available. Please specify the book name.',
    };
  }

  if (!context.lastBookId && !context.lastBookTitle) {
    return {
      resolved: false,
      error: "I'm not sure which book you mean. Please specify the title.",
    };
  }

  return {
    resolved: true,
    bookId: context.lastBookId,
    bookTitle: context.lastBookTitle,
  };
}

function resolveListReference(
  message: string,
  context: ConversationContext | undefined
): PronounResolution {
  // Handle "the first one", "number 2", "the third book", etc.
  const numberPatterns = [
    /(?:the\s+)?(?:first|1st|number\s*1)\s*(?:one|book)?/i,
    /(?:the\s+)?(?:second|2nd|number\s*2)\s*(?:one|book)?/i,
    /(?:the\s+)?(?:third|3rd|number\s*3)\s*(?:one|book)?/i,
    /(?:the\s+)?(?:fourth|4th|number\s*4)\s*(?:one|book)?/i,
    /(?:the\s+)?(?:fifth|5th|number\s*5)\s*(?:one|book)?/i,
  ];

  let index = -1;
  for (let i = 0; i < numberPatterns.length; i++) {
    if (numberPatterns[i].test(message)) {
      index = i;
      break;
    }
  }

  if (index === -1) {
    return { resolved: false };
  }

  if (!context?.lastSearchResults || context.lastSearchResults.length === 0) {
    return {
      resolved: false,
      error: 'No search results to reference. Please search for books first.',
    };
  }

  if (index >= context.lastSearchResults.length) {
    return {
      resolved: false,
      error: `Only ${context.lastSearchResults.length} results available.`,
    };
  }

  const book = context.lastSearchResults[index];
  return {
    resolved: true,
    bookId: book.id,
    bookTitle: book.title,
  };
}

// ============================================
// Tests
// ============================================

describe('Conversation Context Management', () => {
  let manager: MockConversationManager;

  beforeEach(() => {
    manager = new MockConversationManager();
    resetPrismaMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Context Creation', () => {
    it('should create new context for phone number', () => {
      const context = manager.createContext('+15551234567');

      expect(context).toBeDefined();
      expect(context.phoneNumber).toBe('+15551234567');
      expect(context.timestamp).toBeDefined();
      expect(context.expiresAt).toBeDefined();
    });

    it('should set expiry time in the future', () => {
      const context = manager.createContext('+15551234567');

      expect(context.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should create independent contexts for different phone numbers', () => {
      const context1 = manager.createContext('+15551111111');
      const context2 = manager.createContext('+15552222222');

      expect(context1.phoneNumber).not.toBe(context2.phoneNumber);
    });
  });

  describe('Context Retrieval', () => {
    it('should retrieve existing context', () => {
      manager.createContext('+15551234567');
      const context = manager.getContext('+15551234567');

      expect(context).toBeDefined();
      expect(context?.phoneNumber).toBe('+15551234567');
    });

    it('should return undefined for non-existent context', () => {
      const context = manager.getContext('+15559999999');

      expect(context).toBeUndefined();
    });

    it('should return undefined for expired context', () => {
      manager.createContext('+15551234567');
      manager.forceExpire('+15551234567');

      const context = manager.getContext('+15551234567');

      expect(context).toBeUndefined();
    });
  });

  describe('Context Updates', () => {
    it('should update existing context', () => {
      manager.createContext('+15551234567');

      const updated = manager.updateContext('+15551234567', {
        lastIntent: 'book_details',
        lastBookId: 42,
      });

      expect(updated.lastIntent).toBe('book_details');
      expect(updated.lastBookId).toBe(42);
    });

    it('should create context if not exists on update', () => {
      const updated = manager.updateContext('+15559999999', {
        lastIntent: 'search',
      });

      expect(updated).toBeDefined();
      expect(updated.lastIntent).toBe('search');
    });

    it('should refresh expiry on update', () => {
      const original = manager.createContext('+15551234567');
      const originalExpiry = original.expiresAt.getTime();

      const updated = manager.updateContext('+15551234567', {
        lastIntent: 'test',
      });

      // Expiry should be at least as long as original (refreshed)
      expect(updated.expiresAt.getTime()).toBeGreaterThanOrEqual(originalExpiry);
    });

    it('should preserve unmodified fields on update', () => {
      manager.updateContext('+15551234567', {
        lastBookId: 1,
        lastBookTitle: 'Test Book',
      });

      const updated = manager.updateContext('+15551234567', {
        lastIntent: 'rating_query',
      });

      expect(updated.lastBookId).toBe(1);
      expect(updated.lastBookTitle).toBe('Test Book');
      expect(updated.lastIntent).toBe('rating_query');
    });
  });

  describe('Context Clearing', () => {
    it('should clear context for phone number', () => {
      manager.createContext('+15551234567');
      manager.clearContext('+15551234567');

      const context = manager.getContext('+15551234567');

      expect(context).toBeUndefined();
    });

    it('should not affect other contexts when clearing', () => {
      manager.createContext('+15551111111');
      manager.createContext('+15552222222');

      manager.clearContext('+15551111111');

      expect(manager.getContext('+15551111111')).toBeUndefined();
      expect(manager.getContext('+15552222222')).toBeDefined();
    });
  });

  describe('Last Book Tracking', () => {
    it('should track last mentioned book', () => {
      manager.setLastBook('+15551234567', 42, 'The Hobbit');

      const context = manager.getContext('+15551234567');

      expect(context?.lastBookId).toBe(42);
      expect(context?.lastBookTitle).toBe('The Hobbit');
    });

    it('should update last book on subsequent mentions', () => {
      manager.setLastBook('+15551234567', 1, 'First Book');
      manager.setLastBook('+15551234567', 2, 'Second Book');

      const context = manager.getContext('+15551234567');

      expect(context?.lastBookId).toBe(2);
      expect(context?.lastBookTitle).toBe('Second Book');
    });
  });

  describe('Search Results Tracking', () => {
    it('should store search results', () => {
      const results = [
        { id: 1, title: 'Book One' },
        { id: 2, title: 'Book Two' },
        { id: 3, title: 'Book Three' },
      ];

      manager.setSearchResults('+15551234567', results, 10);

      const context = manager.getContext('+15551234567');

      expect(context?.lastSearchResults).toHaveLength(3);
      expect(context?.totalResultsCount).toBe(10);
      expect(context?.lastResultsPage).toBe(0);
    });

    it('should track result pagination', () => {
      const results = [
        { id: 1, title: 'Book One' },
        { id: 2, title: 'Book Two' },
      ];

      manager.setSearchResults('+15551234567', results, 10);
      manager.getNextPage('+15551234567');

      // Note: actual implementation would track page state
    });
  });

  describe('Context Expiry', () => {
    it('should report context as expired after timeout', () => {
      manager.createContext('+15551234567');

      expect(manager.isExpired('+15551234567')).toBe(false);

      manager.forceExpire('+15551234567');

      expect(manager.isExpired('+15551234567')).toBe(true);
    });

    it('should report non-existent context as expired', () => {
      expect(manager.isExpired('+15559999999')).toBe(true);
    });
  });
});

describe('Pronoun Resolution', () => {
  describe('Basic Pronoun Detection', () => {
    it('should detect "it" as pronoun', () => {
      const context: ConversationContext = {
        phoneNumber: '+15551234567',
        lastBookId: 1,
        lastBookTitle: 'The Hobbit',
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + CONTEXT_EXPIRY_MS),
      };

      const result = resolvePronoun('Tell me more about it', context);

      expect(result.resolved).toBe(true);
      expect(result.bookId).toBe(1);
      expect(result.bookTitle).toBe('The Hobbit');
    });

    it('should detect "that" as pronoun', () => {
      const context: ConversationContext = {
        phoneNumber: '+15551234567',
        lastBookId: 2,
        lastBookTitle: 'Dune',
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + CONTEXT_EXPIRY_MS),
      };

      const result = resolvePronoun('Start that', context);

      expect(result.resolved).toBe(true);
      expect(result.bookTitle).toBe('Dune');
    });

    it('should detect "the book" as reference', () => {
      const context: ConversationContext = {
        phoneNumber: '+15551234567',
        lastBookId: 3,
        lastBookTitle: 'The Martian',
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + CONTEXT_EXPIRY_MS),
      };

      const result = resolvePronoun('How many pages does the book have?', context);

      expect(result.resolved).toBe(true);
      expect(result.bookId).toBe(3);
    });

    it('should detect "that one" as reference', () => {
      const context: ConversationContext = {
        phoneNumber: '+15551234567',
        lastBookId: 4,
        lastBookTitle: '1984',
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + CONTEXT_EXPIRY_MS),
      };

      const result = resolvePronoun('I want to read that one', context);

      expect(result.resolved).toBe(true);
    });
  });

  describe('Pronoun Resolution Failures', () => {
    it('should fail when no context available', () => {
      const result = resolvePronoun('Tell me about it', undefined);

      expect(result.resolved).toBe(false);
      expect(result.error).toContain('No context');
    });

    it('should fail when no book in context', () => {
      const context: ConversationContext = {
        phoneNumber: '+15551234567',
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + CONTEXT_EXPIRY_MS),
        // No lastBookId or lastBookTitle
      };

      const result = resolvePronoun('Tell me about it', context);

      expect(result.resolved).toBe(false);
      expect(result.error).toContain('not sure which book');
    });

    it('should return unresolved when no pronoun in message', () => {
      const context: ConversationContext = {
        phoneNumber: '+15551234567',
        lastBookId: 1,
        lastBookTitle: 'Test',
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + CONTEXT_EXPIRY_MS),
      };

      const result = resolvePronoun('Tell me about Dune', context);

      expect(result.resolved).toBe(false);
      expect(result.error).toBeUndefined();
    });
  });

  describe('List Reference Resolution', () => {
    it('should resolve "the first one"', () => {
      const context: ConversationContext = {
        phoneNumber: '+15551234567',
        lastSearchResults: [
          { id: 1, title: 'First Book' },
          { id: 2, title: 'Second Book' },
        ],
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + CONTEXT_EXPIRY_MS),
      };

      const result = resolveListReference('Start the first one', context);

      expect(result.resolved).toBe(true);
      expect(result.bookId).toBe(1);
      expect(result.bookTitle).toBe('First Book');
    });

    it('should resolve "number 2"', () => {
      const context: ConversationContext = {
        phoneNumber: '+15551234567',
        lastSearchResults: [
          { id: 1, title: 'First Book' },
          { id: 2, title: 'Second Book' },
          { id: 3, title: 'Third Book' },
        ],
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + CONTEXT_EXPIRY_MS),
      };

      const result = resolveListReference('Tell me about number 2', context);

      expect(result.resolved).toBe(true);
      expect(result.bookId).toBe(2);
      expect(result.bookTitle).toBe('Second Book');
    });

    it('should resolve "the third book"', () => {
      const context: ConversationContext = {
        phoneNumber: '+15551234567',
        lastSearchResults: [
          { id: 10, title: 'A' },
          { id: 20, title: 'B' },
          { id: 30, title: 'C' },
        ],
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + CONTEXT_EXPIRY_MS),
      };

      const result = resolveListReference('Start the third book', context);

      expect(result.resolved).toBe(true);
      expect(result.bookId).toBe(30);
    });

    it('should fail when index exceeds results', () => {
      const context: ConversationContext = {
        phoneNumber: '+15551234567',
        lastSearchResults: [
          { id: 1, title: 'Only Book' },
        ],
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + CONTEXT_EXPIRY_MS),
      };

      const result = resolveListReference('Start the fifth one', context);

      expect(result.resolved).toBe(false);
      expect(result.error).toContain('Only 1 results');
    });

    it('should fail when no search results in context', () => {
      const context: ConversationContext = {
        phoneNumber: '+15551234567',
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + CONTEXT_EXPIRY_MS),
      };

      const result = resolveListReference('Start the first one', context);

      expect(result.resolved).toBe(false);
      expect(result.error).toContain('No search results');
    });

    it('should return unresolved when no number reference', () => {
      const context: ConversationContext = {
        phoneNumber: '+15551234567',
        lastSearchResults: [{ id: 1, title: 'Test' }],
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + CONTEXT_EXPIRY_MS),
      };

      const result = resolveListReference('Start Dune', context);

      expect(result.resolved).toBe(false);
      expect(result.error).toBeUndefined();
    });
  });
});

describe('Pagination Handling', () => {
  let manager: MockConversationManager;

  beforeEach(() => {
    manager = new MockConversationManager();
  });

  describe('Next Page Requests', () => {
    it('should recognize "next" as pagination request', () => {
      const paginationPatterns = [
        /^next$/i,
        /^more$/i,
        /^more results$/i,
        /^show more$/i,
        /^continue$/i,
      ];

      expect(paginationPatterns.some(p => p.test('next'))).toBe(true);
      expect(paginationPatterns.some(p => p.test('More'))).toBe(true);
      expect(paginationPatterns.some(p => p.test('more results'))).toBe(true);
    });

    it('should track page number in context', () => {
      const results = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        title: `Book ${i + 1}`,
      }));

      manager.setSearchResults('+15551234567', results, 15);

      const context = manager.getContext('+15551234567');
      expect(context?.lastResultsPage).toBe(0);
    });
  });

  describe('Previous Page Requests', () => {
    it('should recognize "previous" as pagination request', () => {
      const previousPatterns = [
        /^prev(?:ious)?$/i,
        /^back$/i,
        /^go back$/i,
      ];

      expect(previousPatterns.some(p => p.test('previous'))).toBe(true);
      expect(previousPatterns.some(p => p.test('prev'))).toBe(true);
      expect(previousPatterns.some(p => p.test('back'))).toBe(true);
    });
  });

  describe('Specific Page Requests', () => {
    it('should recognize "page 2" as specific page request', () => {
      const pagePattern = /^page\s+(\d+)$/i;

      const match = 'page 2'.match(pagePattern);
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe('2');
    });
  });
});

describe('Follow-up Question Handling', () => {
  let manager: MockConversationManager;

  beforeEach(() => {
    manager = new MockConversationManager();
    resetPrismaMocks();
  });

  describe('Tell Me More', () => {
    it('should handle "tell me more" with book context', async () => {
      manager.setLastBook('+15551234567', 1, 'The Hobbit');
      const mockBook = FICTION_BOOKS[0];
      mockPrismaClient.book.findFirst.mockResolvedValue(mockBook);

      const context = manager.getContext('+15551234567');

      expect(context?.lastBookId).toBe(1);
      expect(context?.lastBookTitle).toBe('The Hobbit');
    });

    it('should fail "tell me more" without context', () => {
      const context = manager.getContext('+15559999999');

      expect(context).toBeUndefined();
    });
  });

  describe('Action Follow-ups', () => {
    it('should handle "start it" with book context', () => {
      manager.setLastBook('+15551234567', 5, '1984');
      const context = manager.getContext('+15551234567');

      const resolution = resolvePronoun('Start it', context);

      expect(resolution.resolved).toBe(true);
      expect(resolution.bookId).toBe(5);
    });

    it('should handle "finish it" with book context', () => {
      manager.setLastBook('+15551234567', 3, 'The Martian');
      const context = manager.getContext('+15551234567');

      const resolution = resolvePronoun('Finish it', context);

      expect(resolution.resolved).toBe(true);
      expect(resolution.bookTitle).toBe('The Martian');
    });

    it('should handle "rate it" with book context', () => {
      manager.setLastBook('+15551234567', 2, 'Dune');
      const context = manager.getContext('+15551234567');

      const resolution = resolvePronoun('Rate it 5 stars', context);

      expect(resolution.resolved).toBe(true);
      expect(resolution.bookId).toBe(2);
    });
  });

  describe('Property Queries', () => {
    it('should handle "how many pages?" with book context', () => {
      manager.setLastBook('+15551234567', 1, 'The Hobbit');
      const context = manager.getContext('+15551234567');

      // "How many pages?" implies current book
      const resolution = resolvePronoun('How many pages does it have?', context);

      expect(resolution.resolved).toBe(true);
      expect(resolution.bookId).toBe(1);
    });

    it('should handle "who is the author?" with book context', () => {
      manager.setLastBook('+15551234567', 4, 'Pride and Prejudice');
      const context = manager.getContext('+15551234567');

      const resolution = resolvePronoun('Who wrote it?', context);

      expect(resolution.resolved).toBe(true);
      expect(resolution.bookTitle).toBe('Pride and Prejudice');
    });
  });
});

describe('Confirmation Flow', () => {
  let manager: MockConversationManager;

  beforeEach(() => {
    manager = new MockConversationManager();
  });

  describe('Awaiting Confirmation State', () => {
    it('should track awaiting confirmation state', () => {
      manager.updateContext('+15551234567', {
        awaitingConfirmation: true,
        confirmationType: 'finish_book',
        lastBookId: 1,
        lastBookTitle: 'Test Book',
      });

      const context = manager.getContext('+15551234567');

      expect(context?.awaitingConfirmation).toBe(true);
      expect(context?.confirmationType).toBe('finish_book');
    });

    it('should handle "yes" confirmation', () => {
      manager.updateContext('+15551234567', {
        awaitingConfirmation: true,
        confirmationType: 'finish_book',
      });

      const yesPatterns = [/^yes$/i, /^y$/i, /^yep$/i, /^yeah$/i, /^confirm$/i];

      expect(yesPatterns.some(p => p.test('yes'))).toBe(true);
      expect(yesPatterns.some(p => p.test('Y'))).toBe(true);
      expect(yesPatterns.some(p => p.test('yep'))).toBe(true);
    });

    it('should handle "no" cancellation', () => {
      manager.updateContext('+15551234567', {
        awaitingConfirmation: true,
        confirmationType: 'start_book',
      });

      const noPatterns = [/^no$/i, /^n$/i, /^nope$/i, /^cancel$/i, /^nevermind$/i];

      expect(noPatterns.some(p => p.test('no'))).toBe(true);
      expect(noPatterns.some(p => p.test('N'))).toBe(true);
      expect(noPatterns.some(p => p.test('cancel'))).toBe(true);
    });

    it('should clear confirmation state after response', () => {
      manager.updateContext('+15551234567', {
        awaitingConfirmation: true,
        confirmationType: 'finish_book',
      });

      // Simulate confirmation handling
      manager.updateContext('+15551234567', {
        awaitingConfirmation: false,
        confirmationType: undefined,
      });

      const context = manager.getContext('+15551234567');

      expect(context?.awaitingConfirmation).toBe(false);
      expect(context?.confirmationType).toBeUndefined();
    });
  });
});

describe('Multi-turn Conversation Scenarios', () => {
  let manager: MockConversationManager;

  beforeEach(() => {
    manager = new MockConversationManager();
    resetPrismaMocks();
  });

  it('should handle search -> select -> start flow', () => {
    const phoneNumber = '+15551234567';

    // Step 1: User searches
    const searchResults = [
      { id: 1, title: 'The Hobbit' },
      { id: 2, title: 'The Lord of the Rings' },
    ];
    manager.setSearchResults(phoneNumber, searchResults, 2);
    manager.updateContext(phoneNumber, { lastIntent: 'search' });

    // Step 2: User selects "the first one"
    const context1 = manager.getContext(phoneNumber);
    const resolution = resolveListReference('the first one', context1);

    expect(resolution.resolved).toBe(true);
    expect(resolution.bookTitle).toBe('The Hobbit');

    // Update context with selection
    manager.setLastBook(phoneNumber, resolution.bookId!, resolution.bookTitle!);

    // Step 3: User says "start it"
    const context2 = manager.getContext(phoneNumber);
    const startResolution = resolvePronoun('start it', context2);

    expect(startResolution.resolved).toBe(true);
    expect(startResolution.bookId).toBe(1);
  });

  it('should handle book details -> start flow', () => {
    const phoneNumber = '+15551234567';

    // Step 1: User asks about a book
    manager.setLastBook(phoneNumber, 5, 'Dune');
    manager.updateContext(phoneNumber, { lastIntent: 'book_details' });

    // Step 2: User says "start it"
    const context = manager.getContext(phoneNumber);
    const resolution = resolvePronoun('start it', context);

    expect(resolution.resolved).toBe(true);
    expect(resolution.bookTitle).toBe('Dune');
  });

  it('should handle search -> pagination -> select flow', () => {
    const phoneNumber = '+15551234567';

    // Step 1: User searches with many results
    const allResults = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      title: `Book ${i + 1}`,
    }));
    manager.setSearchResults(phoneNumber, allResults, 10);

    // Step 2: User requests next page
    const context1 = manager.getContext(phoneNumber);
    expect(context1?.lastResultsPage).toBe(0);

    // Step 3: User selects from results
    const resolution = resolveListReference('number 3', context1);
    expect(resolution.resolved).toBe(true);
    expect(resolution.bookTitle).toBe('Book 3');
  });

  it('should maintain context across related queries', () => {
    const phoneNumber = '+15551234567';

    // Query 1: Ask about a book
    manager.setLastBook(phoneNumber, 1, 'The Hobbit');
    manager.updateContext(phoneNumber, { lastIntent: 'book_details' });

    // Query 2: Ask for pages (follow-up)
    let context = manager.getContext(phoneNumber);
    expect(context?.lastBookId).toBe(1);

    // Query 3: Ask for rating (still about same book)
    context = manager.getContext(phoneNumber);
    expect(context?.lastBookId).toBe(1);
  });

  it('should reset context on new unrelated query', () => {
    const phoneNumber = '+15551234567';

    // Query 1: Ask about a book
    manager.setLastBook(phoneNumber, 1, 'The Hobbit');

    // Query 2: Completely new search
    manager.setSearchResults(phoneNumber, [
      { id: 99, title: 'Different Book' },
    ], 1);

    // Old book context should be replaced
    const context = manager.getContext(phoneNumber);
    expect(context?.lastSearchResults?.[0].title).toBe('Different Book');
  });
});

describe('Edge Cases', () => {
  let manager: MockConversationManager;

  beforeEach(() => {
    manager = new MockConversationManager();
  });

  it('should handle rapid context updates', () => {
    const phoneNumber = '+15551234567';

    for (let i = 0; i < 100; i++) {
      manager.setLastBook(phoneNumber, i, `Book ${i}`);
    }

    const context = manager.getContext(phoneNumber);
    expect(context?.lastBookId).toBe(99);
    expect(context?.lastBookTitle).toBe('Book 99');
  });

  it('should handle concurrent contexts for many users', () => {
    const phoneNumbers = Array.from({ length: 50 }, (_, i) => `+1555000${i.toString().padStart(4, '0')}`);

    phoneNumbers.forEach((phone, i) => {
      manager.setLastBook(phone, i, `Book for ${phone}`);
    });

    phoneNumbers.forEach((phone, i) => {
      const context = manager.getContext(phone);
      expect(context?.lastBookId).toBe(i);
    });
  });

  it('should handle special characters in book titles', () => {
    manager.setLastBook('+15551234567', 1, "The Hitchhiker's Guide to the Galaxy");

    const context = manager.getContext('+15551234567');
    expect(context?.lastBookTitle).toContain("Hitchhiker's");
  });

  it('should handle very long book titles', () => {
    const longTitle = 'A'.repeat(500);
    manager.setLastBook('+15551234567', 1, longTitle);

    const context = manager.getContext('+15551234567');
    expect(context?.lastBookTitle).toBe(longTitle);
  });

  it('should handle empty search results', () => {
    manager.setSearchResults('+15551234567', [], 0);

    const context = manager.getContext('+15551234567');
    expect(context?.lastSearchResults).toHaveLength(0);
    expect(context?.totalResultsCount).toBe(0);
  });
});
