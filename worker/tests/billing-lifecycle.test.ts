import { describe, expect, it } from "vitest";

import {
  HOSTED_GAME_SEASON_PLAN_ID,
  mapStripeSubscriptionStatus,
  PAST_DUE_GRACE_MS,
  shouldExpirePastDueAccount,
  stewardUpdateForPaymentFailed,
  stewardUpdateForSubscriptionDeleted,
  stewardUpdateFromStripeSubscription,
} from "../src/steward/billing-lifecycle";
import { effectiveEntitlementsForAccount } from "../src/steward/plans";

const NOW = Date.parse("2026-05-26T12:00:00.000Z");

describe("stewardUpdateFromStripeSubscription", () => {
  it("returns null without account_id metadata (commerce cannot grant)", () => {
    expect(
      stewardUpdateFromStripeSubscription(
        {
          id: "sub_1",
          customer: "cus_1",
          status: "active",
          metadata: {},
        },
        NOW
      )
    ).toBeNull();
  });

  it("maps active subscription to hosted plan", () => {
    const update = stewardUpdateFromStripeSubscription(
      {
        id: "sub_1",
        customer: "cus_1",
        status: "active",
        metadata: { account_id: "acc_1" },
        current_period_end: Math.floor(NOW / 1000) + 86400,
      },
      NOW
    );
    expect(update?.status).toBe("active");
    expect(update?.plan_id).toBe("hosted_steward_v1");
    expect(update?.account_id).toBe("acc_1");
  });

  it("maps metadata.plan_id hosted_game_season_v1", () => {
    const update = stewardUpdateFromStripeSubscription(
      {
        id: "sub_game",
        customer: "cus_1",
        status: "active",
        metadata: {
          account_id: "acc_game",
          plan_id: HOSTED_GAME_SEASON_PLAN_ID,
        },
        current_period_end: Math.floor(NOW / 1000) + 86400,
      },
      NOW
    );
    expect(update?.plan_id).toBe(HOSTED_GAME_SEASON_PLAN_ID);
  });
});

describe("mapStripeSubscriptionStatus", () => {
  it("sets past_due grace effective_until", () => {
    const mapped = mapStripeSubscriptionStatus("past_due", {
      cancel_at_period_end: false,
      current_period_end: null,
      trial_end: null,
      now: NOW,
    });
    expect(mapped.status).toBe("past_due");
    const end = Date.parse(mapped.effective_until!);
    expect(end - NOW).toBe(PAST_DUE_GRACE_MS);
  });
});

describe("stewardUpdateForSubscriptionDeleted", () => {
  it("downgrades to reference_free expired", () => {
    const update = stewardUpdateForSubscriptionDeleted(
      {
        id: "sub_1",
        customer: "cus_1",
        status: "canceled",
        metadata: { account_id: "acc_1" },
      },
      NOW
    );
    expect(update?.status).toBe("expired");
    expect(update?.plan_id).toBe("reference_free");
  });
});

describe("past_due grace expiry", () => {
  it("expires after effective_until", () => {
    const account = {
      account_id: "acc_1",
      plan_id: "hosted_steward_v1",
      plan_version: 1,
      status: "past_due" as const,
      effective_from: "2026-05-01T00:00:00Z",
      effective_until: "2026-05-20T00:00:00Z",
      overrides_json: null,
    };
    expect(shouldExpirePastDueAccount(account, NOW)).toBe(true);
    const entitlements = effectiveEntitlementsForAccount(
      { "steward.hosted": true, "poll.live_proof.auto_daily_cap": 4000 },
      { ...account, status: "expired" }
    );
    expect(entitlements["steward.hosted"]).toBe(false);
    expect(entitlements["poll.live_proof.auto_daily_cap"]).toBe(400);
  });
});

describe("stewardUpdateForPaymentFailed", () => {
  it("keeps hosted plan with grace window", () => {
    const update = stewardUpdateForPaymentFailed("acc_1", "cus_1", "sub_1", NOW);
    expect(update.status).toBe("past_due");
    expect(update.plan_id).toBe("hosted_steward_v1");
  });
});
