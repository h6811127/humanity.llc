import { describe, expect, it, beforeEach } from "vitest";

import {
  setResolverHealthStatusForSinceVisit,
  shouldSuppressCardDisabledSinceVisitAlerts,
} from "../../site/js/device-wallet-since-visit-gate.mjs";

import {
  getLiveControlPollHealth,
  setLiveControlPollHealth,
} from "../../site/js/device-live-control-inbox-core.mjs";

describe("shouldSuppressCardDisabledSinceVisitAlerts", () => {
  beforeEach(() => {
    setResolverHealthStatusForSinceVisit("ok");
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

  it("allows when resolver and live-proof health are ok", () => {
    expect(shouldSuppressCardDisabledSinceVisitAlerts()).toBe(false);
  });
});
