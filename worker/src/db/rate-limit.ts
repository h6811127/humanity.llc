/** 10 card creations per IP per hour (Technical Standards §15). */
export const CREATE_LIMIT_PER_HOUR = 10;

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
  const bucketKey = `create:${ipHash}:${windowIso}`;

  const row = await db
    .prepare(
      `SELECT count FROM rate_limit_buckets WHERE bucket_key = ?`
    )
    .bind(bucketKey)
    .first<{ count: number }>();

  const count = row?.count ?? 0;
  if (count >= CREATE_LIMIT_PER_HOUR) {
    const nextHour = new Date(windowStart.getTime() + 3600_000);
    return {
      allowed: false,
      retryAfterSec: Math.max(
        1,
        Math.ceil((nextHour.getTime() - now.getTime()) / 1000)
      ),
    };
  }

  if (row) {
    await db
      .prepare(
        `UPDATE rate_limit_buckets SET count = count + 1 WHERE bucket_key = ?`
      )
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

export async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
