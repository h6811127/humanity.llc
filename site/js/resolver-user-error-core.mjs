/**
 * Plain-language resolver errors for UI (P1-4). URLs belong in console only.
 */

/**
 * @param {string | null | undefined} raw
 */
export function stripResolverUrlsFromMessage(raw) {
  const stripped = String(raw || "")
    .replace(/\s*\(https?:\/\/[^)]+\)/gi, "")
    .replace(/\s*\([^)]*\.well-known\/[^)]*\)/gi, "")
    .replace(/^\s*https?:\/\/\S+/gi, "")
    .replace(/\s+https?:\/\/\S+/gi, "")
    .trim();
  if (/^https?:\/\/\S+$/i.test(stripped)) return "";
  return stripped;
}

/**
 * @param {string} requestUrl
 * @param {{ status?: number, error?: string, message?: string }} [detail]
 */
export function logResolverRequestFailure(requestUrl, detail = {}) {
  if (typeof console === "undefined" || !console.warn) return;
  console.warn("[resolver]", requestUrl, detail);
}

/**
 * @param {string | { message?: string, error?: string }} payload
 * @param {{ status?: number, fallback?: string, requestUrl?: string }} [options]
 */
export function resolverErrorMessage(payload, options = {}) {
  const { status, fallback, requestUrl } = options;
  const raw =
    typeof payload === "string"
      ? payload
      : String(payload?.message || payload?.error || "").trim();
  if (requestUrl) {
    logResolverRequestFailure(requestUrl, {
      status,
      error: typeof payload === "object" ? payload?.error : undefined,
      message: raw,
    });
  }
  const stripped = stripResolverUrlsFromMessage(raw);
  if (stripped) return stripped;
  if (typeof status === "number" && status >= 500) {
    return "Could not reach the resolver. Try again in a moment.";
  }
  return fallback || "Something went wrong. Try again.";
}
