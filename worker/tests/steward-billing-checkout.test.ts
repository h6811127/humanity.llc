import { describe, expect, it, vi } from "vitest";

import { hashSessionToken } from "../src/steward/session-token";
import { handlePostStewardBillingCheckout } from "../src/resolver/steward-billing-checkout";
import type { Env } from "../src/index";

const ACCOUNT = "acc_TestHostedSteward1";
const TOKEN = "test_session_token_for_checkout_32bytes";
const DEVICE = "devTestdevice1111";

function checkoutDb() {
  const accounts = new Map<string, Record<string, unknown>>();
  accounts.set(ACCOUNT, {
    account_id: ACCOUNT,
    plan_id: "reference_free",
    plan_version: 1,
    status: "active",
    billing_customer_id: null,
    billing_subscription_id: null,
  });

  const sessions = new Map<string, Record<string, unknown>>();

  const db = {
    prepare: (sql: string) => ({
      bind: (...params: unknown[]) => ({
        first: async () => {
          if (sql.includes("sqlite_master")) return { 1: 1 };
          if (sql.includes("FROM steward_sessions WHERE token_hash")) {
            return sessions.get(String(params[0])) ?? null;
          }
          if (sql.includes("FROM steward_accounts WHERE account_id")) {
            return accounts.get(String(params[0])) ?? null;
          }
          return null;
        },
        run: async () => ({ success: true }),
      }),
    }),
  } as unknown as D1Database;

  return { db, accounts, sessions };
}

async function seedSession(sessions: Map<string, Record<string, unknown>>) {
  const tokenHash = await hashSessionToken(TOKEN);
  sessions.set(tokenHash, {
    token_hash: tokenHash,
    account_id: ACCOUNT,
    device_id: DEVICE,
    expires_at: new Date(Date.now() + 3600_000).toISOString(),
  });
}

describe("handlePostStewardBillingCheckout", () => {
  const env: Env = {
    HOSTED_STEWARD_ENABLED: "1",
    STRIPE_SECRET_KEY: "sk_test_checkout",
    STRIPE_PRICE_HOSTED_STEWARD_V1: "price_test_steward_v1",
  };

  it("returns 401 without bearer session", async () => {
    const { db } = checkoutDb();
    const res = await handlePostStewardBillingCheckout(
      new Request("https://humanity.llc/.well-known/hc/v1/steward/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: "hosted_steward_v1" }),
      }),
      env,
      db
    );
    expect(res.status).toBe(401);
  });

  it("returns checkout_url when Stripe accepts session create", async () => {
    const { db, sessions } = checkoutDb();
    await seedSession(sessions);

    const fetchMock = vi.fn(async () =>
      Response.json({
        id: "cs_test_checkout_session",
        url: "https://checkout.stripe.com/c/pay/cs_test_checkout_session",
      })
    );

    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as typeof fetch;

    try {
      const res = await handlePostStewardBillingCheckout(
        new Request("https://humanity.llc/.well-known/hc/v1/steward/billing/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${TOKEN}`,
            "X-HC-Device-Id": DEVICE,
          },
          body: JSON.stringify({
            plan_id: "hosted_steward_v1",
            site_origin: "https://humanity.llc",
            return_path: "/created/",
          }),
        }),
        env,
        db
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        checkout_url?: string;
        session_id?: string;
        plan_id?: string;
      };
      expect(json.checkout_url).toContain("checkout.stripe.com");
      expect(json.session_id).toBe("cs_test_checkout_session");
      expect(json.plan_id).toBe("hosted_steward_v1");
      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://api.stripe.com/v1/checkout/sessions");
      const body = String(init.body);
      expect(body).toContain("price_test_steward_v1");
      expect(body).toContain("subscription_data%5Bmetadata%5D%5Baccount_id%5D");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("returns 503 when Stripe secret is missing", async () => {
    const { db, sessions } = checkoutDb();
    await seedSession(sessions);
    const res = await handlePostStewardBillingCheckout(
      new Request("https://humanity.llc/.well-known/hc/v1/steward/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TOKEN}`,
        },
        body: JSON.stringify({ plan_id: "hosted_steward_v1" }),
      }),
      { HOSTED_STEWARD_ENABLED: "1" },
      db
    );
    expect(res.status).toBe(503);
  });
});
