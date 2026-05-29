/**
 * PWA standalone soft-refresh contract (pure helpers).
 * @see docs/PWA_INSTALL.md § Standalone refresh & resume
 */

import {
  walletHubNetworkFetchScopeActive,
} from "./device-hub-network-tools-core.mjs";
import {
  walletNetworkVisibilityRefreshAllowed,
  WALLET_NETWORK_VISIBILITY_REFRESH_MS,
} from "./device-live-control-poll-scheduler.mjs";

export const PWA_STANDALONE_REFRESH_DOC = "docs/PWA_INSTALL.md";

/** Coalesce visibility + pageshow resume signals in standalone. */
export const STANDALONE_SOFT_REFRESH_DEBOUNCE_MS = 150;

/** Soft refresh pipeline steps for Phase 6 (no PTR / no hard reload). */
export const STANDALONE_SOFT_REFRESH_STEPS = ["wallet", "chrome"];

/**
 * @param {{ displayModeStandalone?: boolean; legacyIosStandalone?: boolean }} env
 */
export function isStandaloneMode(env) {
  if (env.displayModeStandalone) return true;
  if (env.legacyIosStandalone) return true;
  return false;
}

/**
 * @param {Window | null | undefined} win
 */
export function readStandaloneModeFromWindow(win) {
  if (!win) return false;
  const displayModeStandalone = Boolean(
    win.matchMedia?.("(display-mode: standalone)")?.matches
  );
  // @ts-expect-error legacy iOS standalone flag
  const legacyIosStandalone = win.navigator?.standalone === true;
  return isStandaloneMode({ displayModeStandalone, legacyIosStandalone });
}

/**
 * @param {{
 *   standalone: boolean;
 *   eventKind: "visibilitychange" | "pageshow";
 *   visibilityState?: string;
 *   pageshowPersisted?: boolean;
 * }} input
 */
export function shouldTriggerStandaloneResumeRefresh(input) {
  if (!input.standalone) return false;
  if (input.eventKind === "visibilitychange") {
    return input.visibilityState === "visible";
  }
  if (input.eventKind === "pageshow") {
    return input.pageshowPersisted === true;
  }
  return false;
}

/**
 * @param {{
 *   hasWallet: boolean;
 *   onWalletPage: boolean;
 *   hubExpanded: boolean;
 *   lastNetworkFetchAt?: number;
 *   now?: number;
 * }} scope
 */
export function shouldRefreshNetworkChipsOnResume(
  scope,
  now = Date.now(),
  lastNetworkFetchAt = 0
) {
  if (!scope.hasWallet) return false;
  if (
    !walletHubNetworkFetchScopeActive({
      onWalletPage: scope.onWalletPage,
      hubExpanded: scope.hubExpanded,
    })
  ) {
    return false;
  }
  return walletNetworkVisibilityRefreshAllowed(
    lastNetworkFetchAt,
    now,
    WALLET_NETWORK_VISIBILITY_REFRESH_MS
  );
}

/**
 * @param {{
 *   refreshDeviceHub?: () => void;
 *   refreshDeviceChrome?: (opts?: { immediate?: boolean }) => void;
 * }} deps
 * @param {{ reason?: string }} [_ctx]
 */
export function runStandaloneSoftRefreshPipeline(deps, _ctx = {}) {
  for (const step of STANDALONE_SOFT_REFRESH_STEPS) {
    if (step === "wallet") deps.refreshDeviceHub?.();
    if (step === "chrome") deps.refreshDeviceChrome?.({ immediate: true });
  }
}
