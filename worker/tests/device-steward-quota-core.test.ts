import { describe, expect, it } from "vitest";

import {
  STEWARD_NULL_DEVICE_CAP_FALLBACK,
  isStewardQuotaExceededBody,
  stewardQuotaUsageFromBody,
  stewardServerQuotaPausedMessage,
} from "../../site/js/device-steward-quota-core.mjs";
import { entitlementsMapToPolicy } from "../../site/js/device-steward-entitlements-core.mjs";

describe("isStewardQuotaExceededBody", () => {
  it("detects steward_quota_exceeded", () => {
    expect(
      isStewardQuotaExceededBody({
        error: "steward_quota_exceeded",
        usage: { "poll.live_proof.auto": 400, limit: 400 },
      })
    ).toBe(true);
    expect(isStewardQuotaExceededBody({ error: "rate_limited" })).toBe(false);
  });
});

describe("stewardQuotaUsageFromBody", () => {
  it("parses usage counters", () => {
    expect(
      stewardQuotaUsageFromBody({
        error: "steward_quota_exceeded",
        usage: { "poll.live_proof.auto": 4000, limit: 4000 },
      })
    ).toEqual({ used: 4000, limit: 4000 });
  });
});

describe("null device cap entitlement", () => {
  it("maps null to 4000 client fallback", () => {
    const policy = entitlementsMapToPolicy({
      "poll.live_proof.auto_daily_cap": null,
    });
    expect(policy.pollLiveProofAutoDailyCap).toBe(STEWARD_NULL_DEVICE_CAP_FALLBACK);
  });
});

describe("stewardServerQuotaPausedMessage", () => {
  it("mentions manual check", () => {
    expect(stewardServerQuotaPausedMessage()).toMatch(/Check for live proof/i);
  });
});
