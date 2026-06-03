import { describe, expect, it } from "vitest";

import {
  HOSTED_GAME_SEASON_PLAN_ID,
  HOSTED_STEWARD_PLAN_ID,
} from "../src/steward/billing-lifecycle";
import {
  buildCheckoutReturnUrl,
  buildStripeCheckoutSessionForm,
  isStripeCheckoutPlanId,
  isValidCheckoutSiteOrigin,
  normalizeCheckoutReturnPath,
  resolveStripePriceId,
  stripeHostedCheckoutMetadata,
  stripePriceEnvKey,
} from "../src/steward/stripe-checkout-core";

describe("stripe checkout core", () => {
  it("resolves price env keys per plan", () => {
    expect(stripePriceEnvKey(HOSTED_STEWARD_PLAN_ID)).toBe(
      "STRIPE_PRICE_HOSTED_STEWARD_V1"
    );
    expect(stripePriceEnvKey(HOSTED_GAME_SEASON_PLAN_ID)).toBe(
      "STRIPE_PRICE_HOSTED_GAME_SEASON_V1"
    );
  });

  it("accepts allowed site origins", () => {
    expect(isValidCheckoutSiteOrigin("https://humanity.llc")).toBe(true);
    expect(isValidCheckoutSiteOrigin("http://127.0.0.1:8788")).toBe(true);
    expect(isValidCheckoutSiteOrigin("https://evil.example")).toBe(false);
  });

  it("builds return URL with hc_account_id", () => {
    const url = buildCheckoutReturnUrl(
      "https://humanity.llc",
      "acc_TestHostedSteward1",
      "/created/"
    );
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/created/");
    expect(parsed.searchParams.get("hc_account_id")).toBe("acc_TestHostedSteward1");
  });

  it("builds Stripe form with subscription metadata", () => {
    const form = buildStripeCheckoutSessionForm({
      priceId: "price_test_steward",
      accountId: "acc_TestHostedSteward1",
      planId: HOSTED_STEWARD_PLAN_ID,
      successUrl: "https://humanity.llc/?hc_account_id=acc_TestHostedSteward1",
      cancelUrl: "https://humanity.llc/?hosted_checkout=canceled",
    });
    expect(form.get("mode")).toBe("subscription");
    expect(form.get("line_items[0][price]")).toBe("price_test_steward");
    expect(form.get("subscription_data[metadata][account_id]")).toBe(
      "acc_TestHostedSteward1"
    );
    expect(form.get("subscription_data[metadata][plan_id]")).toBe(
      HOSTED_STEWARD_PLAN_ID
    );
  });

  it("includes plan_id in hosted checkout metadata", () => {
    expect(
      stripeHostedCheckoutMetadata("acc_TestHostedSteward1", HOSTED_GAME_SEASON_PLAN_ID)
    ).toEqual({
      account_id: "acc_TestHostedSteward1",
      plan_id: HOSTED_GAME_SEASON_PLAN_ID,
      plan_version: "1",
    });
  });

  it("resolveStripePriceId reads env", () => {
    expect(
      resolveStripePriceId(
        { STRIPE_PRICE_HOSTED_STEWARD_V1: "price_abc123" },
        HOSTED_STEWARD_PLAN_ID
      )
    ).toBe("price_abc123");
    expect(
      resolveStripePriceId({ STRIPE_PRICE_HOSTED_STEWARD_V1: "not_a_price" }, HOSTED_STEWARD_PLAN_ID)
    ).toBeNull();
  });

  it("validates checkout plan ids", () => {
    expect(isStripeCheckoutPlanId("hosted_steward_v1")).toBe(true);
    expect(isStripeCheckoutPlanId("reference_free")).toBe(false);
    expect(normalizeCheckoutReturnPath("../evil")).toBe("/");
  });
});
