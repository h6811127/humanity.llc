import { describe, expect, it } from "vitest";

import type { Env } from "../src/index";
import {
  handlePostStewardWebPushSubscribe as handlePostStewardWebPushSubscribeRoute,
  handleDeleteStewardWebPushSubscribeRoute,
} from "../src/resolver/steward-hosted";
import {
  handlePostStewardWebPushSubscribe,
  handleDeleteStewardWebPushSubscribe,
  parseStewardWebPushSubscribeBody,
  parseStewardWebPushUnsubscribeBody,
  isAllowedWebPushEndpoint,
  WEB_PUSH_SUBSCRIBE_NOT_ENABLED,
  stewardWebPushSubscribeConfigured,
} from "../src/steward/web-push-subscribe";

const ACCOUNT = "acc_webPushSubscribe1";
const DEVICE = "dev_web_push_sub01";
const VAPID_PUBLIC =
  "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";

const HOSTED_ENTITLEMENTS = {
  "steward.hosted": true,
  "notify.push.live_proof": true,
};

function mockSubscribeDb(
  opts: {
    webPushTable?: boolean;
    existingEndpoint?: boolean;
    existingAccountId?: string;
  } = {}
) {
  const inserts: unknown[][] = [];
  const deletes: unknown[][] = [];
  return {
    inserts,
    deletes,
    prepare: (sql: string) => ({
      bind: (...params: unknown[]) => ({
        first: async () => {
          if (sql.includes("sqlite_master")) {
            const table = params[0];
            if (table === "steward_web_push_subscriptions") {
              return opts.webPushTable ? { 1: 1 } : null;
            }
            return { 1: 1 };
          }
          if (sql.includes("FROM steward_sessions")) {
            return {
              token_hash: params[0],
              account_id: ACCOUNT,
              device_id: DEVICE,
              expires_at: new Date(Date.now() + 60_000).toISOString(),
            };
          }
          if (sql.includes("FROM steward_accounts")) {
            return {
              account_id: ACCOUNT,
              plan_id: "hosted_steward_v1",
              plan_version: 1,
              status: "active",
              effective_from: "2026-05-01T00:00:00.000Z",
              effective_until: null,
              overrides_json: null,
            };
          }
          if (sql.includes("FROM steward_plan_definitions")) {
            return { entitlements_json: JSON.stringify(HOSTED_ENTITLEMENTS) };
          }
          if (sql.includes("FROM steward_account_profiles")) {
            if (sql.includes("LIMIT 1")) return { ok: 1 };
            return { account_id: ACCOUNT };
          }
          if (sql.includes("steward_web_push_subscriptions") && sql.includes("endpoint =")) {
            if (sql.includes("SELECT endpoint")) {
              return opts.existingEndpoint
                ? { endpoint: params[0], account_id: opts.existingAccountId ?? ACCOUNT }
                : null;
            }
            return null;
          }
          if (sql.includes("COUNT(*)") && sql.includes("steward_web_push_subscriptions")) {
            return { count: 0 };
          }
          return null;
        },
        run: async () => {
          if (sql.includes("DELETE FROM steward_web_push_subscriptions")) {
            deletes.push(params);
            return { success: true, meta: { changes: 1 } };
          }
          inserts.push(params);
          return { success: true, meta: { changes: 1 } };
        },
      }),
    }),
  } as unknown as D1Database & { inserts: unknown[][]; deletes: unknown[][] };
}

describe("parseStewardWebPushSubscribeBody", () => {
  it("accepts a valid PushSubscription JSON shape", () => {
    const body = parseStewardWebPushSubscribeBody({
      endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
      keys: { p256dh: "p256dh-key", auth: "auth-key" },
      expirationTime: null,
    });
    expect(body?.endpoint).toContain("fcm.googleapis.com");
    expect(body?.keys.p256dh).toBe("p256dh-key");
    expect(body?.expirationTime).toBeNull();
  });

  it("rejects missing keys", () => {
    expect(
      parseStewardWebPushSubscribeBody({
        endpoint: "https://example.com/push",
      })
    ).toBeNull();
  });

  it("rejects arbitrary HTTPS endpoints", () => {
    expect(
      parseStewardWebPushSubscribeBody({
        endpoint: "https://example.com/push",
        keys: { p256dh: "p256dh-key", auth: "auth-key" },
      })
    ).toBeNull();
    expect(isAllowedWebPushEndpoint("https://fcm.googleapis.com/fcm/send/abc")).toBe(
      true
    );
    expect(isAllowedWebPushEndpoint("http://fcm.googleapis.com/fcm/send/abc")).toBe(
      false
    );
  });
});

describe("parseStewardWebPushUnsubscribeBody", () => {
  it("accepts endpoint-only body", () => {
    expect(
      parseStewardWebPushUnsubscribeBody({
        endpoint: "https://fcm.googleapis.com/fcm/send/abc",
      })?.endpoint
    ).toContain("fcm.googleapis.com");
  });
});

describe("handlePostStewardWebPushSubscribe", () => {
  it("returns 501 when VAPID public key is not configured", async () => {
    const db = mockSubscribeDb({ webPushTable: true });
    const env: Env = { DB: db, HOSTED_STEWARD_ENABLED: "1" };
    const res = await handlePostStewardWebPushSubscribe(env, db, {
      accountId: ACCOUNT,
      deviceId: DEVICE,
      body: {
        endpoint: "https://fcm.googleapis.com/fcm/send/x",
        keys: { p256dh: "a", auth: "b" },
      },
    });
    expect(res.status).toBe(501);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe(WEB_PUSH_SUBSCRIBE_NOT_ENABLED);
  });

  it("persists subscription when configured", async () => {
    const db = mockSubscribeDb({ webPushTable: true });
    const env: Env = {
      DB: db,
      HOSTED_STEWARD_ENABLED: "1",
      STEWARD_VAPID_PUBLIC_KEY: VAPID_PUBLIC,
    };
    const res = await handlePostStewardWebPushSubscribe(env, db, {
      accountId: ACCOUNT,
      deviceId: DEVICE,
      body: {
        endpoint: "https://fcm.googleapis.com/fcm/send/x",
        keys: { p256dh: "p256dh-key", auth: "auth-key" },
      },
    });
    expect(res.status).toBe(200);
    expect(stewardWebPushSubscribeConfigured(env)).toBe(true);
    expect((db as D1Database & { inserts: unknown[][] }).inserts.length).toBeGreaterThan(0);
  });

  it("rejects an endpoint already registered to another account", async () => {
    const db = mockSubscribeDb({
      webPushTable: true,
      existingEndpoint: true,
      existingAccountId: "acc_other",
    });
    const env: Env = {
      DB: db,
      HOSTED_STEWARD_ENABLED: "1",
      STEWARD_VAPID_PUBLIC_KEY: VAPID_PUBLIC,
    };
    const res = await handlePostStewardWebPushSubscribe(env, db, {
      accountId: ACCOUNT,
      deviceId: DEVICE,
      body: {
        endpoint: "https://fcm.googleapis.com/fcm/send/x",
        keys: { p256dh: "p256dh-key", auth: "auth-key" },
      },
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("steward_web_push_endpoint_conflict");
  });

  it("removes subscription for account", async () => {
    const db = mockSubscribeDb({ webPushTable: true });
    const env: Env = {
      DB: db,
      HOSTED_STEWARD_ENABLED: "1",
      STEWARD_VAPID_PUBLIC_KEY: VAPID_PUBLIC,
    };
    const endpoint = "https://fcm.googleapis.com/fcm/send/remove-me";
    const res = await handleDeleteStewardWebPushSubscribe(env, db, {
      accountId: ACCOUNT,
      endpoint,
    });
    expect(res.status).toBe(200);
    expect((db as D1Database & { deletes: unknown[][] }).deletes.length).toBe(1);
  });
});

describe("handlePostStewardWebPushSubscribe route", () => {
  it("returns 401 without session", async () => {
    const db = mockSubscribeDb({ webPushTable: true });
    const env: Env = {
      DB: db,
      HOSTED_STEWARD_ENABLED: "1",
      STEWARD_VAPID_PUBLIC_KEY: VAPID_PUBLIC,
    };
    const res = await handlePostStewardWebPushSubscribeRoute(
      new Request(
        "https://humanity.llc/.well-known/hc/v1/steward/push/subscribe",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: "https://fcm.googleapis.com/fcm/send/x",
            keys: { p256dh: "a", auth: "b" },
          }),
        }
      ),
      env,
      db
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid body", async () => {
    const db = mockSubscribeDb({ webPushTable: true });
    const env: Env = {
      DB: db,
      HOSTED_STEWARD_ENABLED: "1",
      STEWARD_VAPID_PUBLIC_KEY: VAPID_PUBLIC,
    };
    const res = await handlePostStewardWebPushSubscribeRoute(
      new Request(
        "https://humanity.llc/.well-known/hc/v1/steward/push/subscribe",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer tok",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ endpoint: "https://example.com/push" }),
        }
      ),
      env,
      db
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 for DELETE unsubscribe with session", async () => {
    const db = mockSubscribeDb({ webPushTable: true });
    const env: Env = {
      DB: db,
      HOSTED_STEWARD_ENABLED: "1",
      STEWARD_VAPID_PUBLIC_KEY: VAPID_PUBLIC,
    };
    const res = await handleDeleteStewardWebPushSubscribeRoute(
      new Request(
        "https://humanity.llc/.well-known/hc/v1/steward/push/subscribe",
        {
          method: "DELETE",
          headers: {
            Authorization: "Bearer tok",
            "Content-Type": "application/json",
            "X-HC-Device-Id": DEVICE,
          },
          body: JSON.stringify({
            endpoint: "https://fcm.googleapis.com/fcm/send/x",
          }),
        }
      ),
      env,
      db
    );
    expect(res.status).toBe(200);
  });
});
