/**
 * Hide browser-tab-only homepage shortcuts in standalone PWA.
 * @see docs/PWA_INSTALL.md § Browser context vs PWA context
 */
import {
  BROWSER_TAB_ONLY_SHORTCUT_BUTTON_IDS,
  readStandaloneModeFromWindow,
  shouldHideBrowserTabOnlyShortcuts,
} from "./pwa-standalone-refresh-core.mjs";

/**
 * @param {Document} doc
 */
export function hideBrowserTabOnlyShortcutRows(doc) {
  for (const id of BROWSER_TAB_ONLY_SHORTCUT_BUTTON_IDS) {
    const btn = doc.getElementById(id);
    const row = btn?.closest("li.list-row");
    if (!row || typeof row !== "object") continue;
    row.hidden = true;
    row.style.display = "none";
  }
}

/**
 * @param {Document} doc
 */
export function showBrowserTabOnlyShortcutRows(doc) {
  for (const id of BROWSER_TAB_ONLY_SHORTCUT_BUTTON_IDS) {
    const btn = doc.getElementById(id);
    const row = btn?.closest("li.list-row");
    if (!row || typeof row !== "object") continue;
    row.hidden = false;
    row.style.removeProperty("display");
  }
}

/**
 * @param {Document} doc
 * @param {boolean} standalone
 */
export function syncBrowserTabOnlyShortcutRows(doc, standalone) {
  if (shouldHideBrowserTabOnlyShortcuts(standalone)) {
    hideBrowserTabOnlyShortcutRows(doc);
  } else {
    showBrowserTabOnlyShortcutRows(doc);
  }
}

export function initBrowserTabOnlyShortcutsVisibility() {
  syncBrowserTabOnlyShortcutRows(
    document,
    readStandaloneModeFromWindow(window)
  );
}
