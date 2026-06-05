/** Keep in sync with worker/src/validation/handle.ts (Technical Standards v1.0 §6.2). */
export const CREATE_HANDLE_REGEX = /^[a-z][a-z0-9_]{2,31}$/;

export const CREATE_HANDLE_INVALID_MESSAGE =
  "Handle must be 3 to 32 characters: start with a lowercase letter, then letters, digits, or underscores.";

const RESERVED_HANDLES = new Set([
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

/**
 * @param {string} handle
 * @returns {{ ok: true, normalized: string } | { ok: false, message: string }}
 */
export function validateCreateHandle(handle) {
  const normalized = String(handle || "").trim().toLowerCase();
  if (!normalized) {
    return { ok: false, message: "Handle is required." };
  }
  if (!CREATE_HANDLE_REGEX.test(normalized)) {
    return { ok: false, message: CREATE_HANDLE_INVALID_MESSAGE };
  }
  if (RESERVED_HANDLES.has(normalized)) {
    return { ok: false, message: "Handle is reserved. Choose a different handle." };
  }
  return { ok: true, normalized };
}
