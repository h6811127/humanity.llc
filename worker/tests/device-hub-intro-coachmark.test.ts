import { describe, expect, it } from "vitest";

import {
  HUB_INTRO_STORAGE_KEY,
  shouldShowHubIntro,
} from "../../site/js/device-hub-intro-coachmark.mjs";

describe("device hub intro coachmark", () => {
  it("shows only on hub shell pages for first-time visitors", () => {
    expect(
      shouldShowHubIntro({
        hasHub: true,
        isWalletPage: false,
        statusLoadError: false,
        hubSheetOpen: false,
        inboxOpen: false,
        dismissed: false,
      })
    ).toBe(true);
  });

  it("skips wallet, load errors, open hub, and dismissed state", () => {
    expect(
      shouldShowHubIntro({
        hasHub: true,
        isWalletPage: true,
        dismissed: false,
      })
    ).toBe(false);
    expect(
      shouldShowHubIntro({
        hasHub: true,
        statusLoadError: true,
        dismissed: false,
      })
    ).toBe(false);
    expect(
      shouldShowHubIntro({
        hasHub: true,
        hubSheetOpen: true,
        dismissed: false,
      })
    ).toBe(false);
    expect(
      shouldShowHubIntro({
        hasHub: false,
        dismissed: false,
      })
    ).toBe(false);
    expect(
      shouldShowHubIntro({
        hasHub: true,
        dismissed: true,
      })
    ).toBe(false);
  });

  it("uses a stable localStorage key", () => {
    expect(HUB_INTRO_STORAGE_KEY).toBe("hc_device_hub_intro_dismissed");
  });
});
