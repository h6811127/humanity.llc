import { describe, expect, it } from "vitest";

import {
  STEWARD_WEB_PUSH_MAX_SUBSCRIPTIONS_PER_ACCOUNT,
  upsertStewardWebPushSubscription,
} from "../src/steward/web-push-db";

type MockOpts = {
  count: number;
  existingEndpoint?: string | null;
};

function mockDb(opts: MockOpts) {
  const inserts: unknown[][] = [];
  const updates: unknown[][] = [];
  return {
    inserts,
    updates,
    prepare(sql: string) {
      return {
        bind(...params: unknown[]) {
          return {
            async first() {
              if (sql.includes("SELECT endpoint") && sql.includes("endpoint =")) {
                return opts.existingEndpoint
                  ? { endpoint: opts.existingEndpoint }
                  : null;
              }
              if (sql.includes("COUNT(*)")) {
                return { count: opts.count };
              }
              return null;
            },
            async run() {
              if (sql.includes("INSERT INTO")) {
                inserts.push(params);
              } else if (sql.includes("UPDATE")) {
                updates.push(params);
              }
              return { success: true, meta: { changes: 1 } };
            },
          };
        },
      };
    },
  } as unknown as D1Database & {
    inserts: unknown[][];
    updates: unknown[][];
  };
}

const BODY = {
  endpoint: "https://fcm.googleapis.com/fcm/send/limit-test",
  keys: { p256dh: "p256dh-key", auth: "auth-key" },
  expirationTime: null as number | null,
};

describe("upsertStewardWebPushSubscription fair-use cap", () => {
  it("exposes the account subscription ceiling", () => {
    expect(STEWARD_WEB_PUSH_MAX_SUBSCRIPTIONS_PER_ACCOUNT).toBe(10);
  });

  it("rejects a new endpoint once the account is at the cap", async () => {
    const db = mockDb({ count: STEWARD_WEB_PUSH_MAX_SUBSCRIPTIONS_PER_ACCOUNT });
    const result = await upsertStewardWebPushSubscription(db, {
      accountId: "acc_push_cap",
      deviceId: "dev_push_cap",
      body: BODY,
      now: "2026-08-12T10:00:00.000Z",
    });
    expect(result).toEqual({ ok: false, reason: "subscription_limit" });
    expect(db.inserts).toHaveLength(0);
    expect(db.updates).toHaveLength(0);
  });

  it("allows insert when under the cap", async () => {
    const db = mockDb({ count: STEWARD_WEB_PUSH_MAX_SUBSCRIPTIONS_PER_ACCOUNT - 1 });
    const result = await upsertStewardWebPushSubscription(db, {
      accountId: "acc_push_cap",
      deviceId: "dev_push_cap",
      body: BODY,
      now: "2026-08-12T10:00:00.000Z",
    });
    expect(result).toEqual({ ok: true });
    expect(db.inserts).toHaveLength(1);
  });

  it("updates an existing endpoint without counting against the insert cap", async () => {
    const db = mockDb({
      count: STEWARD_WEB_PUSH_MAX_SUBSCRIPTIONS_PER_ACCOUNT,
      existingEndpoint: BODY.endpoint,
    });
    const result = await upsertStewardWebPushSubscription(db, {
      accountId: "acc_push_cap",
      deviceId: "dev_push_cap_2",
      body: {
        ...BODY,
        keys: { p256dh: "rotated-p256dh", auth: "rotated-auth" },
      },
      now: "2026-08-12T10:05:00.000Z",
    });
    expect(result).toEqual({ ok: true });
    expect(db.inserts).toHaveLength(0);
    expect(db.updates).toHaveLength(1);
  });
});
