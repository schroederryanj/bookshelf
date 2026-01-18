/**
 * SMS Intent Classifier
 * Classifies user messages into intents and extracts relevant parameters
 */

import type { IntentType, ClassificationResult, IntentParameters } from './types';

// Patterns for intent recognition
const INTENT_PATTERNS: Record<IntentType, RegExp[]> = {
  update_progress: [
    /(?:i'?m?\s+)?(?:on|at)\s+page\s+(\d+)/i,
    /page\s+(\d+)/i,
    /(\d+)\s+pages?\s+(?:in|into|through)/i,
    /(?:read|reading)\s+(?:to\s+)?page\s+(\d+)/i,
    /(\d+)%\s+(?:done|complete|through)/i,
    /(?:progress|update)\s+(\d+)/i,
  ],
  start_book: [
    /(?:start(?:ing|ed)?|begin(?:ning)?|reading)\s+["']?([^"'\d]+)["']?/i,
    /(?:new\s+book|picked\s+up)\s*:?\s*["']?([^"'\d]+)["']?/i,
    /(?:starting|began|begin)\s+["']?([^"'\d]+)["']?/i,
  ],
  finish_book: [
    /^(?:finished|done|completed?)$/i,
    /(?:finish(?:ed)?|complete(?:d)?|done\s+(?:with|reading)?)\s+["']?([^"']+)["']?/i,
    /(?:just\s+)?finished\s+["']?([^"']+)["']?/i,
    /done\s+(?:with\s+)?["']?([^"']+)["']?/i,
  ],
  get_status: [
    /(?:what(?:'s|\s+is)?|where\s+am\s+i|how\s+far)\s+(?:my\s+)?(?:progress|status)/i,
    /(?:current|my)\s+(?:book|reading|progress)/i,
    /status/i,
    /where\s+(?:am\s+)?i\s+(?:in|at|with)/i,
  ],
  list_reading: [
    /(?:what(?:'s|\s+am\s+i)?|list|show)\s+(?:am\s+i\s+)?(?:reading|books?)/i,
    /(?:my\s+)?(?:current\s+)?books?/i,
    /reading\s+list/i,
    /what\s+books?/i,
  ],
  search_book: [
    /(?:find|search|look\s+(?:for|up))\s+["']?([^"']+)["']?/i,
    /(?:do\s+i\s+have|have\s+i\s+got)\s+["']?([^"']+)["']?/i,
    /book\s+(?:called|named|titled)\s+["']?([^"']+)["']?/i,
  ],
  get_stats: [
    /(?:my\s+)?(?:reading\s+)?stats?(?:istics)?/i,
    /how\s+(?:much|many)\s+(?:have\s+i\s+)?read/i,
    /(?:total|all)\s+(?:books?|pages?)/i,
    /reading\s+(?:summary|overview)/i,
  ],
  help: [
    /^help$/i,
    /(?:what\s+)?(?:can\s+(?:you|i)\s+)?(?:do|commands?|options?)/i,
    /how\s+(?:do\s+i|does\s+this|to)\s+(?:use|work)/i,
    /^\?$/,
  ],
  unknown: [],
};

// Keywords that indicate specific intents
const INTENT_KEYWORDS: Record<IntentType, string[]> = {
  update_progress: ['page', 'progress', '%', 'percent', 'through'],
  start_book: ['start', 'begin', 'new book', 'picked up', 'starting'],
  finish_book: ['finish', 'done', 'complete', 'ended'],
  get_status: ['status', 'where', 'progress', 'current'],
  list_reading: ['list', 'reading', 'books', 'what am i'],
  search_book: ['find', 'search', 'look for', 'have i got'],
  get_stats: ['stats', 'statistics', 'total', 'how many', 'how much'],
  help: ['help', 'commands', '?'],
  unknown: [],
};

/**
 * Extract page number from message
 */
function extractPageNumber(message: string): number | undefined {
  const pageMatch = message.match(/page\s+(\d+)/i) ||
                    message.match(/(\d+)\s+pages?/i) ||
                    message.match(/^(\d+)$/);
  if (pageMatch) {
    return parseInt(pageMatch[1], 10);
  }
  return undefined;
}

/**
 * Extract percentage from message
 */
function extractPercentage(message: string): number | undefined {
  const percentMatch = message.match(/(\d+)\s*%/);
  if (percentMatch) {
    const percent = parseInt(percentMatch[1], 10);
    return percent >= 0 && percent <= 100 ? percent : undefined;
  }
  return undefined;
}

/**
 * Extract book title from message
 */
function extractBookTitle(message: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      // Clean up the extracted title
      return match[1].trim().replace(/['"]+/g, '');
    }
  }
  return undefined;
}

/**
 * Calculate confidence score based on pattern matches and keywords
 */
function calculateConfidence(
  message: string,
  intent: IntentType,
  patternMatched: boolean
): number {
  let confidence = patternMatched ? 0.7 : 0.3;

  const keywords = INTENT_KEYWORDS[intent];
  const lowerMessage = message.toLowerCase();

  // Boost confidence for each keyword found
  for (const keyword of keywords) {
    if (lowerMessage.includes(keyword.toLowerCase())) {
      confidence += 0.1;
    }
  }

  // Cap confidence at 0.95
  return Math.min(confidence, 0.95);
}

/**
 * Classify a message and extract parameters
 */
export function classifyIntent(message: string): ClassificationResult {
  const trimmedMessage = message.trim();

  // Handle empty messages
  if (!trimmedMessage) {
    return {
      intent: 'unknown',
      confidence: 0,
      parameters: {},
      rawMessage: message,
    };
  }

  // Check each intent type
  for (const [intentName, patterns] of Object.entries(INTENT_PATTERNS)) {
    const intent = intentName as IntentType;
    if (intent === 'unknown') continue;

    for (const pattern of patterns) {
      if (pattern.test(trimmedMessage)) {
        const parameters: IntentParameters = {};

        // Extract parameters based on intent type
        switch (intent) {
          case 'update_progress':
            parameters.pageNumber = extractPageNumber(trimmedMessage);
            parameters.percentComplete = extractPercentage(trimmedMessage);
            break;
          case 'start_book':
            parameters.bookTitle = extractBookTitle(trimmedMessage, INTENT_PATTERNS.start_book);
            break;
          case 'finish_book':
            parameters.bookTitle = extractBookTitle(trimmedMessage, INTENT_PATTERNS.finish_book);
            break;
          case 'search_book':
            parameters.query = extractBookTitle(trimmedMessage, INTENT_PATTERNS.search_book);
            break;
        }

        return {
          intent,
          confidence: calculateConfidence(trimmedMessage, intent, true),
          parameters,
          rawMessage: message,
        };
      }
    }
  }

  // Check for simple page number (just a number)
  const simplePageMatch = trimmedMessage.match(/^(\d+)$/);
  if (simplePageMatch) {
    return {
      intent: 'update_progress',
      confidence: 0.6,
      parameters: {
        pageNumber: parseInt(simplePageMatch[1], 10),
      },
      rawMessage: message,
    };
  }

  // Fall back to keyword-based classification
  for (const [intentName, keywords] of Object.entries(INTENT_KEYWORDS)) {
    const intent = intentName as IntentType;
    if (intent === 'unknown') continue;

    const lowerMessage = trimmedMessage.toLowerCase();
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        return {
          intent,
          confidence: calculateConfidence(trimmedMessage, intent, false),
          parameters: {},
          rawMessage: message,
        };
      }
    }
  }

  return {
    intent: 'unknown',
    confidence: 0.1,
    parameters: {},
    rawMessage: message,
  };
}

/**
 * Check if a classification is confident enough to act on
 */
export function isConfidentClassification(result: ClassificationResult, threshold = 0.5): boolean {
  return result.confidence >= threshold;
}
