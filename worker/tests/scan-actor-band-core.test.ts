import { describe, expect, it } from "vitest";

import {
  SCAN_ACTOR_BAND_REVEAL_MS,
  scanActorBandEligible,
} from "../../site/js/scan-actor-band-core.mjs";

describe("scanActorBandEligible", () => {
  const base = {
    profileId: "PROFILE",
    qrId: "QR",
    scanActive: true,
    hasCreatedKeys: false,
    savedWalletCount: 0,
    hasDefaultVouchProfile: false,
  };

  it("requires active scan context", () => {
    expect(scanActorBandEligible({ ...base, scanActive: false })).toBe(false);
    expect(scanActorBandEligible({ ...base, profileId: null })).toBe(false);
    expect(scanActorBandEligible(base)).toBe(false);
  });

  it("enables band when viewer may act on device", () => {
    expect(scanActorBandEligible({ ...base, hasCreatedKeys: true })).toBe(true);
    expect(scanActorBandEligible({ ...base, savedWalletCount: 1 })).toBe(true);
    expect(scanActorBandEligible({ ...base, hasDefaultVouchProfile: true })).toBe(
      true
    );
  });
});

describe("SCAN_ACTOR_BAND_REVEAL_MS", () => {
  it("is a short post-settle delay", () => {
    expect(SCAN_ACTOR_BAND_REVEAL_MS).toBeGreaterThan(0);
    expect(SCAN_ACTOR_BAND_REVEAL_MS).toBeLessThan(500);
  });
});
