/**
 * Pure rules for document scroll chrome (Vitest-covered).
 * @see docs/SAFARI_WEBKIT_SHELL_REGRESSION_INVESTIGATION.md
 */

/**
 * Document scroll-edge chrome (edge-hidden + shell-is-scrolling) runs only on
 * fine-pointer desktop. Touch / iOS skips it — hub-inner scroll stays smooth
 * while landing document scroll was laggy because hub open sets body overflow:hidden.
 *
 * @returns {boolean}
 */
export function shouldAttachDocumentScrollChromeEffects() {
  if (typeof matchMedia !== "function") return false;
  return matchMedia("(pointer: fine)").matches && matchMedia("(hover: hover)").matches;
}
