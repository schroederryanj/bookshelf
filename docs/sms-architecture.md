# SMS Assistant Architecture

## Executive Summary

This document describes the architecture for an AI-powered SMS assistant that enables users to interact with their bookshelf via text messages. The system leverages Twilio for SMS transport, integrates with existing book management APIs, and uses AI for natural language understanding.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Data Models](#data-models)
3. [API Structure](#api-structure)
4. [Service Architecture](#service-architecture)
5. [Integration Points](#integration-points)
6. [Security Considerations](#security-considerations)
7. [Data Flow](#data-flow)
8. [Implementation Decisions](#implementation-decisions)
9. [File Structure](#file-structure)

---

## System Overview

### Goals

- Enable users to interact with their bookshelf via SMS
- Support natural language queries (search, stats, recommendations)
- Maintain conversation context for multi-turn interactions
- Keep responses SMS-friendly (under 160 chars when possible)

### High-Level Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐
│   User      │────>│   Twilio    │────>│  Next.js API     │
│   Phone     │<────│   Gateway   │<────│  /api/sms/webhook│
└─────────────┘     └─────────────┘     └────────┬─────────┘
                                                 │
                    ┌────────────────────────────┼────────────────────────────┐
                    │                            v                            │
                    │  ┌──────────────┐   ┌──────────────┐   ┌─────────────┐  │
                    │  │ SMS Parser   │──>│   Intent     │──>│  Command    │  │
                    │  │ Service      │   │   Classifier │   │  Handlers   │  │
                    │  └──────────────┘   └──────────────┘   └──────┬──────┘  │
                    │                                               │         │
                    │  ┌────────────────────────────────────────────┼──────┐  │
                    │  │                                            v      │  │
                    │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐│  │
                    │  │  │ Books   │  │ Stats   │  │ Recs    │  │Progress ││  │
                    │  │  │ API     │  │ API     │  │ API     │  │ API     ││  │
                    │  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘│  │
                    │  │            Existing APIs                          │  │
                    │  └───────────────────────────────────────────────────┘  │
                    │                            │                            │
                    │                            v                            │
                    │                     ┌──────────────┐                    │
                    │                     │   Prisma/    │                    │
                    │                     │   MySQL DB   │                    │
                    │                     └──────────────┘                    │
                    │                     Application Layer                   │
                    └─────────────────────────────────────────────────────────┘
```

---

## Data Models

### Prisma Schema Additions

Add these models to `prisma/schema.prisma`:

```prisma
// SMS Conversation tracking for context management
model SMSConversation {
  id            Int          @id @default(autoincrement())
  phoneNumber   String       @db.VarChar(20)  // E.164 format: +1234567890
  userId        String       @default("default") @db.VarChar(255)
  isActive      Boolean      @default(true)
  lastIntent    String?      @db.VarChar(50)  // Last detected intent for context
  contextData   Json?        // Flexible context storage (search results, pending actions)
  messageCount  Int          @default(0)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  expiresAt     DateTime?    // Auto-expire inactive conversations

  messages      SMSMessage[]

  @@unique([phoneNumber, userId])
  @@index([phoneNumber])
  @@index([userId])
  @@index([isActive])
  @@index([updatedAt])
}

// Individual SMS message history
model SMSMessage {
  id              Int             @id @default(autoincrement())
  conversationId  Int
  direction       MessageDirection
  content         String          @db.Text
  twilioSid       String?         @db.VarChar(50)  // Twilio message SID
  intent          String?         @db.VarChar(50)  // Detected intent
  intentConfidence Float?         // AI confidence score (0-1)
  status          MessageStatus   @default(RECEIVED)
  processedAt     DateTime?
  errorMessage    String?         @db.Text
  createdAt       DateTime        @default(now())

  conversation    SMSConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId])
  @@index([createdAt])
  @@index([direction])
  @@index([twilioSid])
}

// Phone number to user mapping (for multi-user support)
model PhoneMapping {
  id          Int      @id @default(autoincrement())
  phoneNumber String   @unique @db.VarChar(20)
  userId      String   @db.VarChar(255)
  isVerified  Boolean  @default(false)
  verifyCode  String?  @db.VarChar(6)
  verifyExpires DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
  @@index([phoneNumber])
}

// Enums for SMS system
enum MessageDirection {
  INBOUND   // User -> System
  OUTBOUND  // System -> User
}

enum MessageStatus {
  RECEIVED    // Inbound message received
  PROCESSING  // Being processed
  SENT        // Outbound message sent
  DELIVERED   // Confirmed delivered
  FAILED      // Delivery/processing failed
}
```

### Design Rationale

| Decision | Rationale |
|----------|-----------|
| Separate Conversation/Message tables | Allows efficient context retrieval without loading full history |
| `contextData` as JSON | Flexibility for different intent types (search results, book selections) |
| Phone in E.164 format | International standard, required by Twilio |
| `expiresAt` field | Enables automatic cleanup of stale conversations |
| Message `twilioSid` | Enables webhook status callbacks and debugging |

---

## API Structure

### Route Definitions

```
/api/sms/
├── webhook/
│   └── route.ts          # POST: Twilio incoming webhook
├── status/
│   └── route.ts          # POST: Twilio delivery status callback
└── verify/
    └── route.ts          # POST: Phone verification initiation/confirmation
```

### Webhook Endpoint Specification

**`POST /api/sms/webhook`**

Receives incoming SMS from Twilio and returns TwiML response.

```typescript
// Request (Twilio webhook payload)
interface TwilioInboundPayload {
  MessageSid: string;
  AccountSid: string;
  From: string;           // Sender phone (E.164)
  To: string;             // Twilio phone number
  Body: string;           // Message content
  NumMedia: string;       // Number of media attachments
  // ... other Twilio fields
}

// Response: TwiML XML
// Content-Type: text/xml
// Example:
// <?xml version="1.0" encoding="UTF-8"?>
// <Response>
//   <Message>Found 3 books by Brandon Sanderson. Reply 1-3 to see details.</Message>
// </Response>
```

**`POST /api/sms/status`**

Receives delivery status updates from Twilio.

```typescript
interface TwilioStatusPayload {
  MessageSid: string;
  MessageStatus: 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered';
  ErrorCode?: string;
  ErrorMessage?: string;
}
```

---

## Service Architecture

### Interface Definitions

```typescript
// lib/sms/types.ts

// Supported intent types
export type SMSIntent =
  | 'search'      // Find books by title/author
  | 'stats'       // Get reading statistics
  | 'recommend'   // Get book recommendations
  | 'add'         // Add a book to shelf
  | 'update'      // Update reading progress
  | 'reminder'    // Set reading reminder
  | 'help'        // Get help/commands
  | 'select'      // Select from previous results
  | 'unknown';    // Unrecognized intent

// Intent classification result
export interface IntentResult {
  intent: SMSIntent;
  confidence: number;        // 0-1 confidence score
  entities: IntentEntities;  // Extracted entities
  rawQuery: string;
}

// Extracted entities from user message
export interface IntentEntities {
  bookTitle?: string;
  authorName?: string;
  genre?: string;
  pageNumber?: number;
  rating?: number;
  selectionIndex?: number;   // For "1", "2", etc. selections
  timeframe?: 'day' | 'week' | 'month' | 'year';
}

// Conversation context
export interface ConversationContext {
  conversationId: number;
  phoneNumber: string;
  userId: string;
  lastIntent?: SMSIntent;
  pendingResults?: PendingResults;
  awaitingConfirmation?: ConfirmationData;
}

// Pending search/recommendation results
export interface PendingResults {
  type: 'search' | 'recommendations';
  items: Array<{
    id: number;
    title: string;
    author?: string;
  }>;
  query?: string;
  expiresAt: Date;
}

// Confirmation awaiting user response
export interface ConfirmationData {
  action: 'add' | 'update' | 'delete';
  bookId?: number;
  data?: Record<string, unknown>;
  expiresAt: Date;
}

// Command handler result
export interface CommandResult {
  success: boolean;
  message: string;           // SMS response text
  updateContext?: Partial<ConversationContext['pendingResults']>;
  clearContext?: boolean;
}
```

### Service Layer Components

```typescript
// lib/sms/parser.ts - SMS parsing and preprocessing

export interface SMSParserService {
  /**
   * Parse raw SMS content into structured format
   * - Normalizes whitespace and casing
   * - Detects if message is a selection (number reply)
   * - Handles common abbreviations
   */
  parse(content: string): ParsedMessage;
}

interface ParsedMessage {
  normalized: string;
  isSelection: boolean;
  selectionIndex?: number;
  isHelp: boolean;
  tokens: string[];
}
```

```typescript
// lib/sms/intent-classifier.ts - AI-powered intent classification

export interface IntentClassifierService {
  /**
   * Classify user intent using AI/NLP
   * Falls back to rule-based classification if AI unavailable
   */
  classify(
    message: ParsedMessage,
    context?: ConversationContext
  ): Promise<IntentResult>;
}
```

```typescript
// lib/sms/command-handlers.ts - Intent execution

export interface CommandHandlerRegistry {
  /**
   * Execute command based on classified intent
   */
  execute(
    intent: IntentResult,
    context: ConversationContext
  ): Promise<CommandResult>;
}

// Individual handlers
export interface SearchHandler {
  search(query: string, type: 'title' | 'author' | 'any'): Promise<CommandResult>;
}

export interface StatsHandler {
  getStats(timeframe?: string): Promise<CommandResult>;
  getStreak(): Promise<CommandResult>;
}

export interface RecommendHandler {
  getRecommendations(criteria?: string): Promise<CommandResult>;
}

export interface UpdateHandler {
  updateProgress(bookId: number, page: number): Promise<CommandResult>;
  markComplete(bookId: number): Promise<CommandResult>;
}
```

```typescript
// lib/sms/response-formatter.ts - SMS-optimized formatting

export interface ResponseFormatterService {
  /**
   * Format response for SMS constraints
   * - Splits long messages into segments
   * - Abbreviates where appropriate
   * - Adds selection prompts
   */
  format(result: CommandResult, maxLength?: number): string[];
}
```

### Intent Classification Strategy

The classifier uses a hybrid approach:

1. **Rule-based pre-classification** (fast, no API cost)
   - Number-only messages -> `select`
   - "help", "?" -> `help`
   - Starts with "find", "search" -> `search`
   - Contains "stats", "streak" -> `stats`

2. **AI classification** (for ambiguous cases)
   - Use Claude/OpenAI with a focused prompt
   - Include conversation context for better accuracy
   - Cache common patterns

```typescript
// Example classification prompt
const CLASSIFICATION_PROMPT = `
You are classifying SMS messages for a book tracking app.
Classify the intent and extract entities.

Intents:
- search: Finding books (by title, author, genre)
- stats: Reading statistics (books read, streak, goals)
- recommend: Book recommendations
- add: Adding a new book
- update: Updating reading progress
- reminder: Setting reminders
- help: Getting help
- unknown: Cannot determine

Message: "{message}"
Previous intent: {lastIntent}

Respond in JSON: {"intent": "...", "confidence": 0.0-1.0, "entities": {...}}
`;
```

---

## Integration Points

### Existing API Integration

The SMS handlers call existing internal APIs:

| SMS Intent | Existing API | Usage |
|------------|--------------|-------|
| `search` | `GET /api/books?search=` | Search books by query |
| `search` (author) | `GET /api/books?author=` | Filter by author |
| `stats` | `GET /api/reading-stats` | Get reading statistics |
| `recommend` | `GET /api/recommendations/favorites` | Get recommendations |
| `update` | `PUT /api/reading-progress/[bookId]` | Update progress |
| `add` | `POST /api/books` | Add new book |

### Internal Function Integration

For better performance, handlers can call library functions directly:

```typescript
// Instead of HTTP calls, import directly
import { getReadingStats, calculateStreak } from '@/lib/reading-stats';
import { prisma } from '@/lib/prisma';

// Stats handler implementation
async function handleStats(context: ConversationContext): Promise<CommandResult> {
  const stats = await getReadingStats(context.userId);

  return {
    success: true,
    message: formatStatsForSMS(stats),
  };
}

function formatStatsForSMS(stats: ReadingStats): string {
  // Under 160 chars
  return `📚 ${stats.totalBooksRead} books read | ` +
         `🔥 ${stats.streak.currentStreak} day streak | ` +
         `📖 ${stats.totalBooksReading} reading`;
}
```

### Recommendation System Integration

```typescript
// Leverage existing recommendation logic
async function handleRecommend(context: ConversationContext): Promise<CommandResult> {
  // Call internal recommendation logic
  const response = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/recommendations/favorites?limit=3`);
  const data = await response.json();

  if (data.recommendations.length === 0) {
    return {
      success: true,
      message: "No recommendations yet. Rate more books to get personalized suggestions!",
    };
  }

  // Store results for selection
  const items = data.recommendations.map((book: Book, i: number) => ({
    id: book.id,
    title: book.title,
    author: book.author,
  }));

  return {
    success: true,
    message: formatBookList(items, "Recommended for you"),
    updateContext: {
      type: 'recommendations',
      items,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min
    },
  };
}
```

---

## Security Considerations

### Twilio Signature Validation

All webhook requests must be validated using Twilio's signature:

```typescript
// lib/sms/security.ts

import crypto from 'crypto';

export function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  // Sort params alphabetically and concatenate
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], '');

  const data = url + sortedParams;

  const expectedSignature = crypto
    .createHmac('sha1', authToken)
    .update(Buffer.from(data, 'utf-8'))
    .digest('base64');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Middleware for webhook routes
export async function validateTwilioRequest(
  request: Request
): Promise<{ valid: boolean; params?: Record<string, string> }> {
  const signature = request.headers.get('X-Twilio-Signature');

  if (!signature) {
    return { valid: false };
  }

  const formData = await request.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = value.toString();
  });

  const url = process.env.TWILIO_WEBHOOK_URL || request.url;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;

  return {
    valid: validateTwilioSignature(authToken, signature, url, params),
    params,
  };
}
```

### Rate Limiting

Implement per-phone-number rate limiting:

```typescript
// lib/sms/rate-limiter.ts

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  default: { maxRequests: 30, windowMs: 60_000 },    // 30/min
  search: { maxRequests: 10, windowMs: 60_000 },     // 10/min
  update: { maxRequests: 20, windowMs: 60_000 },     // 20/min
};

// In-memory store (use Redis in production)
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  phoneNumber: string,
  intent: string = 'default'
): { allowed: boolean; retryAfter?: number } {
  const config = RATE_LIMITS[intent] || RATE_LIMITS.default;
  const key = `${phoneNumber}:${intent}`;
  const now = Date.now();

  const record = requestCounts.get(key);

  if (!record || now > record.resetAt) {
    requestCounts.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true };
  }

  if (record.count >= config.maxRequests) {
    return {
      allowed: false,
      retryAfter: Math.ceil((record.resetAt - now) / 1000),
    };
  }

  record.count++;
  return { allowed: true };
}
```

### Phone Number Validation

```typescript
// lib/sms/validation.ts

// E.164 format validation
const E164_REGEX = /^\+[1-9]\d{6,14}$/;

export function validatePhoneNumber(phone: string): boolean {
  return E164_REGEX.test(phone);
}

export function normalizePhoneNumber(phone: string): string | null {
  // Remove all non-digit characters except leading +
  let normalized = phone.replace(/[^\d+]/g, '');

  // Add + if missing (assuming US number)
  if (!normalized.startsWith('+')) {
    if (normalized.length === 10) {
      normalized = '+1' + normalized;
    } else if (normalized.length === 11 && normalized.startsWith('1')) {
      normalized = '+' + normalized;
    }
  }

  return validatePhoneNumber(normalized) ? normalized : null;
}
```

### Input Sanitization

```typescript
// Sanitize SMS content before processing
export function sanitizeSMSContent(content: string): string {
  return content
    .trim()
    .slice(0, 1600)           // Max SMS length with segments
    .replace(/[\x00-\x1F]/g, '') // Remove control characters
    .normalize('NFKC');        // Normalize unicode
}
```

---

## Data Flow

### Inbound Message Flow

```
1. User sends SMS to Twilio number
   │
   v
2. Twilio POSTs to /api/sms/webhook
   │
   ├──> Validate Twilio signature (REJECT if invalid)
   │
   ├──> Check rate limit (REJECT if exceeded)
   │
   ├──> Normalize phone number
   │
   v
3. Load/create conversation context
   │
   ├──> Query SMSConversation by phoneNumber
   │
   ├──> If exists: load context, pending results
   │
   ├──> If new: create conversation record
   │
   v
4. Parse message content
   │
   ├──> Detect selection (number reply)
   │
   ├──> Normalize text
   │
   v
5. Classify intent
   │
   ├──> If selection + pending results: resolve selection
   │
   ├──> Rule-based classification attempt
   │
   ├──> AI classification if ambiguous
   │
   v
6. Execute command handler
   │
   ├──> Call appropriate handler based on intent
   │
   ├──> Handler calls existing APIs/functions
   │
   ├──> Handler returns CommandResult
   │
   v
7. Update conversation state
   │
   ├──> Save message to SMSMessage
   │
   ├──> Update conversation context if needed
   │
   v
8. Format and send response
   │
   ├──> Format message for SMS constraints
   │
   ├──> Return TwiML response
   │
   v
9. Twilio delivers response to user
```

### Selection Flow (Multi-turn)

```
User: "find sanderson"
   │
   v
System: "Found 3 books:
         1. Mistborn
         2. Way of Kings
         3. Elantris
         Reply 1-3 for details"
   │
   │  (context stored: pendingResults with book IDs)
   │
   v
User: "2"
   │
   v
System detects selection, loads context
   │
   v
System: "Way of Kings by Brandon Sanderson
         1007 pages | Fantasy
         Reply ADD to add to shelf"
```

---

## Implementation Decisions

### Decision 1: Direct Function Calls vs HTTP

**Decision**: Use direct function imports for internal operations, HTTP for external APIs.

**Rationale**:
- Reduces latency (no HTTP overhead)
- Better error handling and type safety
- External HTTP only for Google Books API

**Trade-offs**:
- Tighter coupling to existing codebase
- Must ensure function signatures remain stable

### Decision 2: Conversation Expiry

**Decision**: Conversations expire after 30 minutes of inactivity.

**Rationale**:
- Prevents stale context from confusing users
- Reduces database bloat
- SMS interactions are typically quick

**Implementation**:
- `expiresAt` field on conversation
- Background job or on-access cleanup
- Context data cleared on expiry

### Decision 3: AI Classification Strategy

**Decision**: Hybrid rule-based + AI classification.

**Rationale**:
- Rule-based handles 70%+ of cases (fast, free)
- AI provides fallback for complex queries
- Reduces API costs significantly

**Trade-offs**:
- More complex implementation
- Rules need maintenance
- AI fallback adds latency

### Decision 4: Response Chunking

**Decision**: Prefer single messages; chunk only when necessary.

**Rationale**:
- Each SMS segment costs money
- Users prefer concise responses
- Important info first, details on request

**Guidelines**:
- Target < 160 chars for simple responses
- Book lists: max 3 items with numbers
- Stats: key metrics only
- Use abbreviations (e.g., "pg" for pages)

### Decision 5: Phone-to-User Mapping

**Decision**: Support phone verification for multi-user.

**Rationale**:
- Current system has single "default" user
- Phone mapping enables future multi-user
- Verification prevents unauthorized access

**Implementation**:
- Optional verification flow
- Default user for unverified phones
- 6-digit code via SMS

---

## File Structure

```
app/
├── api/
│   └── sms/
│       ├── webhook/
│       │   └── route.ts       # Twilio inbound webhook
│       ├── status/
│       │   └── route.ts       # Delivery status callback
│       └── verify/
│           └── route.ts       # Phone verification

lib/
├── sms/
│   ├── index.ts               # Main exports
│   ├── types.ts               # Type definitions
│   ├── parser.ts              # Message parsing
│   ├── intent-classifier.ts   # Intent classification
│   ├── handlers/
│   │   ├── index.ts           # Handler registry
│   │   ├── search.ts          # Search handler
│   │   ├── stats.ts           # Stats handler
│   │   ├── recommend.ts       # Recommendation handler
│   │   ├── update.ts          # Progress update handler
│   │   ├── add.ts             # Add book handler
│   │   └── help.ts            # Help handler
│   ├── context.ts             # Conversation context management
│   ├── response-formatter.ts  # SMS response formatting
│   ├── security.ts            # Twilio validation, rate limiting
│   ├── validation.ts          # Input validation
│   └── twilio-client.ts       # Twilio SDK wrapper

prisma/
└── schema.prisma              # Add SMS models

tests/
└── api/
    └── sms/
        ├── webhook.test.ts
        ├── parser.test.ts
        ├── intent-classifier.test.ts
        └── handlers/
            ├── search.test.ts
            ├── stats.test.ts
            └── recommend.test.ts
```

---

## Environment Variables

Add to `.env`:

```bash
# Twilio Configuration (already set)
TWILIO_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Additional SMS Config
TWILIO_WEBHOOK_URL=https://yourdomain.com/api/sms/webhook
SMS_RATE_LIMIT_WINDOW_MS=60000
SMS_RATE_LIMIT_MAX_REQUESTS=30

# AI Classification (optional - for hybrid approach)
OPENAI_API_KEY=sk-...  # Or use existing Anthropic key
SMS_AI_CLASSIFICATION_ENABLED=true
```

---

## Example Interactions

### Search Flow

```
User: "books by brandon sanderson"
Bot:  "Found 3 books by Sanderson:
       1. Mistborn (Read)
       2. Way of Kings (Reading)
       3. Elantris (Unread)
       Reply 1-3 for details"

User: "3"
Bot:  "Elantris by Brandon Sanderson
       496 pg | Fantasy | Unread
       Reply UPDATE to start reading"
```

### Stats Flow

```
User: "stats"
Bot:  "📚 12 books read this year
       🔥 7 day streak
       📖 2 currently reading
       ⏱️ Avg 14 days/book"
```

### Recommendation Flow

```
User: "recommend something"
Bot:  "Based on your favorites:
       1. Project Hail Mary
       2. Children of Time
       3. Hyperion
       Reply 1-3 to see details"
```

### Update Progress Flow

```
User: "page 150 mistborn"
Bot:  "Updated Mistborn: pg 150/541 (28%)
       Keep reading! 🔥"
```

### Help Flow

```
User: "help"
Bot:  "Commands:
       FIND [title/author]
       STATS - your reading stats
       REC - recommendations
       UPDATE [book] pg [#]
       Reply ? anytime for help"
```

---

## Next Steps

1. **Phase 1**: Implement core webhook and basic handlers
   - Twilio signature validation
   - Search and stats handlers
   - Basic response formatting

2. **Phase 2**: Add conversation context
   - Multi-turn interactions
   - Selection handling
   - Context expiry

3. **Phase 3**: AI classification
   - Integrate with Claude/OpenAI
   - Train on common patterns
   - Optimize prompt

4. **Phase 4**: Advanced features
   - Phone verification
   - Reading reminders
   - Progress updates

5. **Phase 5**: Monitoring and optimization
   - Usage analytics
   - Error tracking
   - Response time optimization
