import type { Env } from "../env";
import {
  OPERATOR_REQUEST_EVENT,
  operatorHealthDegradedByBudget,
  operatorRequestBudgetEnabled,
  operatorRequestHardCap,
  operatorRequestSoftCap,
  operatorRequestWindowKey,
  resolveOperatorRequestBudgetState,
  type OperatorRequestBudgetState,
} from "./request-budget-core";

export type OperatorRequestBudgetSnapshot = {
  enabled: boolean;
  count: number;
  softCap: number;
  hardCap: number;
  windowKey: string;
  state: OperatorRequestBudgetState;
};

async function operatorUsageTableReady(db: D1Database): Promise<boolean> {
  try {
    const row = await db
      .prepare(
        `SELECT 1 AS ok FROM sqlite_master
         WHERE type = 'table' AND name = 'operator_usage_counters'`
      )
      .first<{ ok: number }>();
    return row?.ok === 1;
  } catch {
    return false;
  }
}

export async function getOperatorRequestCount(
  db: D1Database,
  event: string,
  windowKey: string
): Promise<number> {
  if (!(await operatorUsageTableReady(db))) return 0;
  const row = await db
    .prepare(
      `SELECT count FROM operator_usage_counters
       WHERE event = ? AND window_key = ?`
    )
    .bind(event, windowKey)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

export async function incrementOperatorRequestCount(
  db: D1Database,
  event: string,
  windowKey: string
): Promise<number> {
  if (!(await operatorUsageTableReady(db))) return 0;
  await db
    .prepare(
      `INSERT INTO operator_usage_counters (event, window_key, count)
       VALUES (?, ?, 1)
       ON CONFLICT(event, window_key)
       DO UPDATE SET count = count + 1`
    )
    .bind(event, windowKey)
    .run();
  return getOperatorRequestCount(db, event, windowKey);
}

export async function readOperatorRequestBudget(
  env: Env,
  db: D1Database,
  now = new Date()
): Promise<OperatorRequestBudgetSnapshot> {
  const softCap = operatorRequestSoftCap(env);
  const hardCap = operatorRequestHardCap(env);
  const windowKey = operatorRequestWindowKey(now);
  const enabled = operatorRequestBudgetEnabled(env);

  if (!enabled) {
    return {
      enabled: false,
      count: 0,
      softCap,
      hardCap,
      windowKey,
      state: "ok",
    };
  }

  const count = await getOperatorRequestCount(
    db,
    OPERATOR_REQUEST_EVENT,
    windowKey
  );
  return {
    enabled: true,
    count,
    softCap,
    hardCap,
    windowKey,
    state: resolveOperatorRequestBudgetState(count, softCap, hardCap),
  };
}

export function recordOperatorRequestIfEnabled(
  env: Env,
  ctx: ExecutionContext,
  now = new Date()
): void {
  if (!env.DB || !operatorRequestBudgetEnabled(env)) return;
  if (typeof ctx?.waitUntil !== "function") return;
  const windowKey = operatorRequestWindowKey(now);
  ctx.waitUntil(
    incrementOperatorRequestCount(env.DB, OPERATOR_REQUEST_EVENT, windowKey).catch(
      (err) => {
        console.error("operator_request_budget_increment_failed", err);
      }
    )
  );
}

export { operatorHealthDegradedByBudget };
