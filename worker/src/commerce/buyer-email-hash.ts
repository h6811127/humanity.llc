/** Normalize buyer email and hash for order status lookup (no plaintext in D1). */

export function normalizeBuyerEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (!email || !email.includes("@")) return null;
  return email;
}

export async function hashBuyerEmail(email: string): Promise<string> {
  const normalized = normalizeBuyerEmail(email);
  if (!normalized) {
    throw new Error("Invalid email for hash.");
  }
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(normalized)
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
