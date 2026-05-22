import { CRYPTO_ERROR, CryptoVerifyError } from "../crypto/errors";

/** Technical Standards v1.0.md §6.2 */
export const HANDLE_REGEX = /^[a-z][a-z0-9_]{2,31}$/;

export const RESERVED_HANDLES = new Set([
  "admin",
  "administrator",
  "host",
  "resolver",
  "system",
  "test",
  "example",
  "support",
  "help",
  "info",
  "root",
  "api",
  "www",
  "hc",
  "humanity",
  "commons",
  "profile",
  "profiles",
  "card",
  "cards",
  "qr",
  "resolve",
  "revoked",
  "suspended",
  "null",
  "undefined",
  "false",
  "true",
  "0",
  "1",
  "print",
  "orders",
  "shop",
  "verify",
  "verification",
  "governance",
  "constitution",
]);

export function normalizeHandle(handle: string): string {
  return handle.trim().toLowerCase();
}

export function validateHandle(handle: string): string {
  const normalized = normalizeHandle(handle);
  if (!HANDLE_REGEX.test(normalized)) {
    throw new CryptoVerifyError(
      CRYPTO_ERROR.MISSING_REQUIRED_FIELD,
      "Handle must be 3–32 chars: lowercase letter, then letters, digits, or underscores."
    );
  }
  if (RESERVED_HANDLES.has(normalized)) {
    throw new CryptoVerifyError(
      CRYPTO_ERROR.MISSING_REQUIRED_FIELD,
      "Handle is reserved."
    );
  }
  return normalized;
}
