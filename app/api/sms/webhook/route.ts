/**
 * SMS Webhook API Route
 * Handles incoming SMS messages from Twilio
 */

import { NextRequest, NextResponse } from 'next/server';
import { processTwilioWebhook, validateTwilioSignature } from '@/lib/sms';
import { normalizePhoneNumber } from '@/lib/sms/twilio-service';
import { prisma } from '@/lib/prisma';
import type { TwilioIncomingMessage } from '@/lib/sms';

/**
 * Check if a phone number is authorized to use the SMS assistant
 */
async function isAuthorizedPhoneNumber(phoneNumber: string): Promise<boolean> {
  // Check if authorization is disabled in development
  if (process.env.SKIP_SMS_AUTH === 'true') {
    return true;
  }

  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'adminPhoneNumbers' },
    });

    if (!setting || !setting.value.trim()) {
      // If no numbers are configured, allow all (for initial setup)
      return true;
    }

    // Parse and normalize configured phone numbers
    const authorizedNumbers = setting.value
      .split(',')
      .map((num) => normalizePhoneNumber(num.trim()))
      .filter((num) => num.length > 0);

    // Normalize the incoming phone number for comparison
    const normalizedIncoming = normalizePhoneNumber(phoneNumber);

    return authorizedNumbers.includes(normalizedIncoming);
  } catch (error) {
    console.error('Error checking phone authorization:', error);
    // On error, allow the message (fail open for reliability)
    return true;
  }
}

// Twilio sends form-urlencoded data
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse form data from Twilio
    const formData = await request.formData();
    
    // Extract Twilio webhook data
    const webhookData: TwilioIncomingMessage = {
      MessageSid: formData.get('MessageSid') as string,
      AccountSid: formData.get('AccountSid') as string,
      From: formData.get('From') as string,
      To: formData.get('To') as string,
      Body: formData.get('Body') as string,
      NumMedia: formData.get('NumMedia') as string || '0',
      NumSegments: formData.get('NumSegments') as string || '1',
    };

    // Validate required fields
    if (!webhookData.Body || !webhookData.From) {
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Invalid request</Message></Response>',
        {
          status: 400,
          headers: { 'Content-Type': 'text/xml' },
        }
      );
    }

    // Validate Twilio signature (skip in development or if SKIP_TWILIO_VALIDATION is set)
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const skipValidation = process.env.SKIP_TWILIO_VALIDATION === 'true' || process.env.NODE_ENV === 'development';

    if (authToken && !skipValidation) {
      const signature = request.headers.get('x-twilio-signature') || '';
      const url = request.url;

      // Convert FormData to params object for validation
      const params: Record<string, string> = {};
      formData.forEach((value, key) => {
        params[key] = value.toString();
      });

      const isValid = validateTwilioSignature(signature, url, params, authToken);
      if (!isValid) {
        console.warn('Invalid Twilio signature - URL:', url);
        return new NextResponse('Unauthorized', { status: 401 });
      }
    }

    // Check if phone number is authorized
    const isAuthorized = await isAuthorizedPhoneNumber(webhookData.From);
    if (!isAuthorized) {
      console.warn('Unauthorized phone number attempted SMS:', webhookData.From);
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, this phone number is not authorized to use the SMS assistant. Contact the admin to add your number.</Message></Response>',
        {
          status: 200, // Still return 200 to Twilio to send the message
          headers: { 'Content-Type': 'text/xml' },
        }
      );
    }

    // Process the message
    const twimlResponse = await processTwilioWebhook(webhookData);

    // Return TwiML response
    return new NextResponse(twimlResponse, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error) {
    console.error('SMS webhook error:', error);

    // Return error response in TwiML format
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, something went wrong. Please try again.</Message></Response>',
      {
        status: 500,
        headers: { 'Content-Type': 'text/xml' },
      }
    );
  }
}

// Twilio may send GET requests for verification
export async function GET(): Promise<NextResponse> {
  return new NextResponse('SMS webhook is active', { status: 200 });
}
