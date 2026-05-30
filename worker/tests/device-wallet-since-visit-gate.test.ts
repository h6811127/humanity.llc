import { describe, expect, it, beforeEach } from "vitest";

import {
  getLiveControlPollHealth,
  setLiveControlPollHealth,
} from "../../site/js/device-live-control-inbox-core.mjs";
import {
  resetWalletNetworkTruth,
  setWalletNetworkTruthFromPoll,
} from "../../site/js/device-wallet-network-truth.mjs";
import {
  RESOLVER_HEALTH_UNSET,
  shouldSuppressCardDisabledSinceVisitAlertsCore,
} from "../../site/js/device-wallet-since-visit-gate-core.mjs";
import {
  getResolverHealthStatus,
  getWalletStatusPollHealth,
  resetSinceVisitGateForTests,
  setResolverHealthStatusForSinceVisit,
  setWalletStatusPollHealthForSinceVisit,
  shouldSuppressCardDisabledSinceVisitAlerts,
} from "../../site/js/device-wallet-since-visit-gate.mjs";

describe("shouldSuppressCardDisabledSinceVisitAlertsCore", () => {
  it("suppresses when resolver health is unset (RC-11 boot)", () => {
    expect(
      shouldSuppressCardDisabledSinceVisitAlertsCore({
        resolverHealth: RESOLVER_HEALTH_UNSET,
        hasWalletNetworkPoll: true,
      })
    ).toBe(true);
  });

  it("suppresses when health is ok but no wallet poll yet (G5)", () => {
    expect(
      shouldSuppressCardDisabledSinceVisitAlertsCore({
        resolverHealth: "ok",
        walletStatusPollHealth: "ok",
        liveProofPollHealth: "ok",
        hasWalletNetworkPoll: false,
      })
    ).toBe(true);
  });

  it("suppresses when shell boot is pending (RC-11)", () => {
    expect(
      shouldSuppressCardDisabledSinceVisitAlertsCore({
        resolverHealth: "ok",
        walletStatusPollHealth: "ok",
        liveProofPollHealth: "ok",
        hasWalletNetworkPoll: true,
        shellBootReady: false,
      })
    ).toBe(true);
  });

  it("allows when health and wallet poll are ok", () => {
    expect(
      shouldSuppressCardDisabledSinceVisitAlertsCore({
        resolverHealth: "ok",
        walletStatusPollHealth: "ok",
        liveProofPollHealth: "ok",
        hasWalletNetworkPoll: true,
      })
    ).toBe(false);
  });
});

describe("getResolverHealthStatus", () => {
  beforeEach(() => resetSinceVisitGateForTests());

  it("starts unset before the first health fetch (RC-11)", () => {
    expect(getResolverHealthStatus()).toBe(RESOLVER_HEALTH_UNSET);
  });

  it("returns the last resolver health written for since-visit gating", () => {
    setResolverHealthStatusForSinceVisit("degraded");
    expect(getResolverHealthStatus()).toBe("degraded");
    setResolverHealthStatusForSinceVisit("ok");
    expect(getResolverHealthStatus()).toBe("ok");
  });
});

describe("shouldSuppressCardDisabledSinceVisitAlerts", () => {
  beforeEach(() => {
    resetSinceVisitGateForTests();
    resetWalletNetworkTruth();
    setResolverHealthStatusForSinceVisit("ok");
    setWalletStatusPollHealthForSinceVisit("ok");
    setLiveControlPollHealth("ok");
    setWalletNetworkTruthFromPoll("profile-a", {
      chipStatus: "active",
      scanKind: "active",
      alertState: "active",
    });
  });

  it("suppresses before resolver health is known", () => {
    resetSinceVisitGateForTests();
    expect(getResolverHealthStatus()).toBe(RESOLVER_HEALTH_UNSET);
    expect(shouldSuppressCardDisabledSinceVisitAlerts()).toBe(true);
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

  it("suppresses when health is ok but wallet poll has not completed (RC-11)", () => {
    resetWalletNetworkTruth();
    setResolverHealthStatusForSinceVisit("ok");
    expect(shouldSuppressCardDisabledSinceVisitAlerts()).toBe(true);
  });

  it("allows when resolver, live-proof, wallet poll health, and truth poll are ok", () => {
    expect(shouldSuppressCardDisabledSinceVisitAlerts()).toBe(false);
  });
});
