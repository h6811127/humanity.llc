/**
 * Browser helpers for PWA vs Safari signing context mismatch (P2-2).
 */
import { tabSessionHasSigningKeys, getTabSession } from "./device-keys.mjs";
import {
  detectPwaSessionMismatch,
  parseLastSigningShellMode,
  LAST_SIGNING_SHELL_MODE_KEY,
} from "./device-pwa-session-mismatch-core.mjs";
import {
  PWA_MISMATCH_DETAIL_BROWSER,
  PWA_MISMATCH_DETAIL_BROWSER_EMPTY,
  PWA_MISMATCH_DETAIL_STANDALONE,
  PWA_MISMATCH_TITLE_BROWSER,
  PWA_MISMATCH_TITLE_BROWSER_EMPTY,
  PWA_MISMATCH_TITLE_STANDALONE,
} from "./device-ownership-copy-core.mjs";
import { getWalletSigningKeyCount } from "./device-wallet.mjs";
import { readStandaloneModeFromWindow } from "./pwa-standalone-refresh-core.mjs";
import { isIosWebKitUserAgent } from "./safari-itp-storage-notice-core.mjs";

function readLastSigningShellMode() {
  try {
    return parseLastSigningShellMode(localStorage.getItem(LAST_SIGNING_SHELL_MODE_KEY));
  } catch {
    return null;
  }
}

/**
 * @param {Window | null | undefined} [win]
 */
export function gatherPwaSessionMismatch(win) {
  const w = win ?? (typeof window !== "undefined" ? window : null);
  const session = getTabSession();
  const nav = w?.navigator;
  const mismatch = detectPwaSessionMismatch({
    standalone: readStandaloneModeFromWindow(w),
    hasTabSigningKeys: tabSessionHasSigningKeys(session),
    walletSigningKeyCount: getWalletSigningKeyCount(),
    lastSigningShellMode: readLastSigningShellMode(),
    isIosWebKit: nav
      ? isIosWebKitUserAgent(nav.userAgent || "", {
          platform: nav.platform,
          maxTouchPoints: nav.maxTouchPoints,
        })
      : false,
  });
  if (!mismatch) return null;

  if (mismatch.iosEmptyWalletAfterPwa) {
    return {
      ...mismatch,
      title: PWA_MISMATCH_TITLE_BROWSER_EMPTY,
      detail: PWA_MISMATCH_DETAIL_BROWSER_EMPTY,
      canRestoreInThisTab: false,
    };
  }

  if (mismatch.canRestoreInThisTab) {
    return {
      ...mismatch,
      title: PWA_MISMATCH_TITLE_STANDALONE,
      detail: PWA_MISMATCH_DETAIL_STANDALONE,
      canRestoreInThisTab: true,
    };
  }

  return {
    ...mismatch,
    title: PWA_MISMATCH_TITLE_BROWSER,
    detail: PWA_MISMATCH_DETAIL_BROWSER,
    canRestoreInThisTab: false,
  };
}

/**
 * Quiet rehydrate and vouch auto-activate must not load keys across PWA/browser split (P2-2 · S3).
 * @param {Window | null | undefined} [win]
 */
export function isSigningAutoLoadBlockedByPwaSessionMismatch(win) {
  return gatherPwaSessionMismatch(win) !== null;
}
