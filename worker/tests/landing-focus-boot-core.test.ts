import { describe, expect, it } from "vitest";

import {
  hasLandingDeviceDataFromStorage,
  isLandingFocusModeFromStorage,
  landingFocusDatasetValue,
  LANDING_FOCUS_KEY,
} from "../../site/js/landing-focus-boot-core.mjs";

describe("landing-focus-boot-core", () => {
  it("respects explicit focus preference", () => {
    const storage = { [LANDING_FOCUS_KEY]: "1", hc_wallet: "[]" };
    expect(isLandingFocusModeFromStorage((key) => storage[key] ?? null)).toBe(true);
    storage[LANDING_FOCUS_KEY] = "0";
    storage.hc_wallet = JSON.stringify([{ profile_id: "abc" }]);
    expect(isLandingFocusModeFromStorage((key) => storage[key] ?? null)).toBe(false);
  });

  it("defaults focus on when wallet or pins exist", () => {
    expect(
      isLandingFocusModeFromStorage((key) =>
        key === "hc_wallet" ? JSON.stringify([{ profile_id: "abc" }]) : null
      )
    ).toBe(true);
    expect(
      isLandingFocusModeFromStorage((key) =>
        key === "hc_device_pins" ? JSON.stringify([{ label: "Pin" }]) : null
      )
    ).toBe(true);
    expect(isLandingFocusModeFromStorage(() => null)).toBe(false);
  });

  it("detects device data from storage", () => {
    expect(hasLandingDeviceDataFromStorage(() => null)).toBe(false);
    expect(
      hasLandingDeviceDataFromStorage((key) =>
        key === "hc_wallet" ? JSON.stringify([{ profile_id: "x" }]) : null
      )
    ).toBe(true);
  });

  it("maps focus state to html dataset values", () => {
    expect(landingFocusDatasetValue(true)).toBe("on");
    expect(landingFocusDatasetValue(false)).toBe("off");
  });
});
