/**
 * View-mode workspace rules for /created/ (Phase 1 restore UX).
 * @see docs/OWNERSHIP_RESTORE_UX_PLAN.md
 */

/** Manage tab hash targets that should open the advanced panel. */
export const CREATED_VIEW_RESTORE_HASH_KEYS = new Set([
  "recovery",
  "backup",
  "restore",
  "advanced",
]);

/**
 * @param {string} [hash] location.hash or bare key
 */
export function createdViewRestoreHashKey(hash = "") {
  const key = hash.replace(/^#/, "").trim();
  return CREATED_VIEW_RESTORE_HASH_KEYS.has(key) ? key : null;
}

/**
 * @param {string} mode
 */
export function createdControlRootVisibleForMode(mode) {
  return mode === "control" || mode === "view";
}
