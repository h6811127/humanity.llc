/**
 * Pure inbox sheet reconcile rules (Vitest-covered).
 * @see docs/DEVICE_INBOX.md phase 13 · docs/STATUS_INDICATOR_STEWARD_GREEN.md
 */

/**
 * @typedef {object} InboxSheetReconcileInput
 * @property {boolean} sheetCollapsed
 * @property {boolean} bodySheetOpen
 * @property {boolean} chromeInboxLocked
 * @property {boolean} sheetOpenFlag In-memory open flag (can desync from DOM after bfcache)
 * @property {boolean} backdropHidden
 * @property {boolean} backdropVisibleClass
 */

/**
 * When the inbox sheet is collapsed but body/chrome/backdrop still reflect open state.
 * @param {InboxSheetReconcileInput} input
 * @returns {'close_sheet' | 'hide_backdrop' | 'none'}
 */
export function inboxSheetReconcileAction(input) {
  if (!input.sheetCollapsed) return "none";
  if (input.bodySheetOpen || input.chromeInboxLocked || input.sheetOpenFlag) {
    return "close_sheet";
  }
  if (!input.backdropHidden || input.backdropVisibleClass) return "hide_backdrop";
  return "none";
}
