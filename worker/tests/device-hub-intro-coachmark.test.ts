import { describe, expect, it } from "vitest";

import {
  HUB_INTRO_STORAGE_KEY,
  HUB_INTRO_SEEN_STORAGE_KEY,
  shouldShowHubIntro,
} from "../../site/js/device-hub-intro-coachmark-core.mjs";

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
        seen: false,
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
        seen: true,
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
    expect(HUB_INTRO_SEEN_STORAGE_KEY).toBe("hc_device_hub_intro_seen");
  });

  it("ships stranger-first coachmark copy constant", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const copySrc = fs.readFileSync(
      path.join(process.cwd(), "site/js/device-ownership-copy-core.mjs"),
      "utf8"
    );
    const coachmarkSrc = fs.readFileSync(
      path.join(process.cwd(), "site/js/device-hub-intro-coachmark.mjs"),
      "utf8"
    );
    expect(copySrc).toContain("HUB_INTRO_BODY_STRANGER");
    expect(copySrc).toContain("Create a live object first");
    expect(coachmarkSrc).toContain("HUB_INTRO_BODY_STRANGER");
    expect(coachmarkSrc).toContain("hubIntroUsesStrangerCopy");
  });
});
