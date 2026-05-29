import {
  effectiveEntitlementsForAccount,
  parseEntitlementsJson,
  type StewardAccountRow,
  type EntitlementMap,
} from "./plans";
import type { StewardBillingAccountUpdate } from "./billing-lifecycle";
import {
  shouldExpireCanceledAccount,
  shouldExpirePastDueAccount,
  stewardUpdateForExpiredAccount,
} from "./billing-lifecycle";
import { closeStewardPushConnectionsForAccount } from "./push";

const STEWARD_TABLE = "steward_accounts";

const STEWARD_PUSH_TABLES = [
  STEWARD_TABLE,
  "steward_account_profiles",
  "steward_usage_counters",
] as const;

export async function stewardSchemaReady(db: D1Database): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`
    )
    .bind(STEWARD_TABLE)
    .first();
  return !!row;
}

/** Push fan-out needs profiles linkage + usage metering tables (migration 0012). */
export async function stewardPushSchemaReady(db: D1Database): Promise<boolean> {
  for (const name of STEWARD_PUSH_TABLES) {
    const row = await db
      .prepare(
        `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`
      )
      .bind(name)
      .first();
    if (!row) return false;
  }
  return true;
}

export async function getPlanEntitlements(
  db: D1Database,
  planId: string,
  planVersion: number
): Promise<EntitlementMap | null> {
  const row = await db
    .prepare(
      `SELECT entitlements_json FROM steward_plan_definitions
       WHERE plan_id = ? AND plan_version = ?`
    )
    .bind(planId, planVersion)
    .first<{ entitlements_json: string }>();
  if (!row) return null;
  return parseEntitlementsJson(row.entitlements_json);
}

export async function getAccount(
  db: D1Database,
  accountId: string
): Promise<StewardAccountRow | null> {
  return db
    .prepare(
      `SELECT account_id, plan_id, plan_version, status, effective_from, effective_until,
              overrides_json, billing_customer_id, billing_subscription_id
       FROM steward_accounts WHERE account_id = ?`
    )
    .bind(accountId)
    .first<StewardAccountRow>();
}

export async function getAccountByBillingCustomer(
  db: D1Database,
  customerId: string
): Promise<StewardAccountRow | null> {
  return db
    .prepare(
      `SELECT account_id, plan_id, plan_version, status, effective_from, effective_until,
              overrides_json, billing_customer_id, billing_subscription_id
       FROM steward_accounts WHERE billing_customer_id = ?`
    )
    .bind(customerId)
    .first<StewardAccountRow>();
}

export async function getAccountByBillingSubscription(
  db: D1Database,
  subscriptionId: string
): Promise<StewardAccountRow | null> {
  return db
    .prepare(
      `SELECT account_id, plan_id, plan_version, status, effective_from, effective_until,
              overrides_json, billing_customer_id, billing_subscription_id
       FROM steward_accounts WHERE billing_subscription_id = ?`
    )
    .bind(subscriptionId)
    .first<StewardAccountRow>();
}

/**
 * Apply billing webhook lifecycle to an existing steward account (E5).
 * Account must already exist (session link); commerce cannot create hosted rows.
 */
export async function applyStewardBillingUpdate(
  db: D1Database,
  update: StewardBillingAccountUpdate & {
    billing_subscription_id?: string | null;
  }
): Promise<boolean> {
  const existing = await getAccount(db, update.account_id);
  if (!existing) return false;

  const now = new Date().toISOString();
  const subId =
    update.billing_subscription_id === undefined
      ? existing.billing_subscription_id ?? null
      : update.billing_subscription_id || null;

  await db
    .prepare(
      `UPDATE steward_accounts SET
        plan_id = ?,
        plan_version = ?,
        status = ?,
        effective_from = ?,
        effective_until = ?,
        billing_customer_id = ?,
        billing_subscription_id = ?,
        updated_at = ?
       WHERE account_id = ?`
    )
    .bind(
      update.plan_id,
      update.plan_version,
      update.status,
      update.effective_from,
      update.effective_until,
      update.billing_customer_id || existing.billing_customer_id || null,
      subId,
      now,
      update.account_id
    )
    .run();
  return true;
}

/** E5.4 — revoke steward sessions on expired. */
export async function revokeAllSessionsForAccount(
  db: D1Database,
  accountId: string
): Promise<void> {
  await db
    .prepare(`DELETE FROM steward_sessions WHERE account_id = ?`)
    .bind(accountId)
    .run();
}

/**
 * Lazy lifecycle transitions on entitlement fetch (past_due grace, canceled period end).
 */
export async function applyStewardLifecycleTransitions(
  db: D1Database,
  accountId: string
): Promise<StewardAccountRow | null> {
  const account = await getAccount(db, accountId);
  if (!account) return null;

  const now = Date.now();
  if (
    shouldExpirePastDueAccount(account, now) ||
    shouldExpireCanceledAccount(account, now)
  ) {
    const expired = stewardUpdateForExpiredAccount(account, now);
    await db
      .prepare(
        `UPDATE steward_accounts SET
          plan_id = ?,
          status = ?,
          effective_from = ?,
          effective_until = NULL,
          updated_at = ?
         WHERE account_id = ?`
      )
      .bind(
        expired.plan_id,
        expired.status,
        expired.effective_from,
        new Date(now).toISOString(),
        accountId
      )
      .run();
    await revokeAllSessionsForAccount(db, accountId);
    closeStewardPushConnectionsForAccount(accountId);
    return getAccount(db, accountId);
  }

  return account;
}

export async function upsertAccount(
  db: D1Database,
  account: {
    account_id: string;
    plan_id: string;
    plan_version: number;
    status: StewardAccountRow["status"];
    effective_from: string;
    effective_until: string | null;
  }
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO steward_accounts (
        account_id, plan_id, plan_version, status, effective_from, effective_until,
        overrides_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)
      ON CONFLICT(account_id) DO UPDATE SET
        updated_at = excluded.updated_at`
    )
    .bind(
      account.account_id,
      account.plan_id,
      account.plan_version,
      account.status,
      account.effective_from,
      account.effective_until,
      now,
      now
    )
    .run();
}

export async function linkProfileToAccount(
  db: D1Database,
  accountId: string,
  profileId: string,
  linkedAt: string
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO steward_account_profiles (account_id, profile_id, linked_at)
       VALUES (?, ?, ?)
       ON CONFLICT(account_id, profile_id) DO NOTHING`
    )
    .bind(accountId, profileId, linkedAt)
    .run();
}

export async function profileLinkedAccount(
  db: D1Database,
  profileId: string
): Promise<string | null> {
  const row = await db
    .prepare(
      `SELECT account_id FROM steward_account_profiles WHERE profile_id = ?`
    )
    .bind(profileId)
    .first<{ account_id: string }>();
  return row?.account_id ?? null;
}

export async function accountHasLinkedProfile(
  db: D1Database,
  accountId: string
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT 1 AS ok FROM steward_account_profiles WHERE account_id = ? LIMIT 1`
    )
    .bind(accountId)
    .first();
  return !!row;
}

export async function stewardLinkNonceUsed(
  db: D1Database,
  nonce: string
): Promise<boolean> {
  const row = await db
    .prepare(`SELECT 1 FROM steward_link_nonces WHERE nonce = ?`)
    .bind(nonce)
    .first();
  return !!row;
}

export async function consumeStewardLinkNonce(
  db: D1Database,
  nonce: string,
  usedAt: string
): Promise<void> {
  await db
    .prepare(`INSERT INTO steward_link_nonces (nonce, used_at) VALUES (?, ?)`)
    .bind(nonce, usedAt)
    .run();
}

export async function insertSession(
  db: D1Database,
  tokenHash: string,
  accountId: string,
  deviceId: string | null,
  expiresAt: string
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO steward_sessions (token_hash, account_id, device_id, expires_at, created_at, last_seen_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(tokenHash, accountId, deviceId, expiresAt, now, now)
    .run();
}

export interface SessionRow {
  token_hash: string;
  account_id: string;
  device_id: string | null;
  expires_at: string;
}

export async function getSessionByTokenHash(
  db: D1Database,
  tokenHash: string
): Promise<SessionRow | null> {
  return db
    .prepare(
      `SELECT token_hash, account_id, device_id, expires_at FROM steward_sessions WHERE token_hash = ?`
    )
    .bind(tokenHash)
    .first<SessionRow>();
}

export async function touchSession(
  db: D1Database,
  tokenHash: string,
  expiresAt: string
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE steward_sessions SET last_seen_at = ?, expires_at = ? WHERE token_hash = ?`
    )
    .bind(now, expiresAt, tokenHash)
    .run();
}

export async function resolveEffectiveEntitlements(
  db: D1Database,
  accountId: string
): Promise<{ account: StewardAccountRow; entitlements: EntitlementMap } | null> {
  const account = await getAccount(db, accountId);
  if (!account) return null;
  const plan = await getPlanEntitlements(db, account.plan_id, account.plan_version);
  if (!plan) return null;
  return {
    account,
    entitlements: effectiveEntitlementsForAccount(plan, account),
  };
}

export async function getUsageCount(
  db: D1Database,
  accountId: string,
  deviceId: string,
  event: string,
  windowKey: string
): Promise<number> {
  const row = await db
    .prepare(
      `SELECT count FROM steward_usage_counters
       WHERE account_id = ? AND device_id = ? AND event = ? AND window_key = ?`
    )
    .bind(accountId, deviceId, event, windowKey)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

export async function incrementUsage(
  db: D1Database,
  accountId: string,
  deviceId: string,
  event: string,
  windowKey: string
): Promise<number> {
  await db
    .prepare(
      `INSERT INTO steward_usage_counters (account_id, device_id, event, window_key, count)
       VALUES (?, ?, ?, ?, 1)
       ON CONFLICT(account_id, device_id, event, window_key)
       DO UPDATE SET count = count + 1`
    )
    .bind(accountId, deviceId, event, windowKey)
    .run();
  return getUsageCount(db, accountId, deviceId, event, windowKey);
}

export async function listPublicPlans(db: D1Database): Promise<
  Array<{
    plan_id: string;
    plan_version: number;
    description: string | null;
    entitlements_json: string;
  }>
> {
  const { results } = await db
    .prepare(
      `SELECT plan_id, plan_version, description, entitlements_json
       FROM steward_plan_definitions ORDER BY plan_id`
    )
    .all<{
      plan_id: string;
      plan_version: number;
      description: string | null;
      entitlements_json: string;
    }>();
  return results ?? [];
}
