import { describe, expect, it } from "vitest";

import {
  assertBillingCheckoutRequiresSession,
  assertHostedExtensionEnabled,
  assertPaidStewardEntitlements,
  assertRevenuePlansCatalog,
  classifyBillingCheckoutConfigured,
  HOSTED_GAME_SEASON_PLAN_ID,
  HOSTED_STEWARD_PLAN_ID,
} from "../scripts/hosted-rev-prod-smoke-core.mjs";

describe("hosted-rev-prod-smoke-core", () => {
  it("requires billing_checkout in capabilities", () => {
    const result = assertHostedExtensionEnabled({
      extensions: {
        hosted_steward: {
          status: "enabled",
          endpoints: {
            billing_checkout: "/.well-known/hc/v1/steward/billing/checkout",
          },
        },
      },
    });
    expect(result.ok).toBe(true);
  });

  it("requires both paid plans in catalog", () => {
    const result = assertRevenuePlansCatalog({
      plans: [
        { plan_id: "reference_free" },
        { plan_id: HOSTED_STEWARD_PLAN_ID },
        { plan_id: HOSTED_GAME_SEASON_PLAN_ID },
      ],
    });
    expect(result.ok).toBe(true);
  });

  it("hints migration 0031 when game season plan missing", () => {
    const result = assertRevenuePlansCatalog({
      plans: [{ plan_id: "reference_free" }, { plan_id: HOSTED_STEWARD_PLAN_ID }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("0031_game_season_metering");
    }
  });

  it("rejects unauthenticated checkout", () => {
    const result = assertBillingCheckoutRequiresSession(401, {
      error: "UNAUTHORIZED",
    });
    expect(result.ok).toBe(true);
  });

  it("accepts billing_not_configured before Stripe secrets", () => {
    const result = classifyBillingCheckoutConfigured(503, {
      error: "billing_not_configured",
    });
    expect(result.ok).toBe(true);
    expect(result.configured).toBe(false);
  });

  it("validates paid steward entitlements", () => {
    const result = assertPaidStewardEntitlements({
      plan_id: HOSTED_STEWARD_PLAN_ID,
      status: "active",
      entitlements: { "steward.hosted": true },
      usage: { counters: { "poll.live_proof.auto": 1 }, limits: {} },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.planId).toBe(HOSTED_STEWARD_PLAN_ID);
    }
  });

  it("validates paid game season plan", () => {
    const result = assertPaidStewardEntitlements(
      {
        plan_id: HOSTED_GAME_SEASON_PLAN_ID,
        status: "active",
        entitlements: { "game.season.node_cap": 50 },
        game_season: { season_id: "cr_season_01_wake" },
      },
      HOSTED_GAME_SEASON_PLAN_ID
    );
    expect(result.ok).toBe(true);
  });
});
