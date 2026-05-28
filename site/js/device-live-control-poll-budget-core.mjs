/**
 * Per-origin daily cap on automatic live-control inbox GETs (Phase 7).
 * Manual **Check for live proof** does not consume budget.
 * @see docs/DEVICE_OS_REQUEST_BUDGET.md
 */

export const LIVE_CONTROL_AUTO_POLL_STORAGE_KEY = "hc_live_control_auto_poll_budget";

/** Aligns with doc target &lt;500 auto polls/tab/day on production. */
export const LIVE_CONTROL_AUTO_POLL_DAILY_CAP = 400;

/**
 * @param {number} [now]
 * @returns {string} UTC day key YYYY-MM-DD
 */
export function liveControlAutoPollUtcDayKey(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);
}

/**
 * @param {string | null | undefined} raw
 * @returns {{ day: string, count: number } | null}
 */
export function parseLiveControlAutoPollBudget(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const day = typeof parsed.day === "string" ? parsed.day : "";
    const count =
      typeof parsed.count === "number" && Number.isFinite(parsed.count)
        ? Math.max(0, Math.floor(parsed.count))
        : 0;
    if (!day) return null;
    return { day, count };
  } catch {
    return null;
  }
}

/**
 * @param {{ day: string, count: number }} record
 */
export function serializeLiveControlAutoPollBudget(record) {
  return JSON.stringify({
    day: record.day,
    count: record.count,
  });
}

/**
 * Mark local auto-poll budget exhausted for today (sync with server 429).
 *
 * @param {number} cap
 * @param {number} [now]
 */
export function liveControlAutoPollBudgetSerializedAtCap(cap, now = Date.now()) {
  return serializeLiveControlAutoPollBudget({
    day: liveControlAutoPollUtcDayKey(now),
    count: cap,
  });
}

/**
 * @param {string | null | undefined} raw
 * @param {number} [now]
 * @returns {number} count for current UTC day
 */
export function liveControlAutoPollCountToday(raw, now = Date.now()) {
  const day = liveControlAutoPollUtcDayKey(now);
  const record = parseLiveControlAutoPollBudget(raw);
  if (!record || record.day !== day) return 0;
  return record.count;
}

/**
 * @param {string | null | undefined} raw
 * @param {number} [now]
 */
export function isLiveControlAutoPollBudgetExhausted(
  raw,
  now = Date.now(),
  cap = LIVE_CONTROL_AUTO_POLL_DAILY_CAP
) {
  return liveControlAutoPollCountToday(raw, now) >= cap;
}

/**
 * Record one automatic poll (returns serialized storage value).
 *
 * @param {string | null | undefined} raw
 * @param {number} [now]
 */
export function recordLiveControlAutoPoll(raw, now = Date.now()) {
  const day = liveControlAutoPollUtcDayKey(now);
  const prev = parseLiveControlAutoPollBudget(raw);
  const count =
    prev && prev.day === day ? prev.count + 1 : 1;
  return serializeLiveControlAutoPollBudget({ day, count });
}

export function liveControlAutoPollBudgetPausedMessage() {
  return "Automatic live proof checks paused for today on this device - use Check for live proof or try again tomorrow.";
}
