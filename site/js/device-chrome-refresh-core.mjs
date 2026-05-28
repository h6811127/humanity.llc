/**
 * Pure scheduling for device chrome refresh (presence hide vs debounced show).
 * @see docs/CROSS_TAB_KEYS_REBUILD_PLAN.md Phase 2
 * @see docs/SAFARI_PERFORMANCE_AND_REFRESH_INVESTIGATION.md P0
 */

/** Debounce for cross-tab presence-driven chrome (longer than DEVICE_OS_DEBOUNCE_MS). */
export const PRESENCE_CHROME_DEBOUNCE_MS = 1200;

/** localStorage keys that must refresh chrome immediately (custody / wallet). */
export const CHROME_REFRESH_IMMEDIATE_STORAGE_KEYS = new Set([
  "hc_wallet",
  "hc_created",
  "hc_device_pins",
  "hc_device_activity",
  "hc_wallet_removed_profile_ids",
]);

/**
 * Presence heartbeats are handled via `hc-tab-presence-changed` (debounced), not storage immediate.
 *
 * @param {string | null | undefined} storageKey
 */
export function shouldChromeRefreshStorageImmediately(storageKey) {
  if (!storageKey) return false;
  if (storageKey === "hc_tab_keys_presence") return false;
  return CHROME_REFRESH_IMMEDIATE_STORAGE_KEYS.has(storageKey);
}

/**
 * @param {boolean} rawPresenceActive Other tabs qualify before streak (gate + count > 0).
 * @param {boolean} immediateRefreshRequested Caller asked for immediate refresh.
 */
export function shouldRunChromeRefreshImmediate(rawPresenceActive, immediateRefreshRequested) {
  if (immediateRefreshRequested) return true;
  return !rawPresenceActive;
}

/**
 * @param {boolean} rawPresenceActive
 * @param {number | null} pendingTimerId
 * @returns {{ action: 'run_now' | 'schedule' | 'noop', clearTimer: boolean }}
 */
/**
 * @param {{ tabNotice: number, genericCount: number, orphanCount: number }} input
 */
export function presenceChromeFingerprint(input) {
  return `${input.tabNotice}|${input.genericCount}|${input.orphanCount}`;
}

/**
 * @param {string} previousFp
 * @param {string} nextFp
 */
export function shouldSkipPresenceChromeRefresh(previousFp, nextFp) {
  if (!previousFp || !nextFp) return false;
  return previousFp === nextFp;
}

export function presenceChromeRefreshScheduleAction(rawPresenceActive, pendingTimerId) {
  if (!rawPresenceActive) {
    return { action: "run_now", clearTimer: true };
  }
  if (pendingTimerId != null) {
    return { action: "noop", clearTimer: false };
  }
  return { action: "schedule", clearTimer: false };
}
