import { describe, expect, it } from "vitest";

import {
  encodeBase58,
  getTestKeypair,
  PAYLOAD_TYPES,
  signDocument,
  withProtocolFields,
} from "../src/crypto";
import type { CardRow } from "../src/db/types";
import type { Env } from "../src/index";
import {
  handleGetOperatorCapabilities,
  handleGetOperatorPlans,
  handleGetStewardEntitlements,
  handlePostStewardSession,
} from "../src/resolver/steward-hosted";
import { stewardSchemaReady, stewardPushSchemaReady } from "../src/steward/db";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const ACCOUNT = "acc_TestHostedSteward1";
const DEVICE = "devTestdevice1111";

type StewardTestDb = D1Database & {
  accounts: Map<string, Record<string, unknown>>;
  sessions: Map<string, Record<string, unknown>>;
};

async function buildLinkProof(
  privateKey: Uint8Array,
  publicKeyBase58: string,
  nonce: string
) {
  const now = Date.now();
  const unsigned = withProtocolFields(
    {
      profile_id: PROFILE,
      account_id: ACCOUNT,
      operator_id: "humanity.llc",
      device_id: DEVICE,
      issued_at: new Date(now).toISOString(),
      expires_at: new Date(now + 5 * 60 * 1000).toISOString(),
      nonce,
    },
    PAYLOAD_TYPES.STEWARD_ACCOUNT_LINK
  );
  return signDocument(unsigned, { privateKey, publicKeyBase58 });
}

function card(publicKey: string): CardRow {
  return {
    profile_id: PROFILE,
    public_key: publicKey,
    handle: "river_example",
    handle_normalized: "river_example",
    manifesto_line: "Open studio",
    status: "active",
    card_document_json: "{}",
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
  };
}

function stewardDb(ownerPublicKey: string): StewardTestDb {
  const accounts = new Map<string, Record<string, unknown>>();
  const profiles = new Map<string, string>();
  const sessions = new Map<string, Record<string, unknown>>();
  const nonces = new Set<string>();
  const usageCounters = new Map<string, number>();
  const plans = [
    {
      plan_id: "reference_free",
      plan_version: 1,
      entitlements_json:
        '{"steward.hosted":false,"poll.live_proof.auto_daily_cap":400}',
      description: "free",
    },
    {
      plan_id: "hosted_steward_v1",
      plan_version: 1,
      entitlements_json:
        '{"steward.hosted":true,"poll.live_proof.auto_daily_cap":4000}',
      description: "hosted",
    },
  ];

  const handlers = (sql: string, params: unknown[]) => ({
    first: async () => {
          if (sql.includes("sqlite_master") && sql.includes("name = ?")) {
            return { 1: 1 };
          }
          if (sql.includes("FROM cards")) {
            return {
              ...card(ownerPublicKey),
              recovery_public_key: null,
              issuer_public_key: null,
            };
          }
          if (sql.includes("steward_link_nonces") && sql.includes("SELECT 1")) {
            return nonces.has(String(params[0])) ? { 1: 1 } : null;
          }
          if (sql.includes("FROM steward_accounts WHERE account_id")) {
            return accounts.get(String(params[0])) ?? null;
          }
          if (sql.includes("FROM steward_plan_definitions")) {
            if (sql.includes("plan_id = ? AND plan_version")) {
              const [planId, planVersion] = params;
              const row = plans.find(
                (p) =>
                  p.plan_id === planId && p.plan_version === Number(planVersion)
              );
              return row ? { entitlements_json: row.entitlements_json } : null;
            }
            return null;
          }
          if (sql.includes("FROM steward_sessions WHERE token_hash")) {
            return sessions.get(String(params[0])) ?? null;
          }
          if (
            sql.includes("FROM steward_account_profiles") &&
            sql.includes("profile_id")
          ) {
            const accountId = profiles.get(String(params[0]));
            return accountId ? { account_id: accountId } : null;
          }
          if (sql.includes("steward_usage_counters") && sql.includes("SELECT count")) {
            const [accountId, deviceId, event, windowKey] = params as string[];
            const key = `${accountId}:${deviceId}:${event}:${windowKey}`;
            return { count: usageCounters.get(key) ?? 0 };
          }
          return null;
        },
        run: async () => {
          if (sql.includes("INSERT INTO steward_link_nonces")) {
            nonces.add(String(params[0]));
          }
          if (sql.includes("INSERT INTO steward_usage_counters")) {
            const [accountId, deviceId, event, windowKey] = params as string[];
            const key = `${accountId}:${deviceId}:${event}:${windowKey}`;
            usageCounters.set(key, (usageCounters.get(key) ?? 0) + 1);
          }
          if (sql.includes("INSERT INTO steward_accounts")) {
            accounts.set(String(params[0]), {
              account_id: params[0],
              plan_id: params[1],
              plan_version: params[2],
              status: params[3],
              effective_from: params[4],
              effective_until: params[5],
              overrides_json: null,
            });
          }
          if (sql.includes("INSERT INTO steward_account_profiles")) {
            profiles.set(String(params[1]), String(params[0]));
          }
          if (sql.includes("INSERT INTO steward_sessions")) {
            sessions.set(String(params[0]), {
              token_hash: params[0],
              account_id: params[1],
              device_id: params[2],
              expires_at: params[3],
            });
          }
          if (sql.includes("UPDATE steward_sessions")) {
            const row = sessions.get(String(params[2]));
            if (row) {
              row.expires_at = params[1];
              sessions.set(String(params[2]), row);
            }
          }
          if (sql.includes("UPDATE steward_accounts")) {
            const accountId = String(params[params.length - 1]);
            const row = accounts.get(accountId);
            if (row) {
              row.plan_id = params[0];
              if (sql.includes("plan_version = ?")) {
                row.plan_version = params[1];
                row.status = params[2];
                row.effective_from = params[3];
                row.effective_until = params[4];
              } else {
                row.status = params[1];
                row.effective_from = params[2];
                row.effective_until = null;
              }
              accounts.set(accountId, row);
            }
          }
          if (sql.includes("DELETE FROM steward_sessions WHERE account_id")) {
            const accountId = String(params[0]);
            for (const [tokenHash, session] of sessions) {
              if (session.account_id === accountId) {
                sessions.delete(tokenHash);
              }
            }
          }
          return { success: true };
        },
        all: async () => {
          if (sql.includes("FROM steward_plan_definitions ORDER")) {
            return { results: plans };
          }
          return { results: [] };
        },
  });

  return {
    accounts,
    sessions,
    prepare: (sql: string) => {
      const base = handlers(sql, []);
      return {
        bind: (...params: unknown[]) => handlers(sql, params),
        first: base.first,
        run: base.run,
        all: base.all,
      };
    },
  } as unknown as StewardTestDb;
}

describe("steward hosted E1", () => {
  it("capabilities omits hosted extension when disabled", async () => {
    const env: Env = { HOSTED_STEWARD_ENABLED: "0" };
    const res = await handleGetOperatorCapabilities(
      new Request("https://humanity.llc/.well-known/hc/v1/operator/capabilities"),
      env
    );
    const body = (await res.json()) as { extensions: Record<string, unknown> };
    expect(res.status).toBe(200);
    expect(body.extensions).toEqual({});
  });

  it("capabilities includes hosted when enabled and schema ready", async () => {
    const db = stewardDb("pk");
    const env: Env = { DB: db, HOSTED_STEWARD_ENABLED: "1" };
    expect(await stewardSchemaReady(db)).toBe(true);
    expect(await stewardPushSchemaReady(db)).toBe(true);
    const res = await handleGetOperatorCapabilities(
      new Request("https://humanity.llc/.well-known/hc/v1/operator/capabilities"),
      env
    );
    const body = (await res.json()) as {
      extensions: { hosted_steward?: { status: string } };
    };
    expect(body.extensions.hosted_steward?.status).toBe("enabled");
  });

  it("session + entitlements flow with signed link proof", async () => {
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const db = stewardDb(publicKeyBase58);
    const env: Env = { DB: db, HOSTED_STEWARD_ENABLED: "1" };

    const linkProof = await buildLinkProof(
      privateKey,
      publicKeyBase58,
      "nonce_link_flow_001"
    );

    const sessionRes = await handlePostStewardSession(
      new Request("https://humanity.llc/.well-known/hc/v1/steward/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_id: PROFILE,
          device_id: DEVICE,
          link_proof: linkProof,
        }),
      }),
      env,
      db
    );
    const sessionText = await sessionRes.text();
    expect(sessionRes.status, sessionText).toBe(200);
    const sessionBody = JSON.parse(sessionText) as {
      token: string;
      account_id: string;
    };
    expect(sessionBody.account_id).toBe(ACCOUNT);
    expect(sessionBody.token.length).toBeGreaterThan(20);

    const entRes = await handleGetStewardEntitlements(
      new Request("https://humanity.llc/.well-known/hc/v1/steward/entitlements", {
        headers: {
          Authorization: `Bearer ${sessionBody.token}`,
          "X-HC-Device-Id": DEVICE,
        },
      }),
      env,
      db
    );
    expect(entRes.status).toBe(200);
    const ent = (await entRes.json()) as {
      plan_id: string;
      entitlements: Record<string, unknown>;
    };
    expect(ent.plan_id).toBe("reference_free");
    expect(ent.entitlements["poll.live_proof.auto_daily_cap"]).toBe(400);
  });

  it("rejects linking a profile that is already tied to another steward account", async () => {
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const db = stewardDb(publicKeyBase58);
    const env: Env = { DB: db, HOSTED_STEWARD_ENABLED: "1" };

    const first = await buildLinkProof(privateKey, publicKeyBase58, "nonce_profile_link_a");
    const firstRes = await handlePostStewardSession(
      new Request("https://humanity.llc/.well-known/hc/v1/steward/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_id: PROFILE,
          device_id: DEVICE,
          link_proof: first,
        }),
      }),
      env,
      db
    );
    expect(firstRes.status).toBe(200);

    const otherAccount = "acc_TestHostedSteward2";
    const now = Date.now();
    const otherProof = await signDocument(
      withProtocolFields(
        {
          profile_id: PROFILE,
          account_id: otherAccount,
          operator_id: "humanity.llc",
          device_id: DEVICE,
          issued_at: new Date(now).toISOString(),
          expires_at: new Date(now + 5 * 60 * 1000).toISOString(),
          nonce: "nonce_profile_link_b",
        },
        PAYLOAD_TYPES.STEWARD_ACCOUNT_LINK
      ),
      { privateKey, publicKeyBase58 }
    );

    const secondRes = await handlePostStewardSession(
      new Request("https://humanity.llc/.well-known/hc/v1/steward/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_id: PROFILE,
          device_id: DEVICE,
          link_proof: otherProof,
        }),
      }),
      env,
      db
    );
    const secondText = await secondRes.text();
    expect(secondRes.status, secondText).toBe(409);
    const secondBody = JSON.parse(secondText) as { error: string };
    expect(secondBody.error).toBe("PROFILE_ALREADY_LINKED");
  });

  it("expires past-due accounts during entitlements fetch and revokes sessions", async () => {
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const db = stewardDb(publicKeyBase58);
    const env: Env = { DB: db, HOSTED_STEWARD_ENABLED: "1" };

    const linkProof = await buildLinkProof(
      privateKey,
      publicKeyBase58,
      "nonce_lazy_expire_001"
    );

    const sessionRes = await handlePostStewardSession(
      new Request("https://humanity.llc/.well-known/hc/v1/steward/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_id: PROFILE,
          device_id: DEVICE,
          link_proof: linkProof,
        }),
      }),
      env,
      db
    );
    const sessionBody = (await sessionRes.json()) as {
      token: string;
      account_id: string;
    };

    db.accounts.set(ACCOUNT, {
      ...db.accounts.get(ACCOUNT)!,
      plan_id: "hosted_steward_v1",
      status: "past_due",
      effective_until: "2026-05-01T00:00:00.000Z",
      billing_customer_id: "cus_lazy_expire",
      billing_subscription_id: "sub_lazy_expire",
    });
    expect(db.sessions.size).toBe(1);

    const entRes = await handleGetStewardEntitlements(
      new Request("https://humanity.llc/.well-known/hc/v1/steward/entitlements", {
        headers: {
          Authorization: `Bearer ${sessionBody.token}`,
          "X-HC-Device-Id": DEVICE,
        },
      }),
      env,
      db
    );
    const ent = (await entRes.json()) as {
      plan_id: string;
      status: string;
      effective_until: string | null;
      entitlements: Record<string, unknown>;
      usage: { limits: Record<string, unknown> };
    };

    expect(entRes.status).toBe(200);
    expect(ent.plan_id).toBe("reference_free");
    expect(ent.status).toBe("expired");
    expect(ent.effective_until).toBeNull();
    expect(ent.entitlements["steward.hosted"]).toBe(false);
    expect(ent.usage.limits["poll.live_proof.auto"]).toBe(400);
    expect(db.sessions.size).toBe(0);

    const revokedSessionRes = await handleGetStewardEntitlements(
      new Request("https://humanity.llc/.well-known/hc/v1/steward/entitlements", {
        headers: {
          Authorization: `Bearer ${sessionBody.token}`,
          "X-HC-Device-Id": DEVICE,
        },
      }),
      env,
      db
    );
    expect(revokedSessionRes.status).toBe(401);
  });

  it("lists public plans when enabled", async () => {
    const { publicKeyBase58 } = await getTestKeypair();
    const db = stewardDb(publicKeyBase58);
    const env: Env = { DB: db, HOSTED_STEWARD_ENABLED: "1" };
    const res = await handleGetOperatorPlans(
      new Request("https://humanity.llc/.well-known/hc/v1/operator/plans"),
      env,
      db
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { plans: Array<{ plan_id: string }> };
    expect(body.plans.map((p) => p.plan_id)).toContain("hosted_steward_v1");
  });

  it("rejects replayed link nonce", async () => {
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const db = stewardDb(publicKeyBase58);
    const env: Env = { DB: db, HOSTED_STEWARD_ENABLED: "1" };
    const linkProof = await buildLinkProof(
      privateKey,
      publicKeyBase58,
      "nonce_replay_test_001"
    );

    const body = {
      profile_id: PROFILE,
      device_id: DEVICE,
      link_proof: linkProof,
    };
    const req = () =>
      handlePostStewardSession(
        new Request("https://humanity.llc/.well-known/hc/v1/steward/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
        env,
        db
      );

    expect((await req()).status).toBe(200);
    const second = await req();
    expect(second.status).toBe(409);
  });
});
