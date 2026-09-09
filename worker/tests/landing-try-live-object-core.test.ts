import { describe, expect, it } from "vitest";

import {
  LANDING_TRY_LIVE_OBJECT_TITLE,
  resolveLandingTryLiveObject,
  shouldShowLandingTryLiveObjectQr,
} from "../../site/js/landing-try-live-object-core.mjs";

describe("landing-try-live-object-core", () => {
  it("resolves a valid showcase pointer", () => {
    const resolved = resolveLandingTryLiveObject({
      profile_id: "abc",
      qr_id: "qr_1",
      label: "Studio door",
      scan_url: "https://humanity.llc/c/abc?q=qr_1",
    });
    expect(resolved?.scanUrl).toContain("/c/abc");
    expect(resolved?.label).toBe("Studio door");
    expect(LANDING_TRY_LIVE_OBJECT_TITLE).toBe("Try a live object");
  });

  it("rejects incomplete or unsafe pointers", () => {
    expect(resolveLandingTryLiveObject(null)).toBeNull();
    expect(resolveLandingTryLiveObject({ profile_id: "x" })).toBeNull();
    expect(
      resolveLandingTryLiveObject({
        profile_id: "x",
        scan_url: "javascript:alert(1)",
      })
    ).toBeNull();
  });

  it("shows QR only on fine-pointer wide viewports", () => {
    expect(
      shouldShowLandingTryLiveObjectQr({
        matchMedia: () => ({ matches: true }),
      })
    ).toBe(true);
    expect(
      shouldShowLandingTryLiveObjectQr({
        matchMedia: () => ({ matches: false }),
      })
    ).toBe(false);
    expect(shouldShowLandingTryLiveObjectQr(null)).toBe(false);
  });
});
