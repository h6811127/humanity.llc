import { describe, expect, it } from "vitest";

import {
  shouldShowLegacyHubCrossTabChrome,
  shouldShowLegacyTabKeysHubNotice,
} from "../../site/js/device-legacy-cross-tab-chrome-core.mjs";

describe("shouldShowLegacyHubCrossTabChrome", () => {
  it("hides hub cross-tab slot when shell inbox badge is present", () => {
    expect(shouldShowLegacyHubCrossTabChrome(true, false)).toBe(false);
  });

  it("hides hub cross-tab slot when unified custody panel is mounted", () => {
    expect(shouldShowLegacyHubCrossTabChrome(false, true)).toBe(false);
  });

  it("shows on legacy pages without shell badge or custody panel", () => {
    expect(shouldShowLegacyHubCrossTabChrome(false, false)).toBe(true);
  });

  it("hides legacy hub cross-tab chrome in standalone PWA", () => {
    expect(shouldShowLegacyHubCrossTabChrome(false, false, true)).toBe(false);
  });
});

describe("shouldShowLegacyTabKeysHubNotice", () => {
  it("matches hub cross-tab demotion rules", () => {
    expect(shouldShowLegacyTabKeysHubNotice(true, false)).toBe(false);
    expect(shouldShowLegacyTabKeysHubNotice(false, true)).toBe(false);
    expect(shouldShowLegacyTabKeysHubNotice(false, false)).toBe(true);
  });

  it("hides legacy tab-keys notice in standalone PWA", () => {
    expect(shouldShowLegacyTabKeysHubNotice(false, false, true)).toBe(false);
  });
});
