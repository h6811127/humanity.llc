/**
 * Hosted steward ops snapshot threshold evaluation (E6.2).
 * @see docs/HOSTED_STEWARD_OPS_RUNBOOK.md § Daily check
 */

export type StewardOpsAlertLevel = "warn" | "critical";

export interface StewardOpsAlert {
  level: StewardOpsAlertLevel;
  code: string;
  message: string;
}

export interface StewardOpsUsageRow {
  event: string;
  count: number;
  accounts: number;
  devices: number;
}

export interface StewardOpsAccountRow {
  plan_id: string;
  status: string;
  accounts: number;
}

export interface StewardOpsSnapshotLike {
  hosted_steward_enabled?: boolean;
  schema?: string;
  accounts?: StewardOpsAccountRow[];
  usage?: StewardOpsUsageRow[];
  push?: {
    accounts_with_connections?: number;
    active_connections?: number;
    active_client_ips?: number;
    max_connections_per_account?: number;
  };
  controls?: {
    fair_use?: {
      hosted_account_soft_daily_auto_polls?: number;
      hosted_account_hard_daily_auto_polls?: number;
      hosted_push_delivered_daily?: number;
    };
  };
}

function usageRow(
  snapshot: StewardOpsSnapshotLike,
  event: string
): StewardOpsUsageRow | null {
  const row = snapshot.usage?.find((entry) => entry.event === event);
  if (!row || row.count <= 0) return null;
  return row;
}

function perAccountAverage(row: StewardOpsUsageRow): number {
  if (row.accounts <= 0) return row.count;
  return row.count / row.accounts;
}

/**
 * Evaluate a steward-ops snapshot against M4 fair-use controls.
 * Returns alerts sorted critical first.
 */
export function evaluateStewardOpsThresholds(
  snapshot: StewardOpsSnapshotLike
): StewardOpsAlert[] {
  const alerts: StewardOpsAlert[] = [];
  const fairUse = snapshot.controls?.fair_use ?? {};
  const softPollCap = fairUse.hosted_account_soft_daily_auto_polls ?? 50_000;
  const hardPollCap = fairUse.hosted_account_hard_daily_auto_polls ?? 100_000;
  const pushDeliveredCap = fairUse.hosted_push_delivered_daily ?? 10_000;

  if (snapshot.schema === "missing") {
    alerts.push({
      level: "warn",
      code: "schema_missing",
      message:
        "Hosted steward schema is missing; run worker migrations before trusting usage metrics.",
    });
    return alerts;
  }

  const poll = usageRow(snapshot, "poll.live_proof.auto");
  if (poll) {
    const perAccount = perAccountAverage(poll);
    if (perAccount >= hardPollCap) {
      alerts.push({
        level: "critical",
        code: "fair_use_hard_poll",
        message: `poll.live_proof.auto per-account average ${Math.round(perAccount)} exceeds hard cap ${hardPollCap}.`,
      });
    } else if (perAccount >= softPollCap) {
      alerts.push({
        level: "warn",
        code: "fair_use_soft_poll",
        message: `poll.live_proof.auto per-account average ${Math.round(perAccount)} exceeds soft cap ${softPollCap}.`,
      });
    }
  }

  const pushDelivered = usageRow(snapshot, "notify.push.delivered");
  if (pushDelivered) {
    const perAccount = perAccountAverage(pushDelivered);
    if (perAccount >= pushDeliveredCap) {
      alerts.push({
        level: "warn",
        code: "push_delivered_high",
        message: `notify.push.delivered per-account average ${Math.round(perAccount)} exceeds review cap ${pushDeliveredCap}.`,
      });
    }
  }

  const lifecycleStatuses = new Set(["past_due", "expired", "suspended", "canceled"]);
  let lifecycleAccounts = 0;
  for (const row of snapshot.accounts ?? []) {
    if (lifecycleStatuses.has(row.status)) {
      lifecycleAccounts += row.accounts;
    }
  }
  if (lifecycleAccounts > 0) {
    alerts.push({
      level: "warn",
      code: "lifecycle_review",
      message: `${lifecycleAccounts} steward account(s) in past_due, expired, suspended, or canceled — review billing lifecycle.`,
    });
  }

  const push = snapshot.push;
  const maxPerAccount = push?.max_connections_per_account ?? 5;
  const activeConnections = push?.active_connections ?? 0;
  const accountsWithConnections = push?.accounts_with_connections ?? 0;
  if (
    accountsWithConnections > 0 &&
    activeConnections > maxPerAccount * accountsWithConnections
  ) {
    alerts.push({
      level: "warn",
      code: "push_connection_pressure",
      message: `SSE active_connections ${activeConnections} exceeds ${maxPerAccount} × ${accountsWithConnections} account limit.`,
    });
  }

  if (snapshot.hosted_steward_enabled === false && (poll?.count ?? 0) > 0) {
    alerts.push({
      level: "warn",
      code: "hosted_disabled_with_usage",
      message:
        "Hosted steward flag is off but poll.live_proof.auto usage is non-zero — verify rollout state.",
    });
  }

  return alerts.sort((a, b) => {
    if (a.level === b.level) return a.code.localeCompare(b.code);
    return a.level === "critical" ? -1 : 1;
  });
}

export function stewardOpsAlertsHaveCritical(alerts: StewardOpsAlert[]): boolean {
  return alerts.some((alert) => alert.level === "critical");
}
