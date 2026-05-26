import { describe, expect, it } from "vitest";

import { scanPageDotEligible } from "../../site/js/scan-page-dot-core.mjs";

describe("scanPageDotEligible", () => {
  const base = {
    profileId: "PROFILE",
    qrId: "QR",
    hasCreatedKeys: false,
    savedWalletCount: 0,
    hasDefaultVouchProfile: false,
    crossTabNotice: 0,
    liveProofPending: 0,
  };

  it("requires active scan profile and qr", () => {
    expect(scanPageDotEligible({ ...base, profileId: null })).toBe(false);
    expect(scanPageDotEligible({ ...base, qrId: null })).toBe(false);
    expect(scanPageDotEligible(base)).toBe(false);
  });

  it("enables dynamic dot when viewer may sign", () => {
    expect(scanPageDotEligible({ ...base, hasCreatedKeys: true })).toBe(true);
    expect(scanPageDotEligible({ ...base, savedWalletCount: 1 })).toBe(true);
    expect(scanPageDotEligible({ ...base, hasDefaultVouchProfile: true })).toBe(
      true
    );
    expect(scanPageDotEligible({ ...base, crossTabNotice: 1 })).toBe(true);
    expect(scanPageDotEligible({ ...base, liveProofPending: 1 })).toBe(true);
  });
});
