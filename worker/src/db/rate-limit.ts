import { DEMO_CREATE_LIMIT_PER_HOUR } from "../demo-card-policy";

/** 10 card creations per IP per hour (Technical Standards §15). */
export const CREATE_LIMIT_PER_HOUR = 10;
/** 300 card resolution (status) requests per IP per minute (Technical Standards §15). */
export const CARD_RESOLUTION_LIMIT_PER_MINUTE = 300;
/** 300 live-control GET polls per IP per minute (O2 step 2; device inbox / scan polling). */
export const LIVE_CONTROL_GET_LIMIT_PER_MINUTE = 300;
/** 120 resolver health checks per IP per minute (O2 step 2; shell bootstrap + tab sync). */
export const RESOLVER_HEALTH_LIMIT_PER_MINUTE = 120;
/** 120 season snapshot polls per IP per minute (city game map board / ticker). */
export const SEASON_SNAPSHOT_LIMIT_PER_MINUTE = 120;
const CREATE_BUCKET_PREFIX = "create:";
const CREATE_BLOCKED_BUCKET_PREFIX = "create_blocked:";
const CREATE_DEMO_BUCKET_PREFIX = "create_demo:";
const CREATE_DEMO_BLOCKED_BUCKET_PREFIX = "create_demo_blocked:";
const CARD_RESOLUTION_BUCKET_PREFIX = "status:";
const LIVE_CONTROL_GET_BUCKET_PREFIX = "live_control_get:";
const RESOLVER_HEALTH_BUCKET_PREFIX = "health:";
const SEASON_SNAPSHOT_BUCKET_PREFIX = "season_snapshot:";
/** 30 opt-in AI explain requests per IP per hour (AI L3 P1). */
export const AI_EXPLAIN_LIMIT_PER_HOUR = 30;
const AI_EXPLAIN_BUCKET_PREFIX = "ai_explain:";
/** 20 steward AI draft requests per IP per hour (AI L3 P2). */
export const AI_DRAFT_LIMIT_PER_HOUR = 20;
const AI_DRAFT_BUCKET_PREFIX = "ai_draft:";
/** 10 public vouch reports per IP per hour (trust-and-safety intake). */
export const VOUCH_REPORT_LIMIT_PER_HOUR = 10;
const VOUCH_REPORT_BUCKET_PREFIX = "vouch_report:";
/** 5 public suspension appeals per IP per hour (trust-and-safety intake). */
export const VOUCH_APPEAL_LIMIT_PER_HOUR = 5;
const VOUCH_APPEAL_BUCKET_PREFIX = "vouch_appeal:";
/** 20 city-game site-code contributions per IP per hour (abuse control only). */
export const GAME_CONTRIBUTE_LIMIT_PER_HOUR = 20;
const GAME_CONTRIBUTE_BUCKET_PREFIX = "game_contribute:";

async function incrementBucket(
  db: D1Database,
  bucketKey: string,
  windowIso: string
): Promise<void> {
  const existing = await db
    .prepare(`SELECT count FROM rate_limit_buckets WHERE bucket_key = ?`)
    .bind(bucketKey)
    .first<{ count: number }>();
  if (existing) {
    await db
      .prepare(`UPDATE rate_limit_buckets SET count = count + 1 WHERE bucket_key = ?`)
      .bind(bucketKey)
      .run();
    return;
  }
  await db
    .prepare(
      `INSERT INTO rate_limit_buckets (bucket_key, count, window_start) VALUES (?, 1, ?)`
    )
    .bind(bucketKey, windowIso)
    .run();
}

export async function checkCreateRateLimit(
  db: D1Database,
  ipHash: string,
  now: Date = new Date()
): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  const windowStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours()
    )
  );
  const windowIso = windowStart.toISOString();
  const bucketKey = `${CREATE_BUCKET_PREFIX}${ipHash}:${windowIso}`;

  const row = await db
    .prepare(
      `SELECT count FROM rate_limit_buckets WHERE bucket_key = ?`
    )
    .bind(bucketKey)
    .first<{ count: number }>();

  const count = row?.count ?? 0;
  if (count >= CREATE_LIMIT_PER_HOUR) {
    await incrementBucket(db, `${CREATE_BLOCKED_BUCKET_PREFIX}${ipHash}:${windowIso}`, windowIso);
    const nextHour = new Date(windowStart.getTime() + 3600_000);
    return {
      allowed: false,
      retryAfterSec: Math.max(
        1,
        Math.ceil((nextHour.getTime() - now.getTime()) / 1000)
      ),
    };
  }

  await incrementBucket(db, bucketKey, windowIso);

  return { allowed: true };
}

export async function checkDemoCreateRateLimit(
  db: D1Database,
  ipHash: string,
  now: Date = new Date()
): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  const windowStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours()
    )
  );
  const windowIso = windowStart.toISOString();
  const bucketKey = `${CREATE_DEMO_BUCKET_PREFIX}${ipHash}:${windowIso}`;

  const row = await db
    .prepare(`SELECT count FROM rate_limit_buckets WHERE bucket_key = ?`)
    .bind(bucketKey)
    .first<{ count: number }>();

  const count = row?.count ?? 0;
  if (count >= DEMO_CREATE_LIMIT_PER_HOUR) {
    await incrementBucket(
      db,
      `${CREATE_DEMO_BLOCKED_BUCKET_PREFIX}${ipHash}:${windowIso}`,
      windowIso
    );
    const nextHour = new Date(windowStart.getTime() + 3600_000);
    return {
      allowed: false,
      retryAfterSec: Math.max(
        1,
        Math.ceil((nextHour.getTime() - now.getTime()) / 1000)
      ),
    };
  }

  await incrementBucket(db, bucketKey, windowIso);
  return { allowed: true };
}

async function checkPerMinuteIpRateLimit(
  db: D1Database,
  ipHash: string,
  bucketPrefix: string,
  limit: number,
  now: Date = new Date()
): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  const windowStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes()
    )
  );
  const windowIso = windowStart.toISOString();
  const bucketKey = `${bucketPrefix}${ipHash}:${windowIso}`;

  const row = await db
    .prepare(`SELECT count FROM rate_limit_buckets WHERE bucket_key = ?`)
    .bind(bucketKey)
    .first<{ count: number }>();

  const count = row?.count ?? 0;
  if (count >= limit) {
    const nextMinute = new Date(windowStart.getTime() + 60_000);
    return {
      allowed: false,
      retryAfterSec: Math.max(
        1,
        Math.ceil((nextMinute.getTime() - now.getTime()) / 1000)
      ),
    };
  }

  await incrementBucket(db, bucketKey, windowIso);
  return { allowed: true };
}

export async function checkCardResolutionRateLimit(
  db: D1Database,
  ipHash: string,
  now: Date = new Date()
): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  return checkPerMinuteIpRateLimit(
    db,
    ipHash,
    CARD_RESOLUTION_BUCKET_PREFIX,
    CARD_RESOLUTION_LIMIT_PER_MINUTE,
    now
  );
}

export async function checkLiveControlGetRateLimit(
  db: D1Database,
  ipHash: string,
  now: Date = new Date()
): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  return checkPerMinuteIpRateLimit(
    db,
    ipHash,
    LIVE_CONTROL_GET_BUCKET_PREFIX,
    LIVE_CONTROL_GET_LIMIT_PER_MINUTE,
    now
  );
}

export async function checkResolverHealthRateLimit(
  db: D1Database,
  ipHash: string,
  now: Date = new Date()
): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  return checkPerMinuteIpRateLimit(
    db,
    ipHash,
    RESOLVER_HEALTH_BUCKET_PREFIX,
    RESOLVER_HEALTH_LIMIT_PER_MINUTE,
    now
  );
}

export async function checkSeasonSnapshotRateLimit(
  db: D1Database,
  ipHash: string,
  now: Date = new Date()
): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  return checkPerMinuteIpRateLimit(
    db,
    ipHash,
    SEASON_SNAPSHOT_BUCKET_PREFIX,
    SEASON_SNAPSHOT_LIMIT_PER_MINUTE,
    now
  );
}

export async function checkAiExplainRateLimit(
  db: D1Database,
  ipHash: string,
  now: Date = new Date()
): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  const windowStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours()
    )
  );
  const windowIso = windowStart.toISOString();
  const bucketKey = `${AI_EXPLAIN_BUCKET_PREFIX}${ipHash}:${windowIso}`;

  const row = await db
    .prepare(`SELECT count FROM rate_limit_buckets WHERE bucket_key = ?`)
    .bind(bucketKey)
    .first<{ count: number }>();

  const count = row?.count ?? 0;
  if (count >= AI_EXPLAIN_LIMIT_PER_HOUR) {
    const nextHour = new Date(windowStart.getTime() + 3600_000);
    return {
      allowed: false,
      retryAfterSec: Math.max(
        1,
        Math.ceil((nextHour.getTime() - now.getTime()) / 1000)
      ),
    };
  }

  await incrementBucket(db, bucketKey, windowIso);
  return { allowed: true };
}

export async function checkAiDraftRateLimit(
  db: D1Database,
  ipHash: string,
  now: Date = new Date()
): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  const windowStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours()
    )
  );
  const windowIso = windowStart.toISOString();
  const bucketKey = `${AI_DRAFT_BUCKET_PREFIX}${ipHash}:${windowIso}`;

  const row = await db
    .prepare(`SELECT count FROM rate_limit_buckets WHERE bucket_key = ?`)
    .bind(bucketKey)
    .first<{ count: number }>();

  const count = row?.count ?? 0;
  if (count >= AI_DRAFT_LIMIT_PER_HOUR) {
    const nextHour = new Date(windowStart.getTime() + 3600_000);
    return {
      allowed: false,
      retryAfterSec: Math.max(
        1,
        Math.ceil((nextHour.getTime() - now.getTime()) / 1000)
      ),
    };
  }

  await incrementBucket(db, bucketKey, windowIso);
  return { allowed: true };
}

async function checkPerHourIpRateLimit(
  db: D1Database,
  ipHash: string,
  bucketPrefix: string,
  limit: number,
  now: Date = new Date()
): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  const windowStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours()
    )
  );
  const windowIso = windowStart.toISOString();
  const bucketKey = `${bucketPrefix}${ipHash}:${windowIso}`;

  const row = await db
    .prepare(`SELECT count FROM rate_limit_buckets WHERE bucket_key = ?`)
    .bind(bucketKey)
    .first<{ count: number }>();

  const count = row?.count ?? 0;
  if (count >= limit) {
    const nextHour = new Date(windowStart.getTime() + 3600_000);
    return {
      allowed: false,
      retryAfterSec: Math.max(
        1,
        Math.ceil((nextHour.getTime() - now.getTime()) / 1000)
      ),
    };
  }

  await incrementBucket(db, bucketKey, windowIso);
  return { allowed: true };
}

export async function checkVouchAppealRateLimit(
  db: D1Database,
  ipHash: string,
  now: Date = new Date()
): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  return checkPerHourIpRateLimit(
    db,
    ipHash,
    VOUCH_APPEAL_BUCKET_PREFIX,
    VOUCH_APPEAL_LIMIT_PER_HOUR,
    now
  );
}

export async function checkVouchReportRateLimit(
  db: D1Database,
  ipHash: string,
  now: Date = new Date()
): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  return checkPerHourIpRateLimit(
    db,
    ipHash,
    VOUCH_REPORT_BUCKET_PREFIX,
    VOUCH_REPORT_LIMIT_PER_HOUR,
    now
  );
}

export async function checkGameContributeRateLimit(
  db: D1Database,
  ipHash: string,
  now: Date = new Date()
): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  return checkPerHourIpRateLimit(
    db,
    ipHash,
    GAME_CONTRIBUTE_BUCKET_PREFIX,
    GAME_CONTRIBUTE_LIMIT_PER_HOUR,
    now
  );
}

export async function getCreateRateLimitMonitoring(
  db: D1Database,
  sinceIso: string
): Promise<{
  allowed_attempts: number;
  blocked_attempts: number;
  unique_allowed_ip_windows: number;
  unique_blocked_ip_windows: number;
}> {
  const allowed = await db
    .prepare(
      `SELECT COALESCE(SUM(count), 0) AS attempts, COUNT(*) AS windows
       FROM rate_limit_buckets
       WHERE bucket_key LIKE ? AND window_start >= ?`
    )
    .bind(`${CREATE_BUCKET_PREFIX}%`, sinceIso)
    .first<{ attempts: number; windows: number }>();
  const blocked = await db
    .prepare(
      `SELECT COALESCE(SUM(count), 0) AS attempts, COUNT(*) AS windows
       FROM rate_limit_buckets
       WHERE bucket_key LIKE ? AND window_start >= ?`
    )
    .bind(`${CREATE_BLOCKED_BUCKET_PREFIX}%`, sinceIso)
    .first<{ attempts: number; windows: number }>();
  return {
    allowed_attempts: allowed?.attempts ?? 0,
    blocked_attempts: blocked?.attempts ?? 0,
    unique_allowed_ip_windows: allowed?.windows ?? 0,
    unique_blocked_ip_windows: blocked?.windows ?? 0,
  };
}

export async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
