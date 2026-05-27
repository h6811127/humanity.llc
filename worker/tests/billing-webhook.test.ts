import { describe, expect, it } from "vitest";

import { handlePostBillingWebhook } from "../src/http/billing-webhook";
import type { Env } from "../src/index";

const ACCOUNT = "acc_BillingTest1";
const CUSTOMER = "cus_test_billing";
const SUB = "sub_test_billing";

function billingDb() {
  const accounts = new Map<string, Record<string, unknown>>();
  accounts.set(ACCOUNT, {
    account_id: ACCOUNT,
    plan_id: "reference_free",
    plan_version: 1,
    status: "active",
    effective_from: "2026-05-01T00:00:00Z",
    effective_until: null,
    overrides_json: null,
    billing_customer_id: null,
    billing_subscription_id: null,
  });
  const sessions = new Set<string>();

  const db = {
    prepare: (sql: string) => ({
      bind: (...params: unknown[]) => ({
        first: async () => {
          if (sql.includes("sqlite_master")) return { 1: 1 };
          if (sql.includes("FROM steward_accounts WHERE account_id")) {
            return accounts.get(String(params[0])) ?? null;
          }
          if (sql.includes("billing_customer_id")) {
            for (const row of accounts.values()) {
              if (row.billing_customer_id === params[0]) return row;
            }
            return null;
          }
          if (sql.includes("billing_subscription_id")) {
            for (const row of accounts.values()) {
              if (row.billing_subscription_id === params[0]) return row;
            }
            return null;
          }
          if (sql.includes("FROM steward_plan_definitions")) {
            return {
              entitlements_json:
                '{"steward.hosted":true,"poll.live_proof.auto_daily_cap":4000}',
            };
          }
          return null;
        },
        run: async () => {
          if (sql.includes("UPDATE steward_accounts")) {
            const id = String(params[params.length - 1]);
            const row = accounts.get(id);
            if (!row) return { success: true };
            if (sql.includes("plan_id = ?")) {
              row.plan_id = params[0];
              row.plan_version = params[1];
              row.status = params[2];
              row.effective_from = params[3];
              row.effective_until = params[4];
              row.billing_customer_id = params[5];
              row.billing_subscription_id = params[6];
            } else {
              row.plan_id = params[0];
              row.status = params[1];
              row.effective_from = params[2];
            }
          }
          if (sql.includes("DELETE FROM steward_sessions")) {
            sessions.clear();
          }
          return { success: true };
        },
      }),
    }),
  } as unknown as D1Database;

  return { db, accounts, sessions };
}

async function signedRequest(
  secret: string,
  body: string,
  nowSec: number
): Promise<Request> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${nowSec}.${body}`)
  );
  const hex = [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return new Request(
    "https://humanity.llc/.well-known/hc/v1/operator/billing/webhook",
    {
      method: "POST",
      headers: {
        "Stripe-Signature": `t=${nowSec},v1=${hex}`,
        "Content-Type": "application/json",
      },
      body,
    }
  );
}

describe("handlePostBillingWebhook", () => {
  const secret = "whsec_integration_test";
  const env: Env = {
    HOSTED_STEWARD_ENABLED: "1",
    STRIPE_WEBHOOK_SECRET: secret,
  };

  it("ignores commerce checkout without hosted metadata", async () => {
    const { db } = billingDb();
    const body = JSON.stringify({
      type: "checkout.session.completed",
      data: {
        object: {
          mode: "payment",
          metadata: { product: "sticker_pack" },
        },
      },
    });
    const now = Math.floor(Date.now() / 1000);
    const res = await handlePostBillingWebhook(
      await signedRequest(secret, body, now),
      env,
      db
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ignored?: boolean; reason?: string };
    expect(json.ignored).toBe(true);
    expect(json.reason).toBe("commerce");
  });

  it("activates hosted plan for subscription.updated on existing account", async () => {
    const { db, accounts } = billingDb();
    const body = JSON.stringify({
      type: "customer.subscription.updated",
      data: {
        object: {
          id: SUB,
          customer: CUSTOMER,
          status: "active",
          metadata: { account_id: ACCOUNT },
          current_period_end: Math.floor(Date.now() / 1000) + 86400,
        },
      },
    });
    const now = Math.floor(Date.now() / 1000);
    const res = await handlePostBillingWebhook(
      await signedRequest(secret, body, now),
      env,
      db
    );
    expect(res.status).toBe(200);
    const row = accounts.get(ACCOUNT)!;
    expect(row.status).toBe("active");
    expect(row.plan_id).toBe("hosted_steward_v1");
    expect(row.billing_customer_id).toBe(CUSTOMER);
  });

  it("does not create account when metadata account_id is unknown", async () => {
    const { db, accounts } = billingDb();
    const body = JSON.stringify({
      type: "customer.subscription.updated",
      data: {
        object: {
          id: SUB,
          customer: CUSTOMER,
          status: "active",
          metadata: { account_id: "acc_does_not_exist" },
        },
      },
    });
    const now = Math.floor(Date.now() / 1000);
    const res = await handlePostBillingWebhook(
      await signedRequest(secret, body, now),
      env,
      db
    );
    const json = (await res.json()) as { result?: string };
    expect(json.result).toBe("account_missing");
    expect(accounts.size).toBe(1);
  });

  it("expires account on subscription.deleted", async () => {
    const { db, accounts } = billingDb();
    accounts.set(ACCOUNT, {
      ...accounts.get(ACCOUNT)!,
      plan_id: "hosted_steward_v1",
      status: "active",
      billing_customer_id: CUSTOMER,
      billing_subscription_id: SUB,
    });
    const body = JSON.stringify({
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: SUB,
          customer: CUSTOMER,
          status: "canceled",
          metadata: { account_id: ACCOUNT },
        },
      },
    });
    const now = Math.floor(Date.now() / 1000);
    await handlePostBillingWebhook(
      await signedRequest(secret, body, now),
      env,
      db
    );
    const row = accounts.get(ACCOUNT)!;
    expect(row.status).toBe("expired");
    expect(row.plan_id).toBe("reference_free");
  });
});
