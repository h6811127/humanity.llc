import { utcDayKey } from "../commerce/merch-funnel-core";

export interface MerchFunnelCounterRow {
  ref: string;
  event: string;
  day: string;
  count: number;
}

export async function incrementMerchFunnelCounter(
  db: D1Database,
  ref: string,
  event: string,
  now: Date = new Date()
): Promise<void> {
  const day = utcDayKey(now);
  await db
    .prepare(
      `INSERT INTO merch_funnel_counters (ref, event, day, count)
       VALUES (?, ?, ?, 1)
       ON CONFLICT(ref, event, day) DO UPDATE SET count = count + 1`
    )
    .bind(ref, event, day)
    .run();
}

export async function listMerchFunnelCountersSince(
  db: D1Database,
  sinceDay: string
): Promise<MerchFunnelCounterRow[]> {
  const result = await db
    .prepare(
      `SELECT ref, event, day, count
       FROM merch_funnel_counters
       WHERE day >= ?
       ORDER BY day ASC, ref ASC, event ASC`
    )
    .bind(sinceDay)
    .all<MerchFunnelCounterRow>();
  return result.results ?? [];
}

/** Sum counts for ref+event on days >= sinceDay (inclusive). */
export async function sumMerchFunnelCounter(
  db: D1Database,
  ref: string,
  event: string,
  sinceDay: string
): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COALESCE(SUM(count), 0) AS total
       FROM merch_funnel_counters
       WHERE ref = ? AND event = ? AND day >= ?`
    )
    .bind(ref, event, sinceDay)
    .first<{ total: number }>();
  return row?.total ?? 0;
}
