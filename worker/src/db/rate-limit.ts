import { DEMO_CREATE_LIMIT_PER_HOUR } from "../demo-card-policy";

/** 10 card creations per IP per hour (Technical Standards §15). */
export const CREATE_LIMIT_PER_HOUR = 10;
/** 300 card resolution (status) requests per IP per minute (Technical Standards §15). */
export const CARD_RESOLUTION_LIMIT_PER_MINUTE = 300;
const CREATE_BUCKET_PREFIX = "create:";
const CREATE_BLOCKED_BUCKET_PREFIX = "create_blocked:";
const CREATE_DEMO_BUCKET_PREFIX = "create_demo:";
const CREATE_DEMO_BLOCKED_BUCKET_PREFIX = "create_demo_blocked:";
const CARD_RESOLUTION_BUCKET_PREFIX = "status:";

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

export async function checkCardResolutionRateLimit(
  db: D1Database,
  ipHash: string,
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
  const bucketKey = `${CARD_RESOLUTION_BUCKET_PREFIX}${ipHash}:${windowIso}`;

  const row = await db
    .prepare(`SELECT count FROM rate_limit_buckets WHERE bucket_key = ?`)
    .bind(bucketKey)
    .first<{ count: number }>();

  const count = row?.count ?? 0;
  if (count >= CARD_RESOLUTION_LIMIT_PER_MINUTE) {
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
