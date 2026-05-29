/**
 * When to surface session-only ownership warnings (D4).
 * @see docs/OWNERSHIP_AND_CONTROL_MODEL.md
 */

/**
 * @param {{
 *   hasTabControl?: boolean,
 *   savedOnDevice?: boolean,
 *   autoSaveEnabled?: boolean,
 *   autoSaveFailed?: boolean,
 * }} input
 */
export function shouldShowSessionOnlyOwnershipWarning(input) {
  const {
    hasTabControl = false,
    savedOnDevice = false,
    autoSaveEnabled = true,
    autoSaveFailed = false,
  } = input;
  if (!hasTabControl || savedOnDevice) return false;
  if (autoSaveEnabled && !autoSaveFailed) return false;
  return true;
}

/**
 * @param {{
 *   hasTabControl?: boolean,
 *   savedOnDevice?: boolean,
 *   autoSaveEnabled?: boolean,
 *   autoSaveFailed?: boolean,
 * }} input
 */
export function tabNoticeCountFromOwnershipState(input) {
  return shouldShowSessionOnlyOwnershipWarning(input) ? 1 : 0;
}

/**
 * Whether to show explicit save UI on /created/ (strip + manual save form).
 * @param {{
 *   savedOnDevice?: boolean,
 *   autoSaveEnabled?: boolean,
 *   autoSaveFailed?: boolean,
 * }} input
 */
export function shouldShowCreatedOwnershipSaveUi(input) {
  const {
    savedOnDevice = false,
    autoSaveEnabled = true,
    autoSaveFailed = false,
  } = input;
  if (savedOnDevice) return true;
  if (autoSaveEnabled && !autoSaveFailed) return false;
  return true;
}
