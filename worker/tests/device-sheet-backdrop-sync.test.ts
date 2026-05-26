import { describe, expect, it } from "vitest";

import { syncSheetBackdropClosed } from "../../site/js/device-sheet-backdrop-sync.mjs";

describe("syncSheetBackdropClosed", () => {
  it("sets hidden, removes is-visible, and marks aria-hidden", () => {
    const backdrop = {
      hidden: false,
      classList: {
        removed: /** @type {string[]} */ ([]),
        remove(cls) {
          this.removed.push(cls);
        },
      },
      attributes: /** @type {Record<string, string>} */ ({}),
      setAttribute(name, value) {
        this.attributes[name] = value;
      },
    };

    syncSheetBackdropClosed(/** @type {HTMLElement} */ (backdrop));

    expect(backdrop.hidden).toBe(true);
    expect(backdrop.classList.removed).toContain("is-visible");
    expect(backdrop.attributes["aria-hidden"]).toBe("true");
  });

  it("no-ops when backdrop is missing", () => {
    expect(() => syncSheetBackdropClosed(null)).not.toThrow();
  });
});
