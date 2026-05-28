import {
  ALLOWED_MERCH_FUNNEL_REFS,
  normalizeMerchFunnelEvent,
  normalizeMerchFunnelRef,
  utcDayKey,
} from "../commerce/merch-funnel-core";
import {
  incrementMerchFunnelCounter,
  listMerchFunnelCountersSince,
  sumMerchFunnelCounter,
} from "../db/merch-funnel";
import { hashIp } from "../db/rate-limit";
import { operatorAuditAuthorized } from "./operator-auth";
import { clientIp, errorResponse, jsonResponse } from "./resolver";

const BEACON_LIMIT_PER_HOUR = 120;
const BEACON_BUCKET_PREFIX = "merch_funnel_beacon:";

const DEFAULT_WINDOW_DAYS = 30;
const MIN_WINDOW_DAYS = 1;
const MAX_WINDOW_DAYS = 90;

interface MerchFunnelBeaconBody {
  ref?: unknown;
  event?: unknown;
}

function parseWindowDays(raw: string | null): number | null {
  if (raw === null || raw === "") return DEFAULT_WINDOW_DAYS;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < MIN_WINDOW_DAYS || n > MAX_WINDOW_DAYS) return null;
  return n;
}

async function checkMerchFunnelBeaconRateLimit(
  db: D1Database,
  ipHash: string,
  now: Date = new Date()
): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  const windowStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours())
  );
  const windowIso = windowStart.toISOString();
  const bucketKey = `${BEACON_BUCKET_PREFIX}${ipHash}:${windowIso}`;

  const row = await db
    .prepare(`SELECT count FROM rate_limit_buckets WHERE bucket_key = ?`)
    .bind(bucketKey)
    .first<{ count: number }>();

  const count = row?.count ?? 0;
  if (count >= BEACON_LIMIT_PER_HOUR) {
    const nextHour = new Date(windowStart.getTime() + 3600_000);
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((nextHour.getTime() - now.getTime()) / 1000)),
    };
  }

  if (row) {
    await db
      .prepare(`UPDATE rate_limit_buckets SET count = count + 1 WHERE bucket_key = ?`)
      .bind(bucketKey)
      .run();
  } else {
    await db
      .prepare(
        `INSERT INTO rate_limit_buckets (bucket_key, count, window_start) VALUES (?, 1, ?)`
      )
      .bind(bucketKey, windowIso)
      .run();
  }

  return { allowed: true };
}

/**
 * POST /.well-known/hc/v1/metrics/merch-funnel
 * Public aggregate beacon — no PII stored; rate limited per IP.
 */
export async function handlePostMerchFunnelBeacon(
  request: Request,
  db: D1Database
): Promise<Response> {
  let body: MerchFunnelBeaconBody;
  try {
    body = (await request.json()) as MerchFunnelBeaconBody;
  } catch {
    return errorResponse("MALFORMED_REQUEST", "Invalid JSON body.", 400);
  }

  const ref = normalizeMerchFunnelRef(body.ref);
  const event = normalizeMerchFunnelEvent(body.event);
  if (!ref || !event) {
    return errorResponse(
      "INVALID_FUNNEL",
      "Body must include allowed ref and event.",
      422
    );
  }

  const ipHash = await hashIp(clientIp(request));
  const rate = await checkMerchFunnelBeaconRateLimit(db, ipHash);
  if (!rate.allowed) {
    return errorResponse(
      "RATE_LIMITED",
      "Too many funnel beacons from this network. Try again later.",
      429,
      rate.retryAfterSec ? { "Retry-After": String(rate.retryAfterSec) } : undefined
    );
  }

  await incrementMerchFunnelCounter(db, ref, event);
  return jsonResponse({ ok: true, ref, event });
}

/**
 * GET /.well-known/hc/v1/operator/merch-funnel-monitor
 * Operator-only aggregate scan→create funnel metrics (M8.4).
 */
export async function handleGetMerchFunnelMonitor(
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
  const windowDays = parseWindowDays(url.searchParams.get("window_days"));
  if (windowDays === null) {
    return errorResponse(
      "INVALID_QUERY",
      `window_days must be an integer from ${MIN_WINDOW_DAYS} to ${MAX_WINDOW_DAYS}.`,
      400
    );
  }

  const now = new Date();
  const since = new Date(now.getTime() - windowDays * 86400_000);
  const sinceDay = utcDayKey(since);
  const rows = await listMerchFunnelCountersSince(db, sinceDay);

  const refs = [...ALLOWED_MERCH_FUNNEL_REFS];
  const summary: Record<
    string,
    {
      scan_landing: number;
      create_attributed: number;
      scan_to_create_pct: number | null;
    }
  > = {};

  for (const ref of refs) {
    const scanLanding = await sumMerchFunnelCounter(db, ref, "scan_landing", sinceDay);
    const createAttributed = await sumMerchFunnelCounter(
      db,
      ref,
      "create_attributed",
      sinceDay
    );
    summary[ref] = {
      scan_landing: scanLanding,
      create_attributed: createAttributed,
      scan_to_create_pct:
        scanLanding > 0
          ? Math.round((createAttributed / scanLanding) * 1000) / 10
          : null,
    };
  }

  const totalScanLanding = Object.values(summary).reduce((n, s) => n + s.scan_landing, 0);
  const totalCreateAttributed = Object.values(summary).reduce(
    (n, s) => n + s.create_attributed,
    0
  );

  return jsonResponse({
    generated_at: now.toISOString(),
    window_days: windowDays,
    since_day: sinceDay,
    policy: "Aggregate counters only — no per-scan trails or PII.",
    metrics: {
      total_scan_landing: totalScanLanding,
      total_create_attributed: totalCreateAttributed,
      total_scan_to_create_pct:
        totalScanLanding > 0
          ? Math.round((totalCreateAttributed / totalScanLanding) * 1000) / 10
          : null,
      by_ref: summary,
    },
    daily: rows,
    runbook: "docs/SHOP_TIER0_IMPLEMENTATION.md",
  });
}
