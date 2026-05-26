/**
 * Stabilize cross-tab / orphan inbox surfaces — fast hide, delayed show.
 * @see docs/CROSS_TAB_KEYS_FLASH_AFTER_CARD_DELETE_INVESTIGATION.md path G
 */

export const PRESENCE_INBOX_MIN_SHOW_STREAK = 2;

/**
 * @param {number} previousStreak
 * @param {number} rawCount
 * @param {number} [minStreak]
 */
export function presenceShowStreakAfterRead(
  previousStreak,
  rawCount,
  minStreak = PRESENCE_INBOX_MIN_SHOW_STREAK
) {
  if (rawCount <= 0) {
    return { streak: 0, show: false };
  }
  const streak = previousStreak + 1;
  return { streak, show: streak >= minStreak };
}

/**
 * @param {Array<unknown>} raw
 * @param {number} tabNoticeCount
 * @param {(otherCount: number, tabNoticeCount: number) => boolean} shouldShow
 * @param {number} previousStreak
 * @param {number} [minStreak]
 */
export function stablePresenceInboxEntries(
  raw,
  tabNoticeCount,
  shouldShow,
  previousStreak,
  minStreak = PRESENCE_INBOX_MIN_SHOW_STREAK
) {
  if (!shouldShow(raw.length, tabNoticeCount)) {
    return { entries: [], streak: 0 };
  }
  const { streak, show } = presenceShowStreakAfterRead(previousStreak, raw.length, minStreak);
  return { entries: show ? raw : [], streak };
}

/**
 * Skip dot view-transition when only the cross-tab overlay flaps (network/device unchanged).
 * @param {{ network: string, device: string, overlay: string } | null} previous
 * @param {{ network: string, device: string, overlay: string }} next
 */
export function shouldSkipCrossTabOverlayViewTransition(previous, next) {
  if (!previous) return false;
  if (previous.network !== next.network || previous.device !== next.device) return false;
  if (previous.overlay === next.overlay) return false;
  const overlays = new Set([previous.overlay, next.overlay]);
  if (!overlays.has("cross_tab_keys")) return false;
  for (const o of overlays) {
    if (o !== "cross_tab_keys" && o !== "none") return false;
  }
  return true;
}
