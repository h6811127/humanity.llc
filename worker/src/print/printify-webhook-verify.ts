/**
 * Printify webhook HMAC verification (O-003).
 * @see https://developers.printify.com/#securing-your-webhooks
 */

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
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
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type PrintifyWebhookVerifyError =
  | "missing_header"
  | "invalid_signature";

/**
 * @returns null when valid; error code when invalid.
 */
export async function verifyPrintifyWebhookSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string
): Promise<PrintifyWebhookVerifyError | null> {
  if (!secret.trim()) return "invalid_signature";
  if (!signatureHeader?.trim()) return "missing_header";
  const expected = `sha256=${await hmacSha256Hex(secret, payload)}`;
  return timingSafeEqual(expected, signatureHeader.trim()) ? null : "invalid_signature";
}
