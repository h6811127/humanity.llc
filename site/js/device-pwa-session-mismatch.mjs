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
  PWA_MISMATCH_DETAIL_STANDALONE,
  PWA_MISMATCH_TITLE_BROWSER,
  PWA_MISMATCH_TITLE_STANDALONE,
} from "./device-ownership-copy-core.mjs";
import { getWalletSigningKeyCount } from "./device-wallet.mjs";
import { readStandaloneModeFromWindow } from "./pwa-standalone-refresh-core.mjs";

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
  const mismatch = detectPwaSessionMismatch({
    standalone: readStandaloneModeFromWindow(w),
    hasTabSigningKeys: tabSessionHasSigningKeys(session),
    walletSigningKeyCount: getWalletSigningKeyCount(),
    lastSigningShellMode: readLastSigningShellMode(),
  });
  if (!mismatch) return null;

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
