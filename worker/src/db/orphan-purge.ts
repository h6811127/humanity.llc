/**
 * Automatic purge of abandoned card registrations (no owner keys on server).
 * Policy: docs/CARD_RETENTION_AND_ORPHAN_CLEANUP.md
 */

export const ORPHAN_MIN_AGE_DAYS = 90;
export const PURGE_BATCH_LIMIT = 50;

export interface OrphanPurgeResult {
  cutoffIso: string;
  nowIso: string;
  candidates: number;
  purged: number;
  profileIds: string[];
}

export interface OrphanPurgeOptions {
  now?: Date;
  minAgeDays?: number;
  limit?: number;
}

function isoDaysAgo(now: Date, days: number): string {
  const d = new Date(now.getTime());
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

/**
 * Profile IDs eligible for purge (see policy doc).
 */
export async function findOrphanProfileIds(
  db: D1Database,
  options: OrphanPurgeOptions = {}
): Promise<string[]> {
  const now = options.now ?? new Date();
  const minAgeDays = options.minAgeDays ?? ORPHAN_MIN_AGE_DAYS;
  const limit = options.limit ?? PURGE_BATCH_LIMIT;
  const cutoffIso = isoDaysAgo(now, minAgeDays);
  const nowIso = now.toISOString();

  const { results } = await db
    .prepare(
      `SELECT c.profile_id AS profile_id
       FROM cards c
       INNER JOIN verification_summaries v ON v.profile_id = c.profile_id
       WHERE c.status = 'active'
         AND c.created_at < ?
         AND c.updated_at = c.created_at
         AND v.vouch_count = 0
         AND NOT EXISTS (
           SELECT 1 FROM vouches vo
           WHERE vo.status = 'active'
             AND (vo.vouchee_profile_id = c.profile_id OR vo.voucher_profile_id = c.profile_id)
         )
         AND NOT EXISTS (
           SELECT 1 FROM qr_credentials q
           WHERE q.profile_id = c.profile_id
             AND q.status = 'active'
             AND (q.expires_at IS NULL OR q.expires_at > ?)
         )
       ORDER BY c.created_at ASC
       LIMIT ?`
    )
    .bind(cutoffIso, nowIso, limit)
    .all<{ profile_id: string }>();

  return (results ?? []).map((r) => r.profile_id);
}

/**
 * Delete one profile and dependent trust-layer rows.
 */
export async function purgeProfile(
  db: D1Database,
  profileId: string
): Promise<void> {
  const statements = [
    db
      .prepare(`DELETE FROM live_control_challenges WHERE profile_id = ?`)
      .bind(profileId),
    db
      .prepare(
        `DELETE FROM vouches
         WHERE voucher_profile_id = ? OR vouchee_profile_id = ?`
      )
      .bind(profileId, profileId),
    db
      .prepare(`DELETE FROM revocations WHERE profile_id = ?`)
      .bind(profileId),
    db
      .prepare(`DELETE FROM qr_credentials WHERE profile_id = ?`)
      .bind(profileId),
    db
      .prepare(`DELETE FROM verification_summaries WHERE profile_id = ?`)
      .bind(profileId),
    db.prepare(`DELETE FROM cards WHERE profile_id = ?`).bind(profileId),
  ];

  const results = await db.batch(statements);
  for (const r of results) {
    if (!r.success) {
      throw new Error(r.error ?? `D1 purge failed for ${profileId}`);
    }
  }
}

/**
 * Find and purge up to PURGE_BATCH_LIMIT orphan profiles.
 */
export async function runOrphanPurge(
  db: D1Database,
  options: OrphanPurgeOptions = {}
): Promise<OrphanPurgeResult> {
  const now = options.now ?? new Date();
  const minAgeDays = options.minAgeDays ?? ORPHAN_MIN_AGE_DAYS;
  const cutoffIso = isoDaysAgo(now, minAgeDays);
  const profileIds = await findOrphanProfileIds(db, options);

  for (const profileId of profileIds) {
    await purgeProfile(db, profileId);
  }

  return {
    cutoffIso,
    nowIso: now.toISOString(),
    candidates: profileIds.length,
    purged: profileIds.length,
    profileIds,
  };
}
