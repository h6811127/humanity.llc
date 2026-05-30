/**
 * iOS Safari ITP storage notice gating (Safari P2-1 · R4).
 * @see docs/SAFARI_KEYS_WIPE_INVESTIGATION.md P2-1
 */

import { isPwaShellPagePath } from "./pwa-install-metadata-core.mjs";

export const SAFARI_ITP_NOTICE_DISMISS_KEY = "hc_safari_itp_notice_dismissed_at";

/** Snooze after explicit dismiss (7 days). */
export const SAFARI_ITP_NOTICE_DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export const SAFARI_ITP_NOTICE_MIN_SAVED_CARDS = 1;

/**
 * @param {string | null | undefined} dismissedAtIso
 * @param {number} [nowMs]
 */
export function isSafariItpNoticeDismissSnoozed(dismissedAtIso, nowMs = Date.now()) {
  if (!dismissedAtIso) return false;
  const dismissedAt = Date.parse(dismissedAtIso);
  if (Number.isNaN(dismissedAt)) return false;
  return nowMs - dismissedAt < SAFARI_ITP_NOTICE_DISMISS_COOLDOWN_MS;
}

/**
 * @param {string} userAgent
 * @param {{ platform?: string; maxTouchPoints?: number }} [nav]
 */
export function isIosWebKitUserAgent(userAgent, nav = {}) {
  const ua = userAgent || "";
  const iosDevice = /iPad|iPhone|iPod/.test(ua);
  const ipadOsDesktop =
    nav.platform === "MacIntel" && Number(nav.maxTouchPoints) > 1;
  return iosDevice || ipadOsDesktop;
}

/**
 * @param {{
 *   pathname: string;
 *   isIosWebKit: boolean;
 *   savedCardCount?: number;
 *   dismissedAtIso?: string | null;
 *   deviceStatusLoadError?: boolean;
 *   standalone?: boolean;
 *   lastSigningShellMode?: "standalone" | "browser" | null;
 *   nowMs?: number;
 * }} input
 */
export function shouldShowSafariItpStorageNotice(input) {
  const {
    pathname,
    isIosWebKit,
    savedCardCount = 0,
    dismissedAtIso = null,
    deviceStatusLoadError = false,
    standalone = false,
    lastSigningShellMode = null,
    nowMs = Date.now(),
  } = input;

  if (!isIosWebKit) return false;
  if (deviceStatusLoadError) return false;
  if (!isPwaShellPagePath(pathname)) return false;
  const hasSavedCards = savedCardCount >= SAFARI_ITP_NOTICE_MIN_SAVED_CARDS;
  const iosBrowserAfterPwa =
    !standalone && lastSigningShellMode === "standalone";
  if (!hasSavedCards && !iosBrowserAfterPwa) return false;
  if (isSafariItpNoticeDismissSnoozed(dismissedAtIso, nowMs)) return false;
  return true;
}
