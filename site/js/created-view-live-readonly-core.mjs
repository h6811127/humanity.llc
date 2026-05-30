/**
 * View-mode Live tab read-only QR/signage rules (Phase 3).
 * @see docs/OWNERSHIP_RESTORE_UX_PLAN.md
 */

/** @param {string} mode */
export function createdViewLiveQrTasksVisible(mode) {
  return mode === "view";
}
