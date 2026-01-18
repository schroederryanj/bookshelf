function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("Missing required environment variable: SESSION_SECRET");
  }
  return secret;
}

// Convert string to ArrayBuffer for Web Crypto API
function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(str).buffer as ArrayBuffer;
}

// Convert ArrayBuffer to hex string
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Create HMAC signature using Web Crypto API (works in Edge Runtime)
async function createHmacSignature(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    stringToArrayBuffer(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    stringToArrayBuffer(data)
  );
  return bufferToHex(signature);
}

// Verify HMAC signature
async function verifyHmacSignature(
  data: string,
  signature: string
): Promise<boolean> {
  const expectedSignature = await createHmacSignature(data);
  // Constant-time comparison
  if (expectedSignature.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < expectedSignature.length; i++) {
    result |= expectedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}

export async function createSessionToken(): Promise<string> {
  const timestamp = Date.now();
  const data = `${timestamp}`;
  const signature = await createHmacSignature(data);
  return `${timestamp}.${signature}`;
}

export async function verifySession(token: string): Promise<boolean> {
  const [timestamp, signature] = token.split(".");
  if (!timestamp || !signature) return false;

  // Check if session is expired (24 hours)
  const age = Date.now() - parseInt(timestamp);
  if (age > 24 * 60 * 60 * 1000) return false;

  // Verify signature
  return verifyHmacSignature(timestamp, signature);
}

// Constant-time string comparison to prevent timing attacks
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do the comparison to maintain constant time
    b = a;
  }
  let result = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function verifyPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error("Missing required environment variable: ADMIN_PASSWORD");
  }
  return constantTimeEqual(password, adminPassword);
}
