import { describe, expect, it } from "vitest";

import {
  scanCrossTabOverlayCount,
  scanPageDotEligible,
  shouldScanNoneEligibleAttentionPulse,
} from "../../site/js/scan-page-dot-core.mjs";

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

describe("shouldScanNoneEligibleAttentionPulse", () => {
  it("pulses only when transitioning into ok+none", () => {
    expect(
      shouldScanNoneEligibleAttentionPulse({
        previousKey: null,
        nextKey: "ok:none:none",
      })
    ).toBe(true);
    expect(
      shouldScanNoneEligibleAttentionPulse({
        previousKey: "ok:steward:none",
        nextKey: "ok:none:cross_tab_keys",
      })
    ).toBe(true);
    expect(
      shouldScanNoneEligibleAttentionPulse({
        previousKey: "ok:none:none",
        nextKey: "ok:none:none",
      })
    ).toBe(false);
    expect(
      shouldScanNoneEligibleAttentionPulse({
        previousKey: "ok:none:cross_tab_keys",
        nextKey: "ok:none:none",
      })
    ).toBe(false);
    expect(
      shouldScanNoneEligibleAttentionPulse({
        previousKey: "ok:keys:none",
        nextKey: "ok:steward:none",
        reducedMotion: true,
      })
    ).toBe(false);
  });
});

describe("scanCrossTabOverlayCount", () => {
  it("matches scan banner: no overlay when keys are in this tab", () => {
    expect(
      scanCrossTabOverlayCount({ show: true, entries: [{ tabId: "a" }] }, true)
    ).toBe(0);
    expect(
      scanCrossTabOverlayCount({ show: true, entries: [{ tabId: "a" }] }, false)
    ).toBe(1);
    expect(scanCrossTabOverlayCount({ show: false, entries: [] }, false)).toBe(0);
  });
});
