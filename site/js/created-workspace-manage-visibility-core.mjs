/**
 * Setup-mode Manage tab discoverability (RC-13).
 * @see docs/SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md RC-13
 */

/** @typedef {"setup" | "control" | "view"} CreatedMode */

/**
 * Show setup hint that Manage unlocks after Open card controls.
 * @param {CreatedMode | string} mode
 */
export function setupManageTabHintVisible(mode) {
  return mode === "setup";
}
