import { operatorAuditAuthorized } from "../http/operator-auth";
import { errorResponse, jsonResponse, OPERATOR_ID } from "../http/resolver";
import type { Env } from "../index";
import { hostedStewardEnabled } from "../steward/config";
import { stewardSchemaReady } from "../steward/db";
import { utcDayKey } from "../steward/plans";
import {
  STEWARD_PUSH_MAX_CONNECTIONS_PER_ACCOUNT,
  STEWARD_PUSH_MAX_CONNECTIONS_PER_IP,
  stewardPushConnectionSnapshot,
  stewardPushTotalConnectionCount,
} from "../steward/push";

const ACCOUNT_SOFT_CAP_DAILY = 50_000;
const ACCOUNT_HARD_CAP_DAILY = 100_000;
const TOP_USAGE_LIMIT = 10;

type CountRow = { key: string; n: number };
type UsageRow = { account_id: string; event: string; count: number };
type SessionRow = { account_id: string; n: number };
type BillingRow = {
  account_id: string;
  plan_id: string;
  status: string;
  effective_until: string | null;
  billing_customer_id: string | null;
  billing_subscription_id: string | null;
};

function hostedDisabled(): Response {
  return errorResponse(
    "hosted_steward_disabled",
    "Hosted steward extension is not enabled on this operator.",
    404
  );
}

function stewardSchemaMissing(): Response {
  return errorResponse(
    "steward_schema_missing",
    "Hosted steward tables are not migrated.",
    503
  );
}

async function requireOperatorOpsAccess(
  request: Request,
  env: Env,
  db: D1Database
): Promise<Response | null> {
  if (!env.OPERATOR_AUDIT_TOKEN) {
    return errorResponse(
      "OPERATOR_AUDIT_UNCONFIGURED",
      "Operator audit token is not configured on this resolver.",
      503
    );
  }
  if (!operatorAuditAuthorized(request, env.OPERATOR_AUDIT_TOKEN)) {
    return errorResponse(
      "UNAUTHORIZED",
      "Valid Bearer OPERATOR_AUDIT_TOKEN required.",
      401
    );
  }
  if (!hostedStewardEnabled(env)) return hostedDisabled();
  if (!(await stewardSchemaReady(db))) return stewardSchemaMissing();
  return null;
}

async function groupedCounts(
  db: D1Database,
  column: "status" | "plan_id"
): Promise<Record<string, number>> {
  const { results } = await db
    .prepare(
      `SELECT ${column} AS key, COUNT(*) AS n
       FROM steward_accounts
       GROUP BY ${column}
       ORDER BY ${column}`
    )
    .all<CountRow>();
  return Object.fromEntries((results ?? []).map((row) => [row.key, row.n]));
}

async function activeSessionCounts(db: D1Database, nowIso: string): Promise<Map<string, number>> {
  const { results } = await db
    .prepare(
      `SELECT account_id, COUNT(*) AS n
       FROM steward_sessions
       WHERE expires_at > ?
       GROUP BY account_id`
    )
    .bind(nowIso)
    .all<SessionRow>();
  return new Map((results ?? []).map((row) => [row.account_id, row.n]));
}

async function usageRowsForWindow(
  db: D1Database,
  windowKey: string
): Promise<UsageRow[]> {
  const { results } = await db
    .prepare(
      `SELECT account_id, event, SUM(count) AS count
       FROM steward_usage_counters
       WHERE window_key = ?
       GROUP BY account_id, event`
    )
    .bind(windowKey)
    .all<UsageRow>();
  return results ?? [];
}

async function billingRows(db: D1Database): Promise<BillingRow[]> {
  const { results } = await db
    .prepare(
      `SELECT account_id, plan_id, status, effective_until,
              billing_customer_id, billing_subscription_id
       FROM steward_accounts
       ORDER BY updated_at DESC, account_id`
    )
    .all<BillingRow>();
  return results ?? [];
}

function usageByAccount(rows: UsageRow[]): Map<string, Record<string, number>> {
  const map = new Map<string, Record<string, number>>();
  for (const row of rows) {
    const current = map.get(row.account_id) ?? {};
    current[row.event] = row.count;
    map.set(row.account_id, current);
  }
  return map;
}

function eventTotals(rows: UsageRow[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const row of rows) totals[row.event] = (totals[row.event] ?? 0) + row.count;
  return totals;
}

function usageTotal(events: Record<string, number>): number {
  return Object.values(events).reduce((sum, n) => sum + n, 0);
}

/**
 * GET /.well-known/hc/v1/operator/hosted-steward/ops
 * Operator-only E6 summary for hosted steward quota, push, and billing health.
 */
export async function handleGetHostedStewardOps(
  request: Request,
  env: Env,
  db: D1Database
): Promise<Response> {
  const gate = await requireOperatorOpsAccess(request, env, db);
  if (gate) return gate;

  const now = new Date();
  const nowIso = now.toISOString();
  const windowKey = new URL(request.url).searchParams.get("window_key") || utcDayKey(now);
  const [byStatus, byPlan, sessionCounts, usageRows, accounts] = await Promise.all([
    groupedCounts(db, "status"),
    groupedCounts(db, "plan_id"),
    activeSessionCounts(db, nowIso),
    usageRowsForWindow(db, windowKey),
    billingRows(db),
  ]);

  const usage = usageByAccount(usageRows);
  const pushConnections = stewardPushConnectionSnapshot();
  const pushByAccount = new Map(pushConnections.map((row) => [row.account_id, row.connections]));

  const accountSummaries = accounts.map((account) => {
    const events = usage.get(account.account_id) ?? {};
    return {
      account_id: account.account_id,
      plan_id: account.plan_id,
      status: account.status,
      effective_until: account.effective_until,
      active_sessions: sessionCounts.get(account.account_id) ?? 0,
      current_push_connections: pushByAccount.get(account.account_id) ?? 0,
      usage_total: usageTotal(events),
      usage: events,
      billing: {
        has_customer: !!account.billing_customer_id,
        has_subscription: !!account.billing_subscription_id,
      },
    };
  });

  const topAccounts = [...accountSummaries]
    .sort((a, b) => b.usage_total - a.usage_total || a.account_id.localeCompare(b.account_id))
    .slice(0, TOP_USAGE_LIMIT);
  const overSoftCap = accountSummaries.filter(
    (account) => account.usage_total >= ACCOUNT_SOFT_CAP_DAILY
  );
  const overHardCap = accountSummaries.filter(
    (account) => account.usage_total >= ACCOUNT_HARD_CAP_DAILY
  );
  const pushAtLimit = accountSummaries.filter(
    (account) =>
      account.current_push_connections >= STEWARD_PUSH_MAX_CONNECTIONS_PER_ACCOUNT
  );
  const billingAttention = accountSummaries.filter(
    (account) =>
      account.plan_id === "hosted_steward_v1" &&
      (account.status === "past_due" ||
        account.status === "canceled" ||
        account.status === "expired" ||
        !account.billing.has_customer ||
        !account.billing.has_subscription)
  );

  const alerts = [
    ...overSoftCap.map((account) => ({
      severity: account.usage_total >= ACCOUNT_HARD_CAP_DAILY ? "critical" : "warning",
      code:
        account.usage_total >= ACCOUNT_HARD_CAP_DAILY
          ? "account_over_hard_cap"
          : "account_over_soft_cap",
      account_id: account.account_id,
      message: `Hosted usage total is ${account.usage_total} for ${windowKey}.`,
    })),
    ...pushAtLimit.map((account) => ({
      severity: "warning",
      code: "push_connection_limit",
      account_id: account.account_id,
      message: "Account is at the concurrent SSE push connection limit.",
    })),
    ...billingAttention.map((account) => ({
      severity: account.status === "expired" ? "critical" : "warning",
      code: "billing_attention",
      account_id: account.account_id,
      message: `Hosted account billing/status requires review (${account.status}).`,
    })),
  ];

  return jsonResponse({
    generated_at: nowIso,
    operator: { id: OPERATOR_ID },
    period: { type: "utc_day", key: windowKey },
    controls: {
      account_soft_cap_daily: ACCOUNT_SOFT_CAP_DAILY,
      account_hard_cap_daily: ACCOUNT_HARD_CAP_DAILY,
      push_max_connections_per_account: STEWARD_PUSH_MAX_CONNECTIONS_PER_ACCOUNT,
      push_max_connections_per_ip: STEWARD_PUSH_MAX_CONNECTIONS_PER_IP,
    },
    accounts: {
      total: accountSummaries.length,
      by_status: byStatus,
      by_plan: byPlan,
      billing_attention: billingAttention.length,
      over_soft_cap: overSoftCap.length,
      over_hard_cap: overHardCap.length,
    },
    usage: {
      event_totals: eventTotals(usageRows),
      top_accounts: topAccounts,
    },
    push: {
      current_connections_total: stewardPushTotalConnectionCount(),
      by_account: pushConnections,
    },
    alerts,
    runbook: "docs/HOSTED_TIER_OPS_RUNBOOK.md",
  });
}
