import { describe, expect, it, vi } from "vitest";

import type { Env } from "../src/env";
import {
  HOSTED_GAME_SEASON_PLAN_ID,
  HOSTED_STEWARD_PLAN_ID,
} from "../src/steward/billing-lifecycle";
import {
  createStripeCheckoutSession,
  requireStripePriceForPlan,
  stripeCheckoutConfigured,
} from "../src/steward/stripe-checkout";

const SESSION_PARAMS = {
  priceId: "price_test_steward",
  accountId: "acc_TestHostedSteward1",
  planId: HOSTED_STEWARD_PLAN_ID,
  successUrl: "https://humanity.llc/?hc_account_id=acc_TestHostedSteward1",
  cancelUrl: "https://humanity.llc/?hosted_checkout=canceled",
} as const;

describe("stripeCheckoutConfigured", () => {
  it("requires a trimmed secret that starts with sk_", () => {
    expect(stripeCheckoutConfigured({} as Env)).toBe(false);
    expect(stripeCheckoutConfigured({ STRIPE_SECRET_KEY: "  " } as Env)).toBe(false);
    expect(stripeCheckoutConfigured({ STRIPE_SECRET_KEY: "rk_live_nope" } as Env)).toBe(false);
    expect(stripeCheckoutConfigured({ STRIPE_SECRET_KEY: " sk_test_abc " } as Env)).toBe(true);
  });
});

describe("requireStripePriceForPlan", () => {
  it("returns configured price ids and null when missing", () => {
    const env = {
      STRIPE_PRICE_HOSTED_STEWARD_V1: "price_steward",
      STRIPE_PRICE_HOSTED_GAME_SEASON_V1: "price_season",
    } as Env;
    expect(requireStripePriceForPlan(env, HOSTED_STEWARD_PLAN_ID)).toBe("price_steward");
    expect(requireStripePriceForPlan(env, HOSTED_GAME_SEASON_PLAN_ID)).toBe("price_season");
    expect(requireStripePriceForPlan({} as Env, HOSTED_STEWARD_PLAN_ID)).toBeNull();
  });
});

describe("createStripeCheckoutSession", () => {
  it("rejects when Stripe secret is not configured", async () => {
    await expect(
      createStripeCheckoutSession({} as Env, SESSION_PARAMS, vi.fn() as typeof fetch)
    ).rejects.toThrow(/STRIPE_SECRET_KEY is not configured/);
  });

  it("maps Stripe JSON error.message for API-safe failures", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ error: { message: "No such price: price_x" } }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    ) as unknown as typeof fetch;

    await expect(
      createStripeCheckoutSession(
        { STRIPE_SECRET_KEY: "sk_test_abc" } as Env,
        SESSION_PARAMS,
        fetchImpl
      )
    ).rejects.toThrow("No such price: price_x");
  });

  it("rejects non-JSON Stripe bodies", async () => {
    const fetchImpl = vi.fn(async () => new Response("<html>bad gateway</html>", { status: 502 })) as unknown as typeof fetch;

    await expect(
      createStripeCheckoutSession(
        { STRIPE_SECRET_KEY: "sk_test_abc" } as Env,
        SESSION_PARAMS,
        fetchImpl
      )
    ).rejects.toThrow(/non-JSON response/);
  });

  it("rejects success responses missing a checkout url or cs_ id", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ id: "not_a_session", url: "http://insecure.example" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    ) as unknown as typeof fetch;

    await expect(
      createStripeCheckoutSession(
        { STRIPE_SECRET_KEY: "sk_test_abc" } as Env,
        SESSION_PARAMS,
        fetchImpl
      )
    ).rejects.toThrow(/missing url or id/);
  });

  it("returns url and id from a valid Stripe checkout session response", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: "cs_test_session_123",
          url: "https://checkout.stripe.com/c/pay/cs_test_session_123",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    ) as unknown as typeof fetch;

    await expect(
      createStripeCheckoutSession(
        { STRIPE_SECRET_KEY: "sk_test_abc" } as Env,
        SESSION_PARAMS,
        fetchImpl
      )
    ).resolves.toEqual({
      id: "cs_test_session_123",
      url: "https://checkout.stripe.com/c/pay/cs_test_session_123",
    });

    expect(fetchImpl).toHaveBeenCalledOnce();
    const [, init] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk_test_abc");
  });
});
