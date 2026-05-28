/**
 * Pure helpers for steward server quota responses (hosted tier E3).
 * @see docs/HOSTED_TIER_ENTITLEMENTS_AND_METERING.md § 429 body
 */

/** When plan returns null device cap, client uses 4000/day until account fair-use. */
export const STEWARD_NULL_DEVICE_CAP_FALLBACK = 4000;

/** Must match worker/src/steward/quota.ts */
export const STEWARD_MANUAL_POLL_HEADER = "X-HC-Live-Proof-Manual";

/**
 * @param {unknown} body
 */
export function isStewardQuotaExceededBody(body) {
  return (
    body &&
    typeof body === "object" &&
    /** @type {Record<string, unknown>} */ (body).error === "steward_quota_exceeded"
  );
}

/**
 * @param {unknown} body
 * @returns {{ used: number, limit: number } | null}
 */
export function stewardQuotaUsageFromBody(body) {
  if (!isStewardQuotaExceededBody(body)) return null;
  const o = /** @type {Record<string, unknown>} */ (body);
  const usage =
    o.usage && typeof o.usage === "object"
      ? /** @type {Record<string, unknown>} */ (o.usage)
      : null;
  if (!usage) return null;
  const used =
    typeof usage["poll.live_proof.auto"] === "number"
      ? usage["poll.live_proof.auto"]
      : typeof usage.limit === "number"
        ? usage.limit
        : null;
  const limit = typeof usage.limit === "number" ? usage.limit : used;
  if (used == null || limit == null) return null;
  return { used: Math.floor(used), limit: Math.floor(limit) };
}

export function stewardServerQuotaPausedMessage() {
  return "Operator daily automatic live proof limit reached — use Check for live proof or try again tomorrow.";
}
