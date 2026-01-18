/**
 * SMS Error Handler
 * Provides user-friendly error messages and logging
 */

import { SMSIntent } from "./types";

// Error types for categorization
export type SMSErrorType =
  | "DATABASE_ERROR"
  | "INTENT_CLASSIFICATION_ERROR"
  | "BOOK_NOT_FOUND"
  | "INVALID_INPUT"
  | "RATE_LIMIT"
  | "EXTERNAL_SERVICE_ERROR"
  | "UNKNOWN_ERROR";

// Custom SMS error class
export class SMSError extends Error {
  constructor(
    message: string,
    public readonly type: SMSErrorType,
    public readonly userMessage: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = "SMSError";
  }
}

// Error messages that are user-friendly
const USER_FRIENDLY_MESSAGES: Record<SMSErrorType, string> = {
  DATABASE_ERROR: "Sorry, I'm having trouble accessing your bookshelf right now. Please try again in a moment.",
  INTENT_CLASSIFICATION_ERROR: "I didn't quite understand that. Reply HELP to see what I can do!",
  BOOK_NOT_FOUND: "I couldn't find that book in your library. Try searching with a different title or check your spelling.",
  INVALID_INPUT: "That doesn't look quite right. Could you try again?",
  RATE_LIMIT: "Whoa, slow down! You're sending messages too fast. Please wait a moment.",
  EXTERNAL_SERVICE_ERROR: "I'm having trouble connecting to external services. Please try again shortly.",
  UNKNOWN_ERROR: "Oops! Something went wrong on my end. Please try again.",
};

// Log error with context
export function logError(
  error: Error | SMSError,
  context: {
    phoneNumber?: string;
    messageSid?: string;
    intent?: SMSIntent;
    messageBody?: string;
  }
): void {
  const timestamp = new Date().toISOString();
  const errorType = error instanceof SMSError ? error.type : "UNKNOWN_ERROR";

  // Mask phone number for privacy in logs
  const maskedPhone = context.phoneNumber
    ? `***${context.phoneNumber.slice(-4)}`
    : "unknown";

  console.error(JSON.stringify({
    timestamp,
    level: "error",
    type: "sms_error",
    errorType,
    message: error.message,
    stack: error.stack,
    context: {
      phoneNumber: maskedPhone,
      messageSid: context.messageSid,
      intent: context.intent,
      // Don't log full message body for privacy, just length
      messageLength: context.messageBody?.length,
    },
  }));
}

// Get user-friendly error message
export function getUserFriendlyMessage(error: Error | SMSError): string {
  if (error instanceof SMSError) {
    return error.userMessage || USER_FRIENDLY_MESSAGES[error.type];
  }
  return USER_FRIENDLY_MESSAGES.UNKNOWN_ERROR;
}

// Create specific error types
export function createDatabaseError(originalError: Error): SMSError {
  return new SMSError(
    `Database error: ${originalError.message}`,
    "DATABASE_ERROR",
    USER_FRIENDLY_MESSAGES.DATABASE_ERROR,
    originalError
  );
}

export function createBookNotFoundError(searchTerm: string): SMSError {
  return new SMSError(
    `Book not found: ${searchTerm}`,
    "BOOK_NOT_FOUND",
    `I couldn't find "${searchTerm}" in your library. Try a different search term.`
  );
}

export function createInvalidInputError(field: string, expected: string): SMSError {
  return new SMSError(
    `Invalid input for ${field}: expected ${expected}`,
    "INVALID_INPUT",
    `Please provide a valid ${field}. ${expected}`
  );
}

export function createRateLimitError(): SMSError {
  return new SMSError(
    "Rate limit exceeded",
    "RATE_LIMIT",
    USER_FRIENDLY_MESSAGES.RATE_LIMIT
  );
}

// Fallback response for completely unhandled situations
export function getFallbackResponse(): string {
  return "I'm having some trouble right now. Please try again or reply HELP for available commands.";
}

// Handle specific error scenarios with context-aware messages
export function handleSpecificError(
  error: Error,
  intent: SMSIntent | undefined
): string {
  // Check for common Prisma errors
  if (error.message.includes("prisma") || error.message.includes("database")) {
    return USER_FRIENDLY_MESSAGES.DATABASE_ERROR;
  }

  // Intent-specific fallbacks
  switch (intent) {
    case "STATS":
      return "I couldn't fetch your reading stats right now. Please try again in a moment.";
    case "CURRENTLY_READING":
      return "I couldn't check your current books. Please try again.";
    case "SEARCH_BOOK":
      return "Search isn't working right now. Please try again shortly.";
    case "ADD_PROGRESS":
      return "I couldn't update your progress. Please try again.";
    case "RECOMMEND":
      return "I couldn't generate recommendations right now. Try again later!";
    default:
      return getFallbackResponse();
  }
}
