/**
 * Pure helpers for revoked-since-visit detection (testable without resolver imports).
 */

/**
 * @param {string | null | undefined} lastSeenStatus
 * @param {string | null | undefined} currentStatus
 */
export function isRevokedSinceLastVisitFromBaseline(lastSeenStatus, currentStatus) {
  const current = String(currentStatus || "").toLowerCase();
  if (current !== "revoked") return false;
  if (lastSeenStatus == null || lastSeenStatus === "") return false;
  const lastNorm = String(lastSeenStatus).toLowerCase();
  if (lastNorm === "revoked") return false;
  return true;
}
