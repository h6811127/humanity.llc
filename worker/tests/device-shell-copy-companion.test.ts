import { describe, expect, it } from "vitest";

import {
  browserAlertBackgroundCopy,
  browserAlertWhileOpenCopy,
  companionBrowserLabel,
  crossTabAggregateTitle,
  dotOverlayCrossTabPhrase,
  keysInOtherContextEyebrow,
} from "../../site/js/device-shell-copy-core.mjs";

describe("companionBrowserLabel (P1-MOTO-08)", () => {
  it("uses Chrome on Android standalone PWA", () => {
    expect(
      companionBrowserLabel({
        standalone: true,
        userAgent: "Mozilla/5.0 (Linux; Android 13) Chrome/120.0 Mobile",
      })
    ).toBe("Chrome");
  });

  it("uses Safari on iOS standalone PWA", () => {
    expect(
      companionBrowserLabel({
        standalone: true,
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1",
      })
    ).toBe("Safari");
  });

  it("returns null in browser tab", () => {
    expect(companionBrowserLabel({ standalone: false, userAgent: "Chrome" })).toBeNull();
  });
});

describe("standalone notification copy uses companion browser", () => {
  it("cross-tab title names Chrome on Android PWA", () => {
    expect(crossTabAggregateTitle(1, "standalone", { companionBrowser: "Chrome" })).toBe(
      "Managing in Chrome"
    );
  });

  it("keys eyebrow names Chrome on Android PWA", () => {
    expect(keysInOtherContextEyebrow("standalone", { companionBrowser: "Chrome" })).toBe(
      "Keys in Chrome"
    );
  });

  it("dot overlay phrase names Chrome on Android PWA", () => {
    expect(dotOverlayCrossTabPhrase("standalone", { companionBrowser: "Chrome" })).toBe(
      "managing in Chrome"
    );
  });

  it("background alert opt-in names Chrome on Android PWA (P0-N4)", () => {
    expect(
      browserAlertBackgroundCopy(false, "standalone", { companionBrowser: "Chrome" })
    ).toContain("Chrome");
    expect(
      browserAlertBackgroundCopy(false, "standalone", { companionBrowser: "Chrome" })
    ).not.toMatch(/Safari/i);
  });

  it("while-open hint names foreground strip on Android PWA", () => {
    expect(browserAlertWhileOpenCopy("standalone", { companionBrowser: "Chrome" })).toMatch(
      /foreground strip/i
    );
  });
});
