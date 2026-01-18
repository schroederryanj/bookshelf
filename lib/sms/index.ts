/**
 * SMS Assistant Module
 * Public exports for the SMS feature
 *
 * This module provides a complete SMS-based interface to the bookshelf app:
 * - Intent classification (regex-based with AI enhancement)
 * - Conversation management (in-memory with timeout)
 * - Command handlers for reading progress, search, stats, etc.
 * - TwiML response formatting
 */

// Types
export * from './types';

// Orchestrator (main entry point)
export {
  processIncomingSMS,
  processIncomingSMSToTwiML,
  processTwilioWebhook,
  processMessage,
  formatTwiMLResponse,
  validateTwilioSignature,
  getContext,
  updateContext,
  clearContext,
  cleanupRateLimits,
  getRateLimitStatus,
  type ProcessingResult,
} from './orchestrator';

// Intent Classification
export {
  classifyIntent,
  isConfidentClassification,
} from './intent-classifier';

// Handlers
export {
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
