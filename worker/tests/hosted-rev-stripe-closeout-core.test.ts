import { describe, expect, it } from "vitest";

import {
  classifyWebhookEndpoint,
  parseDevVarsStripeKeys,
  stripeCloseoutPlaybookLines,
  summarizeDevVarsStripeKeys,
} from "../scripts/hosted-rev-stripe-closeout-core.mjs";

describe("hosted-rev-stripe-closeout-core", () => {
  it("classifies webhook secret missing", () => {
    const result = classifyWebhookEndpoint(503, { error: "billing_not_configured" });
    expect(result.ok).toBe(true);
    expect(result.configured).toBe(false);
  });

  it("classifies webhook secret present", () => {
    const result = classifyWebhookEndpoint(401, {
      error: "invalid_webhook_signature",
      message: "missing_header",
    });
    expect(result.ok).toBe(true);
    expect(result.configured).toBe(true);
  });

  it("parseDevVarsStripeKeys ignores placeholders", () => {
    const keys = parseDevVarsStripeKeys(`
STRIPE_SECRET_KEY=sk_test_abc123
STRIPE_PRICE_HOSTED_STEWARD_V1=price_…
STRIPE_WEBHOOK_SECRET=
`);
    expect(keys.STRIPE_SECRET_KEY).toBe(true);
    expect(keys.STRIPE_PRICE_HOSTED_STEWARD_V1).toBe(false);
    expect(keys.STRIPE_WEBHOOK_SECRET).toBe(false);
  });

  it("summarizeDevVarsStripeKeys tracks checkout vs webhook readiness", () => {
    const summary = summarizeDevVarsStripeKeys({
      STRIPE_SECRET_KEY: true,
      STRIPE_PRICE_HOSTED_STEWARD_V1: true,
      STRIPE_PRICE_HOSTED_GAME_SEASON_V1: true,
      STRIPE_WEBHOOK_SECRET: false,
    });
    expect(summary.checkoutReady).toBe(true);
    expect(summary.webhookReady).toBe(false);
    expect(summary.missing).toEqual(["STRIPE_WEBHOOK_SECRET"]);
  });

  it("playbook references stripe-closeout and prod-smoke --paid", () => {
    const text = stripeCloseoutPlaybookLines().join("\n");
    expect(text).toContain("hosted:rev:stripe-closeout");
    expect(text).toContain("hosted:rev:prod-smoke -- --paid");
  });
});
