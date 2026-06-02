const OBJECT_DAILY_CAP = 2000;

export async function incrementGameContributeBucket(
  db: D1Database,
  objectId: string,
  seasonId: string,
  bucketDate: string
): Promise<number> {
  const existing = await db
    .prepare(
      `SELECT contribution_count FROM game_contribute_buckets
       WHERE object_id = ? AND season_id = ? AND bucket_date = ?`
    )
    .bind(objectId, seasonId, bucketDate)
    .first<{ contribution_count: number }>();

  if (existing) {
    await db
      .prepare(
        `UPDATE game_contribute_buckets
         SET contribution_count = contribution_count + 1
         WHERE object_id = ? AND season_id = ? AND bucket_date = ?`
      )
      .bind(objectId, seasonId, bucketDate)
      .run();
    return existing.contribution_count + 1;
  }

  await db
    .prepare(
      `INSERT INTO game_contribute_buckets (object_id, season_id, bucket_date, contribution_count)
       VALUES (?, ?, ?, 1)`
    )
    .bind(objectId, seasonId, bucketDate)
    .run();
  return 1;
}

export async function gameContributeObjectDailyCapReached(
  db: D1Database,
  objectId: string,
  seasonId: string,
  bucketDate: string
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT contribution_count FROM game_contribute_buckets
       WHERE object_id = ? AND season_id = ? AND bucket_date = ?`
    )
    .bind(objectId, seasonId, bucketDate)
    .first<{ contribution_count: number }>();
  return (row?.contribution_count ?? 0) >= OBJECT_DAILY_CAP;
}

export { OBJECT_DAILY_CAP as GAME_CONTRIBUTE_OBJECT_DAILY_CAP };
