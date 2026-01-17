const SESSION_SECRET = process.env.SESSION_SECRET || "default-secret-change-me";

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
    stringToArrayBuffer(SESSION_SECRET),
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

export function verifyPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  return password === adminPassword;
}
