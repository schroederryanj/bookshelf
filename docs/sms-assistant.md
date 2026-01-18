# SMS Reading Assistant

Track your reading progress via text message. This feature allows you to update your reading status, start new books, and check your stats - all through SMS.

## Table of Contents

- [Overview](#overview)
- [Setup](#setup)
- [Available Commands](#available-commands)
- [Examples](#examples)
- [Technical Details](#technical-details)
- [Troubleshooting](#troubleshooting)
- [API Reference](#api-reference)

## Overview

The SMS Reading Assistant provides a simple interface for tracking your reading progress when you're away from the web app. Send a text message to your Twilio number to:

- Update your current page number
- Start reading a new book
- Mark a book as finished
- Check your reading status
- View your reading statistics

## Setup

### Prerequisites

- A Twilio account ([Sign up](https://www.twilio.com/try-twilio))
- A Twilio phone number with SMS capabilities
- Your Bookshelf app deployed and accessible via HTTPS

### Step 1: Configure Environment Variables

Add the following to your `.env` file:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567
```

### Step 2: Configure Twilio Webhook

1. Log in to your [Twilio Console](https://console.twilio.com/)
2. Navigate to Phone Numbers > Manage > Active Numbers
3. Select your phone number
4. Under "Messaging Configuration", set:
   - **A MESSAGE COMES IN**: Webhook
   - **URL**: `https://your-domain.com/api/sms/webhook`
   - **HTTP Method**: POST

### Step 3: Verify Setup

Send "help" to your Twilio number. You should receive a response with available commands.

## Available Commands

### Progress Updates

Update your reading progress for the current book.

| Command | Description |
|---------|-------------|
| `page 150` | Set current page to 150 |
| `page 75` | Set current page to 75 |
| `50%` | Set progress to 50% |
| `75% done` | Set progress to 75% |
| `42` | Quick page update (just send the number) |

### Starting a Book

Begin reading a new book from your library.

| Command | Description |
|---------|-------------|
| `start The Great Gatsby` | Start reading a book |
| `begin "1984"` | Start with quoted title |
| `reading Dune` | Alternative start command |
| `new book: Project Hail Mary` | Start with colon format |

### Finishing a Book

Mark a book as completed.

| Command | Description |
|---------|-------------|
| `finished` | Finish current book |
| `done` | Finish current book |
| `finished The Hobbit` | Finish specific book |
| `completed 1984` | Alternative finish command |

### Status & Information

Check your reading status and statistics.

| Command | Description |
|---------|-------------|
| `status` | Get current book status |
| `my progress` | Check progress |
| `my books` | List books you're reading |
| `reading list` | List current books |
| `find Harry Potter` | Search your library |
| `stats` | View reading statistics |

### Help

| Command | Description |
|---------|-------------|
| `help` | Show available commands |
| `?` | Show available commands |

## Examples

### Typical Reading Session

```
You: start The Great Gatsby
Bot: Started reading "The Great Gatsby" (180 pages). Good luck!

You: page 45
Bot: Updated "The Great Gatsby" to page 45 (25%)

You: 90
Bot: Updated "The Great Gatsby" to page 90 (50%)

You: status
Bot: Currently reading: "The Great Gatsby" by F. Scott Fitzgerald - 90/180 pages (50%)

You: finished
Bot: Congratulations on finishing "The Great Gatsby"! That's awesome!
```

### Checking Stats

```
You: stats
Bot: Your Reading Stats:
Books completed: 12
Currently reading: 3
Total pages read: 4,567

You: my books
Bot: Currently reading (3):
1. "Dune" - 45%
2. "1984" - 78%
3. "The Hobbit" - 12%
```

### Searching Your Library

```
You: find Stephen King
Bot: Found 3 book(s):
1. "The Shining" by Stephen King
2. "It" by Stephen King
3. "Carrie" by Stephen King
```

## Technical Details

### Architecture

```
                 +------------------+
Twilio SMS  -->  | Webhook Route    |
                 | /api/sms/webhook |
                 +--------+---------+
                          |
                          v
                 +------------------+
                 | Orchestrator     |
                 | - Context mgmt   |
                 | - Message flow   |
                 +--------+---------+
                          |
                          v
                 +------------------+
                 | Intent Classifier|
                 | - Pattern match  |
                 | - Param extract  |
                 +--------+---------+
                          |
                          v
                 +------------------+
                 | Handlers         |
                 | - DB operations  |
                 | - Response gen   |
                 +------------------+
```

### File Structure

```
lib/sms/
  index.ts              # Module exports
  types.ts              # TypeScript types
  intent-classifier.ts  # Message classification
  handlers.ts           # Command handlers
  orchestrator.ts       # Message flow coordination

app/api/sms/webhook/
  route.ts              # Twilio webhook endpoint

tests/sms/
  intent-classifier.test.ts
  handlers.test.ts
  orchestrator.test.ts
  integration.test.ts
```

### Intent Classification

The classifier uses a combination of:

1. **Pattern Matching**: Regular expressions for common phrases
2. **Keyword Detection**: Fallback keyword-based classification
3. **Confidence Scoring**: Weighted scoring based on matches

Supported intents:
- `update_progress` - Page/percentage updates
- `start_book` - Begin reading a book
- `finish_book` - Complete a book
- `get_status` - Check current progress
- `list_reading` - List books being read
- `search_book` - Search library
- `get_stats` - View statistics
- `help` - Show commands
- `unknown` - Unrecognized messages

### Conversation Context

The system maintains short-term context (5 minutes) for each phone number:

- Last book interacted with
- Last intent type
- Pending confirmations

This allows for follow-up messages like sending just a page number after starting a book.

## Troubleshooting

### Common Issues

#### "I didn't understand" Response

**Cause**: Message didn't match any known patterns.

**Solutions**:
- Check spelling
- Use simpler phrasing
- Reply "help" for command examples

#### "No active book found"

**Cause**: No book is currently being read.

**Solutions**:
- Start a book first: `start [book title]`
- Check your library has the book

#### "Couldn't find book"

**Cause**: Book title doesn't match any in your library.

**Solutions**:
- Search first: `find [partial title]`
- Add the book to your library via the web app
- Try partial title matching

#### No Response from Bot

**Causes**:
- Webhook URL incorrect
- Server not accessible
- Twilio configuration issue

**Solutions**:
1. Verify webhook URL in Twilio console
2. Check server logs for errors
3. Verify HTTPS certificate is valid
4. Test webhook manually with curl

### Debug Mode

Enable debug logging by setting:

```bash
DEBUG=bookshelf:sms*
```

### Testing Webhook Locally

Use ngrok for local development:

```bash
ngrok http 3000
```

Then update your Twilio webhook URL to the ngrok URL.

## API Reference

### POST /api/sms/webhook

Twilio webhook endpoint for incoming SMS messages.

**Request Format**: `application/x-www-form-urlencoded`

**Request Parameters** (from Twilio):

| Parameter | Type | Description |
|-----------|------|-------------|
| `MessageSid` | string | Unique message identifier |
| `AccountSid` | string | Twilio account SID |
| `From` | string | Sender phone number |
| `To` | string | Your Twilio number |
| `Body` | string | Message content |
| `NumMedia` | string | Number of media attachments |

**Response Format**: TwiML (XML)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Response text here</Message>
</Response>
```

**Status Codes**:

| Code | Description |
|------|-------------|
| 200 | Success (always returns TwiML) |
| 400 | Invalid request (missing Body/From) |
| 401 | Invalid Twilio signature (production) |
| 500 | Server error (returns error TwiML) |

### GET /api/sms/webhook

Health check endpoint.

**Response**: `200 OK` with text "SMS webhook is active"

## Security Considerations

### Signature Validation

In production, the webhook validates Twilio request signatures to prevent spoofing. Ensure `TWILIO_AUTH_TOKEN` is set.

### Phone Number Privacy

Phone numbers are used as context identifiers but are not stored long-term. Context expires after 5 minutes of inactivity.

### Rate Limiting

Consider implementing rate limiting for production deployments to prevent abuse. Suggested limits:
- 60 messages per minute per phone number
- 1000 messages per hour globally

## Future Enhancements

Potential features for future versions:

- [ ] Reading reminders
- [ ] Daily reading streak notifications
- [ ] Book recommendations via SMS
- [ ] Multi-user support with phone number verification
- [ ] Media message support (book cover images)
- [ ] Voice message transcription
