/**
 * Hub / Live child-row hints for active delegated capabilities (step 17).
 * @see docs/DELEGATED_CHILD_CAPABILITY_SCHEMA.md § Steward UI
 */

import { delegatedCapabilityRowSummary } from "./created-delegated-capability-core.mjs";

/**
 * @param {Array<Record<string, unknown>>} capabilities
 * @param {number} [nowMs]
 * @returns {Map<string, string>}
 */
export function delegatedAccessHintsByObjectId(capabilities, nowMs = Date.now()) {
  /** @type {Map<string, string>} */
  const hints = new Map();
  if (!Array.isArray(capabilities)) return hints;

  for (const row of capabilities) {
    if (row.status !== "active") continue;
    const expiresAt = typeof row.expires_at === "string" ? row.expires_at : "";
    const expiresMs = Date.parse(expiresAt);
    if (Number.isFinite(expiresMs) && nowMs >= expiresMs) continue;

    const objectIds = Array.isArray(row.scope?.object_ids) ? row.scope.object_ids : [];
    const hint = delegatedCapabilityRowSummary(
      { status: "active", expires_at: expiresAt },
      nowMs
    );
    for (const objectId of objectIds) {
      if (typeof objectId === "string" && objectId.trim()) {
        hints.set(objectId.trim(), hint);
      }
    }
  }
  return hints;
}

/**
 * @param {Map<string, string> | null | undefined} hints
 * @param {string} objectId
 */
export function delegatedAccessHintForObject(hints, objectId) {
  if (!hints || !objectId) return null;
  return hints.get(objectId) ?? null;
}
