import { CREATE_LIMIT_PER_HOUR, getCreateRateLimitMonitoring } from "../db/rate-limit";
import { operatorAuditAuthorized } from "../http/operator-auth";
import { errorResponse, jsonResponse } from "../http/resolver";

const DEFAULT_WINDOW_HOURS = 24;
const MIN_WINDOW_HOURS = 1;
const MAX_WINDOW_HOURS = 24 * 14;

function parseWindowHours(raw: string | null): number | null {
  if (raw === null || raw === "") return DEFAULT_WINDOW_HOURS;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < MIN_WINDOW_HOURS || n > MAX_WINDOW_HOURS) return null;
  return n;
}

/**
 * GET /.well-known/hc/v1/operator/create-rate-monitor
 * Operator-only launch monitoring for card creation activity and create-rate pressure.
 */
export async function handleGetCreateRateMonitor(
  request: Request,
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
  const windowHours = parseWindowHours(url.searchParams.get("window_hours"));
  if (windowHours === null) {
    return errorResponse(
      "INVALID_QUERY",
      `window_hours must be an integer from ${MIN_WINDOW_HOURS} to ${MAX_WINDOW_HOURS}.`,
      400
    );
  }

  const now = new Date();
  const sinceIso = new Date(now.getTime() - windowHours * 3600_000).toISOString();
  const rate = await getCreateRateLimitMonitoring(db, sinceIso);
  const cards = await db
    .prepare(
      `SELECT COUNT(*) AS n
       FROM cards
       WHERE created_at >= ?`
    )
    .bind(sinceIso)
    .first<{ n: number }>();

  return jsonResponse({
    generated_at: now.toISOString(),
    window_hours: windowHours,
    since: sinceIso,
    controls: {
      create_limit_per_ip_per_hour: CREATE_LIMIT_PER_HOUR,
      assumption: "A-012F",
      threat_ids: ["R-01", "A-012F"],
    },
    metrics: {
      cards_created: cards?.n ?? 0,
      create_allowed_attempts: rate.allowed_attempts,
      create_blocked_attempts: rate.blocked_attempts,
      unique_allowed_ip_windows: rate.unique_allowed_ip_windows,
      unique_blocked_ip_windows: rate.unique_blocked_ip_windows,
    },
    runbook: "docs/LAUNCH_MONITORING_RUNBOOK.md",
  });
}
