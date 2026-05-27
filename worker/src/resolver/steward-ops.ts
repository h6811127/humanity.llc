import { operatorAuditAuthorized } from "../http/operator-auth";
import { errorResponse, jsonResponse } from "../http/resolver";
import { hostedStewardEnabled } from "../steward/config";
import { stewardSchemaReady } from "../steward/db";
import {
  STEWARD_PUSH_MAX_CONNECTIONS_PER_ACCOUNT,
  STEWARD_PUSH_MAX_CONNECTIONS_PER_IP,
  stewardPushConnectionSummary,
} from "../steward/push";
import { utcDayKey } from "../steward/plans";
import type { Env } from "../index";

const AUTO_POLL_EVENT = "poll.live_proof.auto";
const PUSH_DELIVERED_EVENT = "notify.push.delivered";
const HOSTED_AUTO_POLL_SOFT_DAILY_CAP = 50_000;
const HOSTED_AUTO_POLL_HARD_DAILY_CAP = 100_000;
const HOSTED_PUSH_DELIVERED_DAILY_CAP = 10_000;

type StewardOpsAlert = {
  severity: "warning" | "critical";
  code: string;
  account_id: string;
  event: string;
  count: number;
  threshold: number;
  devices: number;
  message: string;
};

function parseDayKey(raw: string | null, now = new Date()): string | null {
  if (raw === null || raw === "") return utcDayKey(now);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

async function accountStatusCounts(db: D1Database): Promise<
  Array<{ plan_id: string; status: string; accounts: number }>
> {
  const { results } = await db
    .prepare(
      `SELECT plan_id, status, COUNT(*) AS accounts
       FROM steward_accounts
       GROUP BY plan_id, status
       ORDER BY plan_id, status`
    )
    .all<{ plan_id: string; status: string; accounts: number }>();
  return results ?? [];
}

async function activeSessionCount(db: D1Database, nowIso: string): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS sessions
       FROM steward_sessions
       WHERE expires_at > ?`
    )
    .bind(nowIso)
    .first<{ sessions: number }>();
  return row?.sessions ?? 0;
}

async function usageCountersForDay(db: D1Database, dayKey: string): Promise<
  Array<{
    event: string;
    count: number;
    accounts: number;
    devices: number;
  }>
> {
  const { results } = await db
    .prepare(
      `SELECT event,
              SUM(count) AS count,
              COUNT(DISTINCT account_id) AS accounts,
              COUNT(DISTINCT device_id) AS devices
       FROM steward_usage_counters
       WHERE window_key = ?
       GROUP BY event
       ORDER BY event`
    )
    .bind(dayKey)
    .all<{
      event: string;
      count: number;
      accounts: number;
      devices: number;
    }>();
  return results ?? [];
}

async function usageAlertInputsForDay(db: D1Database, dayKey: string): Promise<
  Array<{
    account_id: string;
    event: string;
    count: number;
    devices: number;
  }>
> {
  const { results } = await db
    .prepare(
      `SELECT account_id,
              event,
              SUM(count) AS count,
              COUNT(DISTINCT device_id) AS devices
       FROM steward_usage_counters
       WHERE window_key = ?
         AND event IN (?, ?)
       GROUP BY account_id, event
       ORDER BY count DESC`
    )
    .bind(dayKey, AUTO_POLL_EVENT, PUSH_DELIVERED_EVENT)
    .all<{
      account_id: string;
      event: string;
      count: number;
      devices: number;
    }>();
  return results ?? [];
}

function usageAlertsForRows(
  rows: Array<{
    account_id: string;
    event: string;
    count: number;
    devices: number;
  }>
): StewardOpsAlert[] {
  const alerts: StewardOpsAlert[] = [];
  for (const row of rows) {
    if (row.event === AUTO_POLL_EVENT) {
      if (row.count >= HOSTED_AUTO_POLL_HARD_DAILY_CAP) {
        alerts.push({
          severity: "critical" as const,
          code: "hosted_auto_poll_hard_cap",
          account_id: row.account_id,
          event: row.event,
          count: row.count,
          threshold: HOSTED_AUTO_POLL_HARD_DAILY_CAP,
          devices: row.devices,
          message: "Hosted steward automatic live-proof usage reached the hard daily cap.",
        });
      } else if (row.count >= HOSTED_AUTO_POLL_SOFT_DAILY_CAP) {
        alerts.push({
          severity: "warning" as const,
          code: "hosted_auto_poll_soft_cap",
          account_id: row.account_id,
          event: row.event,
          count: row.count,
          threshold: HOSTED_AUTO_POLL_SOFT_DAILY_CAP,
          devices: row.devices,
          message: "Hosted steward automatic live-proof usage reached the soft daily review cap.",
        });
      }
    }
    if (row.event === PUSH_DELIVERED_EVENT && row.count >= HOSTED_PUSH_DELIVERED_DAILY_CAP) {
      alerts.push({
        severity: "warning" as const,
        code: "hosted_push_delivered_daily_cap",
        account_id: row.account_id,
        event: row.event,
        count: row.count,
        threshold: HOSTED_PUSH_DELIVERED_DAILY_CAP,
        devices: row.devices,
        message: "Hosted steward push delivery usage reached the daily review cap.",
      });
    }
  }
  return alerts;
}

/**
 * GET /.well-known/hc/v1/operator/steward-ops
 * Operator-only hosted tier snapshot for E6 runbooks and dashboards.
 */
export async function handleGetStewardOpsSnapshot(
  request: Request,
  env: Env,
  db: D1Database,
  operatorAuditToken: string | undefined
): Promise<Response> {
  if (!operatorAuditToken) {
    return errorResponse(
      "OPERATOR_AUDIT_UNCONFIGURED",
      "Operator audit token is not configured on this resolver.",
      503
    );
  }
  if (!operatorAuditAuthorized(request, operatorAuditToken)) {
    return errorResponse(
      "UNAUTHORIZED",
      "Valid Bearer OPERATOR_AUDIT_TOKEN required.",
      401
    );
  }

  const url = new URL(request.url);
  const now = new Date();
  const dayKey = parseDayKey(url.searchParams.get("day"), now);
  if (dayKey === null) {
    return errorResponse("INVALID_QUERY", "day must use YYYY-MM-DD.", 400);
  }

  const hostedEnabled = hostedStewardEnabled(env);
  const schemaReady = await stewardSchemaReady(db);
  const push = stewardPushConnectionSummary();

  if (!schemaReady) {
    return jsonResponse(
      {
        generated_at: now.toISOString(),
        hosted_steward_enabled: hostedEnabled,
        schema: "missing",
        period: { window: "utc_day", key: dayKey },
        alerts: [],
        push,
        runbook: "docs/HOSTED_STEWARD_OPS_RUNBOOK.md",
      },
      200
    );
  }

  const nowIso = now.toISOString();
  const [accounts, activeSessions, usage, alertInputs] = await Promise.all([
    accountStatusCounts(db),
    activeSessionCount(db, nowIso),
    usageCountersForDay(db, dayKey),
    usageAlertInputsForDay(db, dayKey),
  ]);
  const alerts = usageAlertsForRows(alertInputs);

  return jsonResponse(
    {
      generated_at: nowIso,
      hosted_steward_enabled: hostedEnabled,
      schema: "ok",
      period: { window: "utc_day", key: dayKey },
      accounts,
      sessions: {
        active: activeSessions,
      },
      usage,
      alerts,
      push: {
        ...push,
        max_connections_per_account: STEWARD_PUSH_MAX_CONNECTIONS_PER_ACCOUNT,
        max_connections_per_ip: STEWARD_PUSH_MAX_CONNECTIONS_PER_IP,
      },
      controls: {
        fair_use: {
          hosted_account_soft_daily_auto_polls: HOSTED_AUTO_POLL_SOFT_DAILY_CAP,
          hosted_account_hard_daily_auto_polls: HOSTED_AUTO_POLL_HARD_DAILY_CAP,
          hosted_push_delivered_daily: HOSTED_PUSH_DELIVERED_DAILY_CAP,
        },
        sla: {
          resolver_uptime_monthly_target: "99.5%",
          live_proof_push_p95_target_seconds: 5,
        },
      },
      runbook: "docs/HOSTED_STEWARD_OPS_RUNBOOK.md",
    },
    200
  );
}
