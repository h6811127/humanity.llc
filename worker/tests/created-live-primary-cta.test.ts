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

  it("prompts save when keys are in tab but not on device", () => {
    expect(
      resolveCreatedLivePrimaryCta({ ...base, walletSaved: false }).mode
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
});
