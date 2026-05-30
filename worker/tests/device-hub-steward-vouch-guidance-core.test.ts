import { describe, expect, it } from "vitest";

import {
  hubStewardVouchGuidanceVariant,
  shouldShowHubStewardVouchGuidance,
} from "../../site/js/device-hub-steward-vouch-guidance-core.mjs";

describe("shouldShowHubStewardVouchGuidance", () => {
  it("shows on iPhone when wallet has saved cards", () => {
    expect(
      shouldShowHubStewardVouchGuidance({
        isIosWebKit: true,
        standalone: true,
        walletCount: 1,
      })
    ).toBe(true);
    expect(
      shouldShowHubStewardVouchGuidance({
        isIosWebKit: true,
        standalone: false,
        walletCount: 2,
      })
    ).toBe(true);
  });

  it("hides off iOS or with empty wallet", () => {
    expect(
      shouldShowHubStewardVouchGuidance({
        isIosWebKit: false,
        standalone: true,
        walletCount: 1,
      })
    ).toBe(false);
    expect(
      shouldShowHubStewardVouchGuidance({
        isIosWebKit: true,
        standalone: true,
        walletCount: 0,
      })
    ).toBe(false);
  });
});

describe("hubStewardVouchGuidanceVariant", () => {
  it("selects PWA vs Safari copy", () => {
    expect(hubStewardVouchGuidanceVariant({ standalone: true })).toBe("pwa");
    expect(hubStewardVouchGuidanceVariant({ standalone: false })).toBe("safari");
  });
});
