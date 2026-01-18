/**
 * Common types for SMS command handlers
 */

export interface HandlerResult {
  success: boolean;
  message: string;
  /** If response is too long for SMS, it will be split into parts */
  parts?: string[];
  /** Additional data for debugging/logging */
  data?: Record<string, unknown>;
}

export interface HandlerContext {
  /** User identifier (phone number or user ID) */
  userId: string;
  /** Raw message text */
  rawMessage: string;
}

export interface ParsedIntent {
  command: string;
  params: Record<string, string | number | boolean | undefined>;
}

export type CommandHandler = (
  intent: ParsedIntent,
  context: HandlerContext
) => Promise<HandlerResult>;

/**
 * Format a number with commas for readability
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Truncate text to fit SMS limits with ellipsis
 */
export function truncate(text: string, maxLength: number = 150): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Split a long message into SMS-sized parts (160 chars)
 */
export function splitMessage(message: string, maxLength: number = 160): string[] {
  if (message.length <= maxLength) return [message];

  const parts: string[] = [];
  let remaining = message;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      parts.push(remaining);
      break;
    }

    // Find a good break point (space, newline, or punctuation)
    let breakPoint = maxLength;
    for (let i = maxLength - 1; i >= maxLength - 40 && i > 0; i--) {
      if (remaining[i] === " " || remaining[i] === "\n" || remaining[i] === ".") {
        breakPoint = i + 1;
        break;
      }
    }

    parts.push(remaining.slice(0, breakPoint).trim());
    remaining = remaining.slice(breakPoint).trim();
  }

  return parts;
}

/**
 * Create an error result with a user-friendly message
 */
export function errorResult(message: string, error?: unknown): HandlerResult {
  console.error("Handler error:", error);
  return {
    success: false,
    message,
    data: error instanceof Error ? { error: error.message } : undefined,
  };
}

/**
 * Create a success result
 */
export function successResult(message: string, data?: Record<string, unknown>): HandlerResult {
  const parts = splitMessage(message);
  return {
    success: true,
    message: parts[0],
    parts: parts.length > 1 ? parts : undefined,
    data,
  };
}
