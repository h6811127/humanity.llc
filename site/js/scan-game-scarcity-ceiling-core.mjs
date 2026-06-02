/**
 * Cedar Rapids city game — device-local witness scarcity ceiling (Option 1).
 * Pure helpers only; no DOM or localStorage (see scan-game-contribute.mjs).
 * @see docs/CITY_GAME_AUTONOMOUS_V1.md § Witness scarcity
 */

/** @typedef {{ season_id: string, object_id: string, bucket_date: string, claimed_at: string | null }} ScarcityCeilingRecord */

export const SCARCITY_CEILING_STORAGE_KEY = "hc_game_scarcity_ceiling_v1";

export const SCARCITY_CEILING_ALREADY_CLAIMED_MESSAGE =
  "You already claimed a sunset pass from this device tonight. Remaining passes are for others at the library.";

const UTC_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * UTC date bucket — matches resolver `utcDateKey()` and `game_contribute_buckets.bucket_date`.
 * @param {Date} [now]
 */
export function scarcityCeilingUtcDateKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

/**
 * @param {unknown} record
 * @param {string} seasonId
 * @param {string} objectId
 * @param {string} bucketDate
 */
export function scarcityCeilingRecordMatches(record, seasonId, objectId, bucketDate) {
  if (!record || typeof record !== "object") return false;
  const row = /** @type {Record<string, unknown>} */ (record);
  return (
    row.season_id === seasonId &&
    row.object_id === objectId &&
    row.bucket_date === bucketDate &&
    UTC_DATE_RE.test(bucketDate)
  );
}

/**
 * @param {string | null | undefined} raw
 * @returns {ScarcityCeilingRecord | null}
 */
export function parseScarcityCeilingRecord(raw) {
  if (!raw || typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const row = /** @type {Record<string, unknown>} */ (parsed);
    const season_id = typeof row.season_id === "string" ? row.season_id.trim() : "";
    const object_id = typeof row.object_id === "string" ? row.object_id.trim() : "";
    const bucket_date = typeof row.bucket_date === "string" ? row.bucket_date.trim() : "";
    if (!season_id || !object_id || !UTC_DATE_RE.test(bucket_date)) {
      return null;
    }
    const claimed_at =
      typeof row.claimed_at === "string" && row.claimed_at.trim()
        ? row.claimed_at.trim()
        : null;
    return { season_id, object_id, bucket_date, claimed_at };
  } catch {
    return null;
  }
}

/**
 * @param {string} seasonId
 * @param {string} objectId
 * @param {string} bucketDate
 * @param {Date} [claimedAt]
 * @returns {ScarcityCeilingRecord}
 */
export function buildScarcityCeilingRecord(seasonId, objectId, bucketDate, claimedAt = new Date()) {
  if (!seasonId?.trim() || !objectId?.trim() || !UTC_DATE_RE.test(bucketDate)) {
    throw new Error("Invalid scarcity ceiling record inputs.");
  }
  return {
    season_id: seasonId.trim(),
    object_id: objectId.trim(),
    bucket_date: bucketDate,
    claimed_at: claimedAt.toISOString(),
  };
}

/**
 * @param {ScarcityCeilingRecord} record
 */
export function serializeScarcityCeilingRecord(record) {
  return JSON.stringify(record);
}

/**
 * Whether local storage indicates a scarcity claim for this tuple today (UTC).
 * @param {string | null | undefined} rawStorage
 * @param {string} seasonId
 * @param {string} objectId
 * @param {Date} [now]
 */
export function deviceHasScarcityClaimToday(rawStorage, seasonId, objectId, now = new Date()) {
  const bucketDate = scarcityCeilingUtcDateKey(now);
  const record = parseScarcityCeilingRecord(rawStorage);
  return scarcityCeilingRecordMatches(record, seasonId, objectId, bucketDate);
}
