/**
 * Pure hub sheet reconcile rules (Vitest-covered).
 * @see docs/STATUS_INDICATOR_STEWARD_GREEN.md — Fix directions §2
 */

/**
 * @typedef {object} HubSheetReconcileInput
 * @property {boolean} hubCollapsed
 * @property {boolean} bodySheetOpen
 * @property {boolean} chromeHubLocked
 * @property {boolean} backdropHidden
 * @property {boolean} backdropVisibleClass
 */

/**
 * When the hub is collapsed but body/chrome/backdrop still reflect an open sheet.
 * @param {HubSheetReconcileInput} input
 * @returns {'close_sheet' | 'hide_backdrop' | 'none'}
 */
export function hubSheetReconcileAction(input) {
  if (!input.hubCollapsed) return "none";
  if (input.bodySheetOpen || input.chromeHubLocked) return "close_sheet";
  if (!input.backdropHidden || input.backdropVisibleClass) return "hide_backdrop";
  return "none";
}
