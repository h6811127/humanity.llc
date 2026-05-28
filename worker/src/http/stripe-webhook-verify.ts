/**
 * Stripe webhook signature verification (E5.1).
 * @see https://docs.stripe.com/webhooks/signatures
 */

const DEFAULT_TOLERANCE_SEC = 300;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function hexEncode(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message)
  );
  return hexEncode(sig);
}

export interface StripeSignatureParts {
  timestamp: number;
  signatures: string[];
}

/** Parse `Stripe-Signature` header (t=...,v1=...). */
export function parseStripeSignatureHeader(
  header: string | null
): StripeSignatureParts | null {
  if (!header?.trim()) return null;
  let timestamp = 0;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [key, value] = part.split("=", 2);
    if (!key || !value) continue;
    const k = key.trim();
    const v = value.trim();
    if (k === "t") {
      const t = Number.parseInt(v, 10);
      if (Number.isFinite(t)) timestamp = t;
    } else if (k === "v1") {
      signatures.push(v);
    }
  }
  if (!timestamp || signatures.length === 0) return null;
  return { timestamp, signatures };
}

/**
 * @returns null when valid; error code when invalid.
 */
export async function verifyStripeWebhookSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string,
  toleranceSec = DEFAULT_TOLERANCE_SEC,
  nowSec = Math.floor(Date.now() / 1000)
): Promise<"missing_header" | "invalid_header" | "timestamp_skew" | "invalid_signature" | null> {
  if (!secret.trim()) return "invalid_signature";
  const parsed = parseStripeSignatureHeader(signatureHeader);
  if (!parsed) {
    return signatureHeader ? "invalid_header" : "missing_header";
  }
  if (Math.abs(nowSec - parsed.timestamp) > toleranceSec) {
    return "timestamp_skew";
  }
  const signedPayload = `${parsed.timestamp}.${payload}`;
  const expected = await hmacSha256Hex(secret, signedPayload);
  const match = parsed.signatures.some((sig) => timingSafeEqual(sig, expected));
  return match ? null : "invalid_signature";
}
