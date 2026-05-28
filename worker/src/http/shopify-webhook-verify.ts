/**
 * Shopify webhook HMAC verification (O-001).
 * @see https://shopify.dev/docs/apps/build/webhooks/subscribe/https#step-5-verify-the-webhook
 */

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function bytesToBase64(bytes: ArrayBuffer): string {
  const bin = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(bin);
}

async function hmacSha256Base64(secret: string, message: string): Promise<string> {
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
  return bytesToBase64(sig);
}

export type ShopifyWebhookVerifyError =
  | "missing_header"
  | "invalid_signature";

/**
 * @returns null when valid; error code when invalid.
 */
export async function verifyShopifyWebhookHmac(
  payload: string,
  hmacHeader: string | null,
  secret: string
): Promise<ShopifyWebhookVerifyError | null> {
  if (!secret.trim()) return "invalid_signature";
  if (!hmacHeader?.trim()) return "missing_header";
  const expected = await hmacSha256Base64(secret, payload);
  return timingSafeEqual(expected, hmacHeader.trim()) ? null : "invalid_signature";
}
