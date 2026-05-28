import { describe, expect, it } from "vitest";

import {
  REFERENCE_FREE_POLICY,
  entitlementsMapToPolicy,
  hostedTierHubIndicatorLine,
  policyFromEntitlementsResponse,
  shouldRefreshStewardEntitlementsCache,
  stewardPushSubscribeAllowed,
} from "../../site/js/device-steward-entitlements-core.mjs";

const HOSTED_ENTITLEMENTS = {
  "steward.hosted": true,
  "notify.push.live_proof": true,
  "poll.live_proof.auto_daily_cap": 4000,
  "poll.live_proof.idle_ms": 30_000,
  "poll.live_proof.active_ms": 5000,
  "poll.network.max_parallel": 5,
  "poll.network.manual_max_parallel": 3,
  "wallet.large_threshold": 25,
  "sw.periodic_min_ms": 300_000,
};

describe("policyFromEntitlementsResponse", () => {
  it("returns reference_free defaults when body is missing", () => {
    expect(policyFromEntitlementsResponse(null)).toEqual(REFERENCE_FREE_POLICY);
  });

  it("maps hosted_steward_v1 entitlements", () => {
    const policy = policyFromEntitlementsResponse({
      plan_id: "hosted_steward_v1",
      status: "active",
      entitlements: HOSTED_ENTITLEMENTS,
    });
    expect(policy.stewardHosted).toBe(true);
    expect(policy.pollLiveProofAutoDailyCap).toBe(4000);
    expect(policy.pollLiveProofIdleMs).toBe(30_000);
    expect(policy.walletLargeThreshold).toBe(25);
    expect(policy.swPeriodicMinMs).toBe(300_000);
    expect(policy.planId).toBe("hosted_steward_v1");
  });

  it("downgrades to free policy fields on reference_free response", () => {
    const policy = policyFromEntitlementsResponse({
      plan_id: "reference_free",
      status: "active",
      entitlements: {
        "steward.hosted": false,
        "notify.push.live_proof": false,
        "poll.live_proof.auto_daily_cap": 400,
      },
    });
    expect(policy.stewardHosted).toBe(false);
    expect(policy.pollLiveProofAutoDailyCap).toBe(400);
  });
});

describe("entitlementsMapToPolicy", () => {
  it("401-style empty entitlements keeps reference defaults", () => {
    expect(entitlementsMapToPolicy({})).toEqual(REFERENCE_FREE_POLICY);
  });
});

describe("stewardPushSubscribeAllowed", () => {
  it("requires hosted and push entitlement", () => {
    expect(stewardPushSubscribeAllowed(REFERENCE_FREE_POLICY)).toBe(false);
    expect(
      stewardPushSubscribeAllowed(
        entitlementsMapToPolicy(HOSTED_ENTITLEMENTS, REFERENCE_FREE_POLICY)
      )
    ).toBe(true);
    expect(
      stewardPushSubscribeAllowed({
        ...REFERENCE_FREE_POLICY,
        stewardHosted: true,
        notifyPushLiveProof: false,
      })
    ).toBe(false);
  });
});

describe("hostedTierHubIndicatorLine", () => {
  it("is null on free tier", () => {
    expect(hostedTierHubIndicatorLine(REFERENCE_FREE_POLICY)).toBeNull();
  });

  it("returns M5-safe copy when hosted", () => {
    const line = hostedTierHubIndicatorLine({
      ...REFERENCE_FREE_POLICY,
      stewardHosted: true,
    });
    expect(line).toMatch(/Hosted steward plan/);
    expect(line).not.toMatch(/premium|verified/i);
  });
});

describe("shouldRefreshStewardEntitlementsCache", () => {
  it("refreshes after 300s", () => {
    const cache = {
      fetchedAt: 1_000,
      etag: null,
      body: { entitlements: {} },
    };
    expect(shouldRefreshStewardEntitlementsCache(cache, 1_000 + 299_999)).toBe(false);
    expect(shouldRefreshStewardEntitlementsCache(cache, 1_000 + 300_000)).toBe(true);
  });
});
