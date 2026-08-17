import { describe, expect, it } from "vitest";

import type { StewardWebPushSubscribeBody } from "../src/steward/web-push-subscribe";
import {
  STEWARD_WEB_PUSH_TABLE,
  countStewardWebPushSubscriptions,
  deleteStewardWebPushSubscription,
  deleteStewardWebPushSubscriptionForAccount,
  deleteStewardWebPushSubscriptionsForAccount,
  listStewardWebPushSubscriptions,
  stewardWebPushSchemaReady,
  upsertStewardWebPushSubscription,
  type StewardWebPushSubscriptionRow,
} from "../src/steward/web-push-db";

const ACC_A = "acc_web_push_iso_a";
const ACC_B = "acc_web_push_iso_b";
const ENDPOINT_A = "https://fcm.googleapis.com/fcm/send/iso-a";
const ENDPOINT_B = "https://fcm.googleapis.com/fcm/send/iso-b";
const ENDPOINT_SHARED = "https://fcm.googleapis.com/fcm/send/iso-shared";

function body(
  endpoint: string,
  overrides: Partial<StewardWebPushSubscribeBody> = {}
): StewardWebPushSubscribeBody {
  return {
    endpoint,
    keys: { p256dh: "p256dh-iso", auth: "auth-iso" },
    expirationTime: null,
    ...overrides,
  };
}

class WebPushIsolationDb {
  schemaReady = true;
  rows = new Map<string, StewardWebPushSubscriptionRow>();

  prepare(sql: string) {
    const db = this;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
            if (sql.includes("sqlite_master")) {
              const table = String(args[0]);
              if (table === STEWARD_WEB_PUSH_TABLE && db.schemaReady) {
                return { 1: 1 } as T;
              }
              return null as T | null;
            }
            if (sql.includes("SELECT COUNT(*)") && sql.includes("account_id = ?")) {
              const accountId = String(args[0]);
              let count = 0;
              for (const row of db.rows.values()) {
                if (row.account_id === accountId) count += 1;
              }
              return { count } as T;
            }
            if (sql.includes("SELECT endpoint FROM") && sql.includes("endpoint = ?")) {
              const endpoint = String(args[0]);
              const row = db.rows.get(endpoint);
              return (row ? { endpoint: row.endpoint } : null) as T | null;
            }
            return null as T | null;
          },
          async all<T>() {
            if (sql.includes("WHERE account_id = ?") && sql.includes("SELECT endpoint")) {
              const accountId = String(args[0]);
              const results = [...db.rows.values()].filter(
                (row) => row.account_id === accountId
              );
              return { results: results as T[] };
            }
            return { results: [] as T[] };
          },
          async run() {
            if (sql.includes("INSERT INTO")) {
              const [
                endpoint,
                accountId,
                deviceId,
                p256dh,
                authKey,
                expirationTime,
                createdAt,
                updatedAt,
              ] = args as [
                string,
                string,
                string,
                string,
                string,
                number | null,
                string,
                string,
              ];
              db.rows.set(endpoint, {
                endpoint,
                account_id: accountId,
                device_id: deviceId,
                p256dh,
                auth_key: authKey,
                expiration_time: expirationTime,
                created_at: createdAt,
                updated_at: updatedAt,
              });
              return { meta: { changes: 1 } };
            }
            if (sql.includes("UPDATE") && sql.includes("WHERE endpoint = ?")) {
              const [
                accountId,
                deviceId,
                p256dh,
                authKey,
                expirationTime,
                updatedAt,
                endpoint,
              ] = args as [
                string,
                string,
                string,
                string,
                number | null,
                string,
                string,
              ];
              const existing = db.rows.get(endpoint);
              if (!existing) return { meta: { changes: 0 } };
              db.rows.set(endpoint, {
                ...existing,
                account_id: accountId,
                device_id: deviceId,
                p256dh,
                auth_key: authKey,
                expiration_time: expirationTime,
                updated_at: updatedAt,
              });
              return { meta: { changes: 1 } };
            }
            if (sql.includes("DELETE FROM") && sql.includes("endpoint = ? AND account_id = ?")) {
              const endpoint = String(args[0]);
              const accountId = String(args[1]);
              const existing = db.rows.get(endpoint);
              if (!existing || existing.account_id !== accountId) {
                return { meta: { changes: 0 } };
              }
              db.rows.delete(endpoint);
              return { meta: { changes: 1 } };
            }
            if (sql.includes("DELETE FROM") && sql.includes("WHERE endpoint = ?")) {
              const endpoint = String(args[0]);
              const existed = db.rows.delete(endpoint);
              return { meta: { changes: existed ? 1 : 0 } };
            }
            if (sql.includes("DELETE FROM") && sql.includes("WHERE account_id = ?")) {
              const accountId = String(args[0]);
              let changes = 0;
              for (const [endpoint, row] of db.rows) {
                if (row.account_id === accountId) {
                  db.rows.delete(endpoint);
                  changes += 1;
                }
              }
              return { meta: { changes } };
            }
            return { meta: { changes: 0 } };
          },
        };
      },
    };
  }
}

function db(): WebPushIsolationDb & D1Database {
  return new WebPushIsolationDb() as WebPushIsolationDb & D1Database;
}

describe("web-push subscription isolation", () => {
  it("reports schema readiness from sqlite_master", async () => {
    const store = db();
    expect(await stewardWebPushSchemaReady(store)).toBe(true);
    store.schemaReady = false;
    expect(await stewardWebPushSchemaReady(store)).toBe(false);
  });

  it("lists and counts subscriptions only for the requested account", async () => {
    const store = db();
    await upsertStewardWebPushSubscription(store, {
      accountId: ACC_A,
      deviceId: "dev_a",
      body: body(ENDPOINT_A),
      now: "2026-08-17T10:00:00.000Z",
    });
    await upsertStewardWebPushSubscription(store, {
      accountId: ACC_B,
      deviceId: "dev_b",
      body: body(ENDPOINT_B),
      now: "2026-08-17T10:01:00.000Z",
    });

    expect(await countStewardWebPushSubscriptions(store, ACC_A)).toBe(1);
    expect(await countStewardWebPushSubscriptions(store, ACC_B)).toBe(1);
    expect(await listStewardWebPushSubscriptions(store, ACC_A)).toEqual([
      expect.objectContaining({
        endpoint: ENDPOINT_A,
        account_id: ACC_A,
        device_id: "dev_a",
      }),
    ]);
    expect(await listStewardWebPushSubscriptions(store, ACC_B)).toEqual([
      expect.objectContaining({
        endpoint: ENDPOINT_B,
        account_id: ACC_B,
      }),
    ]);
  });

  it("account-scoped delete leaves a neighbor account's matching-shaped endpoint", async () => {
    const store = db();
    await upsertStewardWebPushSubscription(store, {
      accountId: ACC_A,
      deviceId: "dev_a",
      body: body(ENDPOINT_A),
      now: "2026-08-17T10:00:00.000Z",
    });
    await upsertStewardWebPushSubscription(store, {
      accountId: ACC_B,
      deviceId: "dev_b",
      body: body(ENDPOINT_B),
      now: "2026-08-17T10:01:00.000Z",
    });

    expect(
      await deleteStewardWebPushSubscriptionForAccount(store, ACC_B, ENDPOINT_A)
    ).toBe(false);
    expect(store.rows.has(ENDPOINT_A)).toBe(true);

    expect(
      await deleteStewardWebPushSubscriptionForAccount(store, ACC_A, ENDPOINT_A)
    ).toBe(true);
    expect(store.rows.has(ENDPOINT_A)).toBe(false);
    expect(store.rows.get(ENDPOINT_B)?.account_id).toBe(ACC_B);
  });

  it("bulk account delete is a no-op when the table is missing", async () => {
    const store = db();
    await upsertStewardWebPushSubscription(store, {
      accountId: ACC_A,
      deviceId: "dev_a",
      body: body(ENDPOINT_A),
      now: "2026-08-17T10:00:00.000Z",
    });
    store.schemaReady = false;

    expect(await deleteStewardWebPushSubscriptionsForAccount(store, ACC_A)).toBe(0);
    expect(store.rows.has(ENDPOINT_A)).toBe(true);
  });

  it("bulk account delete removes only that account's rows", async () => {
    const store = db();
    await upsertStewardWebPushSubscription(store, {
      accountId: ACC_A,
      deviceId: "dev_a1",
      body: body(ENDPOINT_A),
      now: "2026-08-17T10:00:00.000Z",
    });
    await upsertStewardWebPushSubscription(store, {
      accountId: ACC_A,
      deviceId: "dev_a2",
      body: body(`${ENDPOINT_A}-2`),
      now: "2026-08-17T10:00:30.000Z",
    });
    await upsertStewardWebPushSubscription(store, {
      accountId: ACC_B,
      deviceId: "dev_b",
      body: body(ENDPOINT_B),
      now: "2026-08-17T10:01:00.000Z",
    });

    expect(await deleteStewardWebPushSubscriptionsForAccount(store, ACC_A)).toBe(2);
    expect(await listStewardWebPushSubscriptions(store, ACC_A)).toEqual([]);
    expect(await listStewardWebPushSubscriptions(store, ACC_B)).toHaveLength(1);
  });

  it("unscoped endpoint delete removes the row regardless of account", async () => {
    const store = db();
    await upsertStewardWebPushSubscription(store, {
      accountId: ACC_A,
      deviceId: "dev_a",
      body: body(ENDPOINT_A),
      now: "2026-08-17T10:00:00.000Z",
    });
    await deleteStewardWebPushSubscription(store, ENDPOINT_A);
    expect(store.rows.has(ENDPOINT_A)).toBe(false);
  });

  it("upsert of an existing endpoint reassigns account and rotates keys", async () => {
    const store = db();
    await upsertStewardWebPushSubscription(store, {
      accountId: ACC_A,
      deviceId: "dev_a",
      body: body(ENDPOINT_SHARED, {
        keys: { p256dh: "old-p256dh", auth: "old-auth" },
      }),
      now: "2026-08-17T10:00:00.000Z",
    });

    const result = await upsertStewardWebPushSubscription(store, {
      accountId: ACC_B,
      deviceId: "dev_b",
      body: body(ENDPOINT_SHARED, {
        keys: { p256dh: "new-p256dh", auth: "new-auth" },
        expirationTime: 1_777_000_000_000,
      }),
      now: "2026-08-17T10:05:00.000Z",
    });

    expect(result).toEqual({ ok: true });
    expect(store.rows.size).toBe(1);
    expect(store.rows.get(ENDPOINT_SHARED)).toEqual({
      endpoint: ENDPOINT_SHARED,
      account_id: ACC_B,
      device_id: "dev_b",
      p256dh: "new-p256dh",
      auth_key: "new-auth",
      expiration_time: 1_777_000_000_000,
      created_at: "2026-08-17T10:00:00.000Z",
      updated_at: "2026-08-17T10:05:00.000Z",
    });
    expect(await listStewardWebPushSubscriptions(store, ACC_A)).toEqual([]);
    expect(await listStewardWebPushSubscriptions(store, ACC_B)).toHaveLength(1);
  });
});
