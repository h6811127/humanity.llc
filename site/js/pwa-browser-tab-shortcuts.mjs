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
    if (row && "hidden" in row) {
      row.hidden = true;
    }
  }
}

export function initBrowserTabOnlyShortcutsVisibility() {
  if (!shouldHideBrowserTabOnlyShortcuts(readStandaloneModeFromWindow(window))) {
    return;
  }
  hideBrowserTabOnlyShortcutRows(document);
}
