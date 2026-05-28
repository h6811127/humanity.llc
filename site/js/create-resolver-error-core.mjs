import { CREATE_HANDLE_INVALID_MESSAGE } from "./create-handle-validation-core.mjs";
import {
  logResolverRequestFailure,
  stripResolverUrlsFromMessage,
} from "./resolver-user-error-core.mjs";

/**
 * Plain-language create POST errors (P1-4: no resolver URLs in UI).
 * @param {{ message?: string, error?: string }} payload
 * @param {number} status
 * @param {string} [requestUrl]
 */
export function formatCreateResolverError(payload, status, requestUrl) {
  const code = String(payload?.error || "").trim();
  const raw = String(payload?.message || payload?.error || "").trim();
  if (requestUrl) {
    logResolverRequestFailure(requestUrl, { status, error: code, message: raw });
  }
  const stripped = stripResolverUrlsFromMessage(raw);

  if (code === "HANDLE_TAKEN" || /already taken/i.test(stripped)) {
    return "Handle is already taken.";
  }
  if (/handle is reserved/i.test(stripped)) {
    return "Handle is reserved. Choose a different handle.";
  }
  if (/handle must be 3/i.test(stripped)) {
    return CREATE_HANDLE_INVALID_MESSAGE;
  }
  if (stripped) return stripped;
  if (status === 409) return "Handle is already taken.";
  if (status >= 500) return "Could not reach the resolver. Try again in a moment.";
  return "Could not create card. Check your handle and try again.";
}
