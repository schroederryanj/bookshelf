/**
 * Twilio SMS Service
 *
 * Provides core SMS functionality including:
 * - Sending outbound SMS messages
 * - Signature validation for webhook security
 * - Message formatting with SMS length limit handling
 */

import Twilio from "twilio";
import { validateRequest } from "twilio";
import type { MessageInstance } from "twilio/lib/rest/api/v2010/account/message";

// SMS character limits
const SMS_MAX_LENGTH = 1600; // Twilio supports up to 1600 characters (concatenated)
const SMS_SEGMENT_LENGTH = 160; // Standard SMS segment length

// Twilio client type
type TwilioClient = ReturnType<typeof Twilio>;

// Twilio client singleton
let twilioClient: TwilioClient | null = null;

/**
 * Environment variable validation
 */
function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Get or create Twilio client instance
 */
function getTwilioClient(): TwilioClient {
  if (!twilioClient) {
    const accountSid = getRequiredEnv("TWILIO_SID");
    const authToken = getRequiredEnv("TWILIO_AUTH_TOKEN");
    twilioClient = Twilio(accountSid, authToken);
  }
  return twilioClient;
}

/**
 * Send an SMS message
 *
 * @param to - Recipient phone number (E.164 format)
 * @param body - Message body
 * @returns Promise with Twilio message instance
 */
export async function sendSMS(
  to: string,
  body: string
): Promise<MessageInstance> {
  const client = getTwilioClient();
  const from = getRequiredEnv("TWILIO_PHONE_NUMBER");

  // Format message if it exceeds SMS limits
  const formattedBody = formatMessageBody(body);

  try {
    const message = await client.messages.create({
      to,
      from,
      body: formattedBody,
    });

    console.log(`SMS sent successfully: ${message.sid}`);
    return message;
  } catch (error) {
    console.error("Failed to send SMS:", error);
    throw error;
  }
}

/**
 * Send multiple SMS messages (for long content that needs splitting)
 *
 * @param to - Recipient phone number (E.164 format)
 * @param messages - Array of message bodies
 * @returns Promise with array of Twilio message instances
 */
export async function sendMultipleSMS(
  to: string,
  messages: string[]
): Promise<MessageInstance[]> {
  const results: MessageInstance[] = [];

  for (const body of messages) {
    const message = await sendSMS(to, body);
    results.push(message);

    // Small delay between messages to maintain order
    if (messages.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return results;
}

/**
 * Validate Twilio webhook signature
 *
 * @param signature - X-Twilio-Signature header value
 * @param url - Full webhook URL
 * @param params - Request body parameters
 * @param authToken - Optional Twilio auth token (defaults to TWILIO_AUTH_TOKEN env var)
 * @returns Boolean indicating if signature is valid
 */
export function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>,
  authToken?: string
): boolean {
  const token = authToken || getRequiredEnv("TWILIO_AUTH_TOKEN");

  try {
    return validateRequest(token, signature, url, params);
  } catch (error) {
    console.error("Signature validation error:", error);
    return false;
  }
}

/**
 * Format message body to fit within SMS limits
 * Truncates with ellipsis if necessary
 *
 * @param body - Original message body
 * @returns Formatted message body
 */
export function formatMessageBody(body: string): string {
  if (body.length <= SMS_MAX_LENGTH) {
    return body;
  }

  // Truncate with ellipsis
  return body.substring(0, SMS_MAX_LENGTH - 3) + "...";
}

/**
 * Split a long message into multiple SMS-appropriate chunks
 *
 * @param body - Original message body
 * @param maxLength - Maximum length per chunk (default: 1600)
 * @returns Array of message chunks
 */
export function splitMessage(
  body: string,
  maxLength: number = SMS_MAX_LENGTH
): string[] {
  if (body.length <= maxLength) {
    return [body];
  }

  const chunks: string[] = [];
  let remaining = body;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Find a good break point (space, newline, or punctuation)
    let breakPoint = maxLength;
    const searchStart = Math.max(0, maxLength - 50);

    // Look for natural break points
    for (let i = maxLength - 1; i >= searchStart; i--) {
      if (/[\s.!?\n]/.test(remaining[i])) {
        breakPoint = i + 1;
        break;
      }
    }

    chunks.push(remaining.substring(0, breakPoint).trim());
    remaining = remaining.substring(breakPoint).trim();
  }

  return chunks;
}

/**
 * Calculate number of SMS segments for a message
 *
 * @param body - Message body
 * @returns Number of segments
 */
export function calculateSegments(body: string): number {
  if (body.length <= SMS_SEGMENT_LENGTH) {
    return 1;
  }

  // For concatenated messages, each segment is 153 characters
  // (7 characters reserved for UDH header)
  const concatenatedSegmentLength = 153;
  return Math.ceil(body.length / concatenatedSegmentLength);
}

/**
 * Generate TwiML response for SMS
 *
 * @param message - Response message (optional)
 * @returns TwiML XML string
 */
export function generateTwiMLResponse(message?: string): string {
  const twiml = new Twilio.twiml.MessagingResponse();

  if (message) {
    twiml.message(message);
  }

  return twiml.toString();
}

/**
 * Parse phone number to E.164 format
 *
 * @param phoneNumber - Phone number string
 * @returns Normalized phone number in E.164 format
 */
export function normalizePhoneNumber(phoneNumber: string): string {
  // Remove all non-numeric characters except leading +
  let normalized = phoneNumber.replace(/[^\d+]/g, "");

  // Ensure it starts with +
  if (!normalized.startsWith("+")) {
    // Assume US number if no country code
    if (normalized.length === 10) {
      normalized = "+1" + normalized;
    } else if (normalized.length === 11 && normalized.startsWith("1")) {
      normalized = "+" + normalized;
    }
  }

  return normalized;
}

export type { MessageInstance };
