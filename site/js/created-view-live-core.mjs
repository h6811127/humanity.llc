/**
 * View-mode Live tab rules (OWNERSHIP_RESTORE Phase 3).
 * @see docs/OWNERSHIP_RESTORE_UX_PLAN.md
 */

/** Sections hidden on Live when keys are not in this tab. */
export const CREATED_VIEW_LIVE_SIGNING_ONLY_IDS = [
  "created-live-primary-block",
  "created-live-scanners-see",
  "created-custody-disclosure",
  "created-scanners-see-gate-hint",
  "created-live-setup-memory-wrap",
];

/** Urgent live-proof strip (signing required). */
export const CREATED_VIEW_LIVE_PROOF_ID = "live-control-proof";

/**
 * @param {string | null | undefined} restoreHashKey from `createdViewRestoreHashKey`
 * @returns {"now" | "advanced"}
 */
export function createdViewDefaultTabId(restoreHashKey) {
  return restoreHashKey ? "advanced" : "now";
}
