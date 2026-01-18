/**
 * SMS Webhook API Route
 * Handles incoming SMS messages from Twilio
 */

import { NextRequest, NextResponse } from 'next/server';
import { processTwilioWebhook, validateTwilioSignature } from '@/lib/sms';
import type { TwilioIncomingMessage } from '@/lib/sms';

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
