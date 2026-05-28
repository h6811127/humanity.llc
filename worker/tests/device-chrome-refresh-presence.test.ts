import { describe, expect, it } from "vitest";

import {
  PRESENCE_CHROME_DEBOUNCE_MS,
  presenceChromeFingerprint,
  shouldSkipPresenceChromeRefresh,
} from "../../site/js/device-chrome-refresh-core.mjs";

describe("presenceChromeFingerprint", () => {
  it("changes when cross-tab counts change", () => {
    const a = presenceChromeFingerprint({ tabNotice: 0, genericCount: 1, orphanCount: 0 });
    const b = presenceChromeFingerprint({ tabNotice: 0, genericCount: 2, orphanCount: 0 });
    expect(a).not.toBe(b);
  });
});

describe("shouldSkipPresenceChromeRefresh", () => {
  it("skips when fingerprint unchanged", () => {
    const fp = presenceChromeFingerprint({ tabNotice: 1, genericCount: 2, orphanCount: 0 });
    expect(shouldSkipPresenceChromeRefresh(fp, fp)).toBe(true);
  });

  it("does not skip on first paint or count change", () => {
    expect(shouldSkipPresenceChromeRefresh("", "0|1|0")).toBe(false);
    expect(
      shouldSkipPresenceChromeRefresh(
        presenceChromeFingerprint({ tabNotice: 0, genericCount: 1, orphanCount: 0 }),
        presenceChromeFingerprint({ tabNotice: 0, genericCount: 2, orphanCount: 0 })
      )
    ).toBe(false);
  });
});

describe("PRESENCE_CHROME_DEBOUNCE_MS", () => {
  it("debounces longer than coordinator default", () => {
    expect(PRESENCE_CHROME_DEBOUNCE_MS).toBeGreaterThanOrEqual(1000);
  });
});
