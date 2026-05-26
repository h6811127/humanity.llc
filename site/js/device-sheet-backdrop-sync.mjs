/**
 * Shared backdrop + lifecycle reconcile for hub and inbox sheets.
 * @see docs/SAFARI_WEBKIT_SHELL_REGRESSION_INVESTIGATION.md — Phase 1.4
 */

/**
 * Force a sheet backdrop into the closed, non-interactive state.
 * @param {HTMLElement | null | undefined} backdrop
 */
export function syncSheetBackdropClosed(backdrop) {
  if (!backdrop) return;
  backdrop.hidden = true;
  backdrop.classList.remove("is-visible");
  backdrop.setAttribute("aria-hidden", "true");
}

/**
 * Re-run reconcile when the tab may have restored stale sheet/backdrop classes.
 * @param {() => void} reconcile
 */
export function bindSheetLifecycleReconcile(reconcile) {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") reconcile();
  });

  window.addEventListener("focus", () => reconcile());

  window.addEventListener("pageshow", () => reconcile());
}
