/**
 * Pure rules for document scroll chrome (Vitest-covered).
 * @see docs/SAFARI_WEBKIT_SHELL_REGRESSION_INVESTIGATION.md
 */

/** Support kill switch — set `localStorage.hc_shell_scroll_chrome = "0"` and reload. */
export const SHELL_SCROLL_CHROME_STORAGE_KEY = "hc_shell_scroll_chrome";

/**
 * @returns {boolean}
 */
export function isShellScrollChromeForceDisabled() {
  if (typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(SHELL_SCROLL_CHROME_STORAGE_KEY) === "0";
  } catch {
    return false;
  }
}

/**
 * Document scroll-edge chrome (edge-hidden + shell-is-scrolling) runs only on
 * fine-pointer desktop. Touch / iOS skips it — hub-inner scroll stays smooth
 * while landing document scroll was laggy because hub open sets body overflow:hidden.
 *
 * @returns {boolean}
 */
export function shouldAttachDocumentScrollChromeEffects() {
  if (isShellScrollChromeForceDisabled()) return false;
  if (typeof matchMedia !== "function") return false;
  return matchMedia("(pointer: fine)").matches && matchMedia("(hover: hover)").matches;
}
