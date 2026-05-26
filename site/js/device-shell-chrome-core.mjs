/**
 * Pure rules for document scroll chrome (Vitest-covered).
 * @see docs/SAFARI_WEBKIT_SHELL_REGRESSION_INVESTIGATION.md
 */

/**
 * Scroll-edge chrome opt-in — `localStorage.hc_shell_scroll_chrome = "1"` then reload.
 * Default off (Phase 3A): document scroll listener caused landing jank on WebKit.
 */
export const SHELL_SCROLL_CHROME_STORAGE_KEY = "hc_shell_scroll_chrome";

/**
 * @returns {boolean}
 */
export function isShellScrollChromeOptInEnabled() {
  if (typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(SHELL_SCROLL_CHROME_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** @deprecated Use isShellScrollChromeOptInEnabled; scroll chrome is off unless `"1"`. */
export function isShellScrollChromeForceDisabled() {
  return !isShellScrollChromeOptInEnabled();
}

/**
 * Document scroll-edge chrome (edge-hidden + shell-is-scrolling). Off unless opt-in
 * on fine-pointer desktop. Touch always uses body.shell-scroll-chrome-off.
 *
 * @returns {boolean}
 */
export function shouldAttachDocumentScrollChromeEffects() {
  if (!isShellScrollChromeOptInEnabled()) return false;
  if (typeof matchMedia !== "function") return false;
  if (matchMedia("(pointer: coarse)").matches) return false;
  if (!matchMedia("(hover: hover)").matches) return false;
  return matchMedia("(pointer: fine)").matches;
}
