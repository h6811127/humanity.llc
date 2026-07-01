/**
 * D1 persistence for Tier 2 Web Push subscriptions.
 */
import type { StewardWebPushSubscribeBody } from "./web-push-subscribe";

export const STEWARD_WEB_PUSH_TABLE = "steward_web_push_subscriptions";

/** Fair-use cap per steward account (devices/browsers). */
export const STEWARD_WEB_PUSH_MAX_SUBSCRIPTIONS_PER_ACCOUNT = 10;

export interface StewardWebPushSubscriptionRow {
  endpoint: string;
  account_id: string;
  device_id: string;
  p256dh: string;
  auth_key: string;
  expiration_time: number | null;
  created_at: string;
  updated_at: string;
}

export async function stewardWebPushSchemaReady(db: D1Database): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`
    )
    .bind(STEWARD_WEB_PUSH_TABLE)
    .first();
  return !!row;
}

export async function countStewardWebPushSubscriptions(
  db: D1Database,
  accountId: string
): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS count FROM ${STEWARD_WEB_PUSH_TABLE} WHERE account_id = ?`
    )
    .bind(accountId)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

export async function listStewardWebPushSubscriptions(
  db: D1Database,
  accountId: string
): Promise<StewardWebPushSubscriptionRow[]> {
  const { results } = await db
    .prepare(
      `SELECT endpoint, account_id, device_id, p256dh, auth_key, expiration_time,
              created_at, updated_at
       FROM ${STEWARD_WEB_PUSH_TABLE}
       WHERE account_id = ?`
    )
    .bind(accountId)
    .all<StewardWebPushSubscriptionRow>();
  return results ?? [];
}

export async function upsertStewardWebPushSubscription(
  db: D1Database,
  input: {
    accountId: string;
    deviceId: string;
    body: StewardWebPushSubscribeBody;
    now?: string;
  }
): Promise<
  | { ok: true }
  | { ok: false; reason: "subscription_limit" | "endpoint_conflict" }
> {
  const now = input.now ?? new Date().toISOString();
  const existing = await db
    .prepare(
      `SELECT endpoint, account_id FROM ${STEWARD_WEB_PUSH_TABLE} WHERE endpoint = ?`
    )
    .bind(input.body.endpoint)
    .first<{ endpoint: string; account_id: string }>();

  if (!existing) {
    const count = await countStewardWebPushSubscriptions(db, input.accountId);
    if (count >= STEWARD_WEB_PUSH_MAX_SUBSCRIPTIONS_PER_ACCOUNT) {
      return { ok: false, reason: "subscription_limit" };
    }
    await db
      .prepare(
        `INSERT INTO ${STEWARD_WEB_PUSH_TABLE}
         (endpoint, account_id, device_id, p256dh, auth_key, expiration_time, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        input.body.endpoint,
        input.accountId,
        input.deviceId,
        input.body.keys.p256dh,
        input.body.keys.auth,
        input.body.expirationTime ?? null,
        now,
        now
      )
      .run();
    return { ok: true };
  }

  if (existing.account_id !== input.accountId) {
    return { ok: false, reason: "endpoint_conflict" };
  }

  await db
    .prepare(
      `UPDATE ${STEWARD_WEB_PUSH_TABLE}
       SET device_id = ?, p256dh = ?, auth_key = ?,
           expiration_time = ?, updated_at = ?
       WHERE endpoint = ?`
    )
    .bind(
      input.deviceId,
      input.body.keys.p256dh,
      input.body.keys.auth,
      input.body.expirationTime ?? null,
      now,
      input.body.endpoint
    )
    .run();
  return { ok: true };
}

export async function deleteStewardWebPushSubscription(
  db: D1Database,
  endpoint: string
): Promise<void> {
  await db
    .prepare(`DELETE FROM ${STEWARD_WEB_PUSH_TABLE} WHERE endpoint = ?`)
    .bind(endpoint)
    .run();
}

export async function deleteStewardWebPushSubscriptionForAccount(
  db: D1Database,
  accountId: string,
  endpoint: string
): Promise<boolean> {
  const result = await db
    .prepare(
      `DELETE FROM ${STEWARD_WEB_PUSH_TABLE} WHERE endpoint = ? AND account_id = ?`
    )
    .bind(endpoint, accountId)
    .run();
  return (result.meta?.changes ?? 0) > 0;
}

export async function deleteStewardWebPushSubscriptionsForAccount(
  db: D1Database,
  accountId: string
): Promise<number> {
  if (!(await stewardWebPushSchemaReady(db))) return 0;
  const result = await db
    .prepare(`DELETE FROM ${STEWARD_WEB_PUSH_TABLE} WHERE account_id = ?`)
    .bind(accountId)
    .run();
  return result.meta?.changes ?? 0;
}
