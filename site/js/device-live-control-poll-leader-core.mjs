/**
 * Cross-tab leader election for live-control auto polling (Phase 7).
 * @see docs/DEVICE_OS_REQUEST_BUDGET.md
 */

export const LIVE_CONTROL_POLL_LEADER_STORAGE_KEY = "hc_live_control_poll_leader";

/** Leader row older than this may be reclaimed by another tab. */
export const LIVE_CONTROL_POLL_LEADER_STALE_MS = 20_000;

/**
 * @param {string | null | undefined} raw
 * @returns {{ tabId: string, at: number } | null}
 */
export function parseLiveControlPollLeader(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const tabId = typeof parsed.tabId === "string" ? parsed.tabId : "";
    const at =
      typeof parsed.at === "number" && Number.isFinite(parsed.at) ? parsed.at : 0;
    if (!tabId) return null;
    return { tabId, at };
  } catch {
    return null;
  }
}

/**
 * @param {{ tabId: string, at: number }} record
 */
export function serializeLiveControlPollLeader(record) {
  return JSON.stringify({ tabId: record.tabId, at: record.at });
}

/**
 * @param {{ tabId: string, at: number } | null} record
 * @param {number} [now]
 */
export function isLiveControlPollLeaderStale(record, now = Date.now()) {
  if (!record) return true;
  return now - record.at > LIVE_CONTROL_POLL_LEADER_STALE_MS;
}

/**
 * Whether this tab should run auto polls (leader or vacant/stale lock).
 *
 * @param {{ tabId: string, at: number } | null} record
 * @param {string} tabId
 * @param {number} [now]
 */
export function shouldTabActAsLiveControlPollLeader(record, tabId, now = Date.now()) {
  if (!tabId) return true;
  if (!record || isLiveControlPollLeaderStale(record, now)) return true;
  return record.tabId === tabId;
}
