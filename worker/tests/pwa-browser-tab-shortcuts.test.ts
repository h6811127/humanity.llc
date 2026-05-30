import { describe, expect, it } from "vitest";

import {
  BROWSER_TAB_ONLY_SHORTCUT_BUTTON_IDS,
  shouldHideBrowserTabOnlyShortcuts,
} from "../../site/js/pwa-standalone-refresh-core.mjs";
import { hideBrowserTabOnlyShortcutRows } from "../../site/js/pwa-browser-tab-shortcuts.mjs";

describe("shouldHideBrowserTabOnlyShortcuts", () => {
  it("hides in standalone", () => {
    expect(shouldHideBrowserTabOnlyShortcuts(true)).toBe(true);
  });

  it("shows in browser tab", () => {
    expect(shouldHideBrowserTabOnlyShortcuts(false)).toBe(false);
  });
});

describe("BROWSER_TAB_ONLY_SHORTCUT_BUTTON_IDS", () => {
  it("lists resolver sync, refresh all tabs, and quiet rehydrate toggles", () => {
    expect(BROWSER_TAB_ONLY_SHORTCUT_BUTTON_IDS).toEqual([
      "device-resolver-sync-toggle",
      "device-resolver-refresh-all-tabs",
      "device-quiet-tab-rehydrate-toggle",
    ]);
  });
});

describe("hideBrowserTabOnlyShortcutRows", () => {
  it("hides list-row parents for each shortcut button", () => {
    /** @type {Record<string, { hidden: boolean; id: string; style: { display: string } }>} */
    const rows = {};
    const doc = {
      getElementById(id: string) {
        return {
          closest(selector: string) {
            if (selector !== "li.list-row") return null;
            if (!rows[id]) {
              rows[id] = { hidden: false, id: `row-${id}`, style: { display: "" } };
            }
            return rows[id];
          },
        };
      },
    };

    hideBrowserTabOnlyShortcutRows(/** @type {Document} */ (doc));

    for (const id of BROWSER_TAB_ONLY_SHORTCUT_BUTTON_IDS) {
      expect(rows[id]).toMatchObject({ hidden: true, id: `row-${id}` });
      expect(rows[id].style.display).toBe("none");
    }
  });

  it("ignores missing buttons", () => {
    const doc = { getElementById: () => null };
    expect(() =>
      hideBrowserTabOnlyShortcutRows(/** @type {Document} */ (doc))
    ).not.toThrow();
  });
});
