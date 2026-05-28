/**
 * PWA install UX gating (pure helpers).
 * @see docs/PWA_INSTALL.md
 */

import { isPwaExcludedPath, isPwaShellPagePath } from "./pwa-install-metadata-core.mjs";

export const PWA_INSTALL_DOC = "docs/PWA_INSTALL.md";

/** localStorage key — ISO timestamp when user dismissed install card. */
export const PWA_INSTALL_DISMISS_KEY = "hc_pwa_install_dismissed_at";

/** Snooze after explicit dismiss (7 days). */
export const PWA_INSTALL_DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

/** Minimum saved cards before proactive install hint on landing (returning steward). */
export const PWA_INSTALL_MIN_SAVED_CARDS = 1;

/** Do not show install card while inbox has urgent cross-tab/orphan items. */
export const PWA_INSTALL_BLOCKED_INBOX_KINDS = [
  "orphan_keys_removed",
  "cross_tab_keys",
  "other_tabs_unsaved_keys",
];

/**
 * @param {{ matches?: boolean } | null | undefined} mediaQuery
 */
export function isStandaloneDisplayMode(mediaQuery) {
  return Boolean(mediaQuery?.matches);
}

/**
 * @param {string | null | undefined} dismissedAtIso
 * @param {number} [nowMs]
 */
export function isInstallDismissSnoozed(dismissedAtIso, nowMs = Date.now()) {
  if (!dismissedAtIso) return false;
  const dismissedAt = Date.parse(dismissedAtIso);
  if (Number.isNaN(dismissedAt)) return false;
  return nowMs - dismissedAt < PWA_INSTALL_DISMISS_COOLDOWN_MS;
}

/**
 * @param {{
 *   pathname: string;
 *   standalone: boolean;
 *   deferredPromptAvailable: boolean;
 *   isIosSafari: boolean;
 *   dismissedAtIso?: string | null;
 *   savedCardCount?: number;
 *   inboxKinds?: string[];
 *   deviceStatusLoadError?: boolean;
 *   nowMs?: number;
 * }} input
 */
export function shouldShowPwaInstallSurface(input) {
  const {
    pathname,
    standalone,
    deferredPromptAvailable,
    isIosSafari,
    dismissedAtIso = null,
    savedCardCount = 0,
    inboxKinds = [],
    deviceStatusLoadError = false,
    nowMs = Date.now(),
  } = input;

  if (standalone) return false;
  if (deviceStatusLoadError) return false;
  if (!isPwaShellPagePath(pathname)) return false;
  if (isPwaExcludedPath(pathname)) return false;
  if (isInstallDismissSnoozed(dismissedAtIso, nowMs)) return false;
  if (savedCardCount < PWA_INSTALL_MIN_SAVED_CARDS) return false;

  const blockedInbox = inboxKinds.some((kind) =>
    PWA_INSTALL_BLOCKED_INBOX_KINDS.includes(kind)
  );
  if (blockedInbox) return false;

  if (deferredPromptAvailable) return true;
  if (isIosSafari) return true;
  return false;
}

/**
 * Android/Chromium one-tap install is available.
 * @param {{ deferredPromptAvailable: boolean; standalone: boolean }} input
 */
export function canTriggerNativeInstallPrompt(input) {
  return Boolean(input.deferredPromptAvailable && !input.standalone);
}

/**
 * iOS manual Add to Home Screen instruction only (no programmatic install).
 * @param {{ isIosSafari: boolean; standalone: boolean; deferredPromptAvailable: boolean }} input
 */
export function shouldShowIosAddToHomeInstructions(input) {
  return Boolean(
    input.isIosSafari && !input.standalone && !input.deferredPromptAvailable
  );
}
