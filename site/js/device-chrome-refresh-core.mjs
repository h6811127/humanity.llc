/**
 * Pure scheduling for device chrome refresh (presence hide vs debounced show).
 * @see docs/CROSS_TAB_KEYS_REBUILD_PLAN.md Phase 2
 */

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
export function presenceChromeRefreshScheduleAction(rawPresenceActive, pendingTimerId) {
  if (!rawPresenceActive) {
    return { action: "run_now", clearTimer: true };
  }
  if (pendingTimerId != null) {
    return { action: "noop", clearTimer: false };
  }
  return { action: "schedule", clearTimer: false };
}
