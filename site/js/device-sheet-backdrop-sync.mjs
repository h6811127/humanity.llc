/**
 * Shared backdrop + lifecycle reconcile for hub and inbox sheets.
 * @see docs/UI_UX_SAFE_REBUILD_IMPLEMENTATION.md - Step 1
 * @see docs/UI_UX_REVERTED_FEATURES_CATALOG.md §8
 */

/**
 * Force a sheet backdrop into the closed, non-interactive state.
 * @param {{ hidden?: boolean, classList?: { remove: (cls: string) => void }, setAttribute?: (name: string, value: string) => void } | null | undefined} backdrop
 */
export function syncSheetBackdropClosed(backdrop) {
  if (!backdrop) return;
  backdrop.hidden = true;
  backdrop.classList?.remove("is-visible");
  backdrop.setAttribute?.("aria-hidden", "true");
}

/**
 * Inbox backdrop (z-index 56) sits above the hub sheet (55) and wallet chrome.
 * When the inbox is closed, a stuck inbox backdrop swallows taps — including Check network.
 * Safe to call synchronously before lazy inbox module load finishes closing the sheet.
 *
 * @param {Pick<Document, "getElementById"> & { body?: { classList?: { contains: (c: string) => boolean } } }} [doc]
 */
export function syncInboxBackdropForOpenHub(doc = document) {
  if (!doc?.getElementById) return;
  const inboxBackdrop = doc.getElementById("device-inbox-backdrop");
  if (!inboxBackdrop) return;

  if (doc.body?.classList?.contains("device-inbox-sheet-open") === true) return;

  const sheet = doc.getElementById("device-inbox-sheet");
  const sheetExpanded =
    sheet &&
    typeof sheet.classList?.contains === "function" &&
    !sheet.classList.contains("device-inbox-sheet--collapsed");
  if (sheetExpanded) return;

  syncSheetBackdropClosed(inboxBackdrop);
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
