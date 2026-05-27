import { describe, expect, it, beforeEach } from "vitest";

import {
  getResolverHealthStatus,
  getWalletStatusPollHealth,
  setResolverHealthStatusForSinceVisit,
  setWalletStatusPollHealthForSinceVisit,
  shouldSuppressCardDisabledSinceVisitAlerts,
} from "../../site/js/device-wallet-since-visit-gate.mjs";
import {
  getLiveControlPollHealth,
  setLiveControlPollHealth,
} from "../../site/js/device-live-control-inbox-core.mjs";

describe("getResolverHealthStatus", () => {
  it("returns the last resolver health written for since-visit gating", () => {
    setResolverHealthStatusForSinceVisit("degraded");
    expect(getResolverHealthStatus()).toBe("degraded");
    setResolverHealthStatusForSinceVisit("ok");
    expect(getResolverHealthStatus()).toBe("ok");
  });
});

describe("shouldSuppressCardDisabledSinceVisitAlerts", () => {
  beforeEach(() => {
    setResolverHealthStatusForSinceVisit("ok");
    setWalletStatusPollHealthForSinceVisit("ok");
    setLiveControlPollHealth("ok");
  });

  it("suppresses when resolver health is degraded", () => {
    setResolverHealthStatusForSinceVisit("degraded");
    expect(shouldSuppressCardDisabledSinceVisitAlerts()).toBe(true);
  });

  it("suppresses when live-proof poll health is offline", () => {
    setLiveControlPollHealth("offline");
    expect(shouldSuppressCardDisabledSinceVisitAlerts()).toBe(true);
  });

  it("suppresses when wallet status poll health is degraded (G4)", () => {
    setWalletStatusPollHealthForSinceVisit("degraded");
    expect(getWalletStatusPollHealth()).toBe("degraded");
    expect(shouldSuppressCardDisabledSinceVisitAlerts()).toBe(true);
  });

  it("allows when resolver and live-proof health are ok", () => {
    expect(shouldSuppressCardDisabledSinceVisitAlerts()).toBe(false);
  });
});
