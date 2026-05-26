/**
 * Browser cross-tab notification snapshot — holds streak between reads.
 * @see docs/CROSS_TAB_KEYS_NOTIFICATION_SYSTEM.md
 */
import { computeCrossTabNotificationState } from "./device-cross-tab-state-core.mjs";
import { tabNoticeCount } from "./device-counts.mjs";
import {
  shouldShowCrossTabKeysNotice,
  shouldShowOrphanRemovedKeysNotice,
} from "./device-cross-tab-visibility.mjs";
import { getOrphanRemovedTabsWithKeys, getOtherTabsWithKeys } from "./device-tab-presence.mjs";

let genericStreak = 0;
/** @type {string | null} */
let genericPreviousFingerprint = null;
let orphanStreak = 0;
/** @type {string | null} */
let orphanPreviousFingerprint = null;
let custodyListenersBound = false;

/** Reset fingerprint streaks (custody change, tests). */
export function invalidateCrossTabNotificationState() {
  genericStreak = 0;
  genericPreviousFingerprint = null;
  orphanStreak = 0;
  orphanPreviousFingerprint = null;
}

/** @returns {import("./device-cross-tab-state-core.mjs").CrossTabNotificationState} */
export function getCrossTabNotificationState() {
  const notices = tabNoticeCount();
  const state = computeCrossTabNotificationState({
    tabNoticeCount: notices,
    genericRaw: getOtherTabsWithKeys(),
    orphanRaw: getOrphanRemovedTabsWithKeys(),
    genericStreak,
    genericPreviousFingerprint,
    orphanStreak,
    orphanPreviousFingerprint,
    shouldShowGeneric: shouldShowCrossTabKeysNotice,
    shouldShowOrphan: shouldShowOrphanRemovedKeysNotice,
  });

  genericStreak = state.genericStreak;
  genericPreviousFingerprint = state.genericFingerprint;
  orphanStreak = state.orphanStreak;
  orphanPreviousFingerprint = state.orphanFingerprint;

  return state;
}

/** Invalidate streak when wallet/session custody changes (Phase 1 partial — full list in rebuild Phase 4). */
export function startCrossTabNotificationState() {
  if (custodyListenersBound) return;
  custodyListenersBound = true;

  window.addEventListener("storage", (e) => {
    if (e.key === "hc_wallet" || e.key === "hc_created") {
      invalidateCrossTabNotificationState();
    }
  });
  window.addEventListener("hc-device-hub-changed", invalidateCrossTabNotificationState);
  window.addEventListener("hc-wallet-removed-profiles-changed", invalidateCrossTabNotificationState);
}
