import { describe, expect, it } from "vitest";

import { resolveCreatedLivePrimaryCta } from "../../site/js/created-live-primary-cta-core.mjs";

describe("resolveCreatedLivePrimaryCta", () => {
  const base = {
    liveProofPending: false,
    hasSigningKeys: true,
    walletSaved: true,
    resolverReachable: true,
    testScanDone: true,
    scanUrlReady: true,
  };

  it("prioritizes live proof when a challenge is pending", () => {
    expect(
      resolveCreatedLivePrimaryCta({ ...base, liveProofPending: true }).mode
    ).toBe("prove-live");
  });

  it("prompts save when keys are in tab but not on device and auto-save is off", () => {
    expect(
      resolveCreatedLivePrimaryCta({
        ...base,
        walletSaved: false,
        autoSaveEnabled: false,
      }).mode
    ).toBe("save-keys");
  });

  it("skips save nudge during quiet auto-save happy path", () => {
    expect(
      resolveCreatedLivePrimaryCta({
        ...base,
        walletSaved: false,
        autoSaveEnabled: true,
        autoSaveFailed: false,
        testScanDone: false,
      }).mode
    ).toBe("test-scan");
  });

  it("prompts save when auto-save failed", () => {
    expect(
      resolveCreatedLivePrimaryCta({
        ...base,
        walletSaved: false,
        autoSaveEnabled: true,
        autoSaveFailed: true,
      }).mode
    ).toBe("save-keys");
  });

  it("surfaces check network when resolver is unreachable", () => {
    expect(
      resolveCreatedLivePrimaryCta({
        ...base,
        resolverReachable: false,
        testScanDone: false,
      }).mode
    ).toBe("check-network");
  });

  it("nudges test scan before default open scan", () => {
    expect(
      resolveCreatedLivePrimaryCta({ ...base, testScanDone: false }).mode
    ).toBe("test-scan");
  });

  it("defaults to open scan when healthy", () => {
    expect(resolveCreatedLivePrimaryCta(base).mode).toBe("open-scan");
  });

  it("view-only without tab keys uses open-scan when scan URL ready (no restore-control)", () => {
    const cta = resolveCreatedLivePrimaryCta({
      ...base,
      hasSigningKeys: false,
      walletSaved: true,
    });
    expect(cta.mode).toBe("open-scan");
  });

  it("does not offer prove-live when challenge pending but keys absent (sad-path S7)", () => {
    expect(
      resolveCreatedLivePrimaryCta({
        ...base,
        liveProofPending: true,
        hasSigningKeys: false,
        walletSaved: false,
      }).mode
    ).not.toBe("prove-live");
  });
});
