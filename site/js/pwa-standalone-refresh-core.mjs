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
import { isPwaShellPagePath } from "./pwa-install-metadata-core.mjs";

export const PWA_STANDALONE_REFRESH_DOC = "docs/PWA_INSTALL.md";

/** localStorage key — gitSha user dismissed stale-shell nudge for. */
export const PWA_STALE_SHELL_DISMISS_KEY = "hc_pwa_stale_shell_dismissed_for";

/** Coalesce visibility + pageshow resume signals in standalone. */
export const STANDALONE_SOFT_REFRESH_DEBOUNCE_MS = 150;

/** Soft refresh pipeline steps for Phase 6 (no PTR / no hard reload). */
export const STANDALONE_SOFT_REFRESH_STEPS = ["wallet", "chrome"];

/** Pathnames that support pull-to-refresh in standalone (Phase 7). */
export const PWA_PTR_ALLOWED_PATHNAMES = ["/", "/wallet/"];

/** Pull distance before commit (px). */
export const PTR_THRESHOLD_PX = 64;

/** Maximum rubber-band pull (px). */
export const PTR_MAX_PULL_PX = 120;

/** How long the “Updated” label stays visible (ms). */
export const PTR_UPDATED_HIDE_MS = 1500;

/** localStorage — user dismissed first standalone PTR tip. */
export const PWA_PTR_TIP_DISMISS_KEY = "hc_pwa_ptr_tip_dismissed";

/** DOM id for hub / wallet manual refresh row (Phase 9). */
export const PWA_REFRESH_ROW_ID = "device-pwa-refresh-row";

/** DOM id for first standalone PTR tip card (Phase 9). */
export const PWA_PTR_TIP_ID = "device-pwa-ptr-tip";

/**
 * @param {string} pathname
 */
export function isPullToRefreshPath(pathname) {
  if (pathname === "/" || pathname === "/index.html") return true;
  if (
    pathname === "/wallet" ||
    pathname === "/wallet/" ||
    pathname === "/wallet/index.html"
  ) {
    return true;
  }
  return false;
}

/**
 * @param {{
 *   standalone: boolean;
 *   pathname: string;
 *   hubSheetOpen?: boolean;
 *   inboxSheetOpen?: boolean;
 * }} input
 */
export function pullToRefreshAllowed(input) {
  if (!input.standalone) return false;
  if (!isPullToRefreshPath(input.pathname)) return false;
  if (input.hubSheetOpen) return false;
  if (input.inboxSheetOpen) return false;
  return true;
}

/**
 * @param {number} scrollTop
 * @param {number} [epsilon]
 */
export function pullToRefreshAtScrollTop(scrollTop, epsilon = 1) {
  return scrollTop <= epsilon;
}

/**
 * @param {number} pullDistance
 * @param {number} [threshold]
 */
export function pullToRefreshShouldCommit(
  pullDistance,
  threshold = PTR_THRESHOLD_PX
) {
  return pullDistance >= threshold;
}

/**
 * @param {number} pullDistance
 * @param {number} [threshold]
 * @param {number} [maxPull]
 */
export function clampPullToRefreshDistance(
  pullDistance,
  threshold = PTR_THRESHOLD_PX,
  maxPull = PTR_MAX_PULL_PX
) {
  const raw = Math.max(0, pullDistance);
  return Math.min(raw, maxPull);
}

/**
 * @param {number} pullDistance
 * @param {number} [threshold]
 * @returns {"idle" | "pulling" | "ready"}
 */
export function pullToRefreshPullState(pullDistance, threshold = PTR_THRESHOLD_PX) {
  if (pullDistance <= 0) return "idle";
  if (pullDistance >= threshold) return "ready";
  return "pulling";
}

/**
 * @param {"idle" | "pulling" | "ready" | "refreshing" | "updated"} state
 */
export function pullToRefreshIndicatorLabel(state) {
  switch (state) {
    case "pulling":
      return "Pull to refresh";
    case "ready":
      return "Release to refresh";
    case "refreshing":
      return "Refreshing…";
    case "updated":
      return "Updated";
    default:
      return "";
  }
}

/**
 * @param {string | null | undefined} sha
 */
export function normalizeBuildGitSha(sha) {
  const value = String(sha || "").trim().toLowerCase();
  if (!value || value === "dev" || value === "unknown") return "";
  return value.slice(0, 12);
}

/**
 * Compare resolver health `build` (Worker deploy) with client `SITE_BUILD_META` (Pages).
 * Mismatch signals deploy skew — common when a standalone session runs stale shell JS.
 *
 * @param {{ gitSha?: string; source?: string } | null | undefined} healthBuild
 * @param {{ gitSha?: string; source?: string } | null | undefined} clientMeta
 */
export function isShellBuildStale(healthBuild, clientMeta) {
  if (!healthBuild || !clientMeta) return false;
  if (clientMeta.source === "dev" || healthBuild.source === "dev") return false;
  const healthSha = normalizeBuildGitSha(healthBuild.gitSha);
  const clientSha = normalizeBuildGitSha(clientMeta.gitSha);
  if (!healthSha || !clientSha) return false;
  return healthSha !== clientSha;
}

/**
 * @param {Pick<Storage, "getItem"> | null | undefined} storage
 */
export function readStaleShellDismissedForSha(storage) {
  try {
    return storage?.getItem(PWA_STALE_SHELL_DISMISS_KEY) || "";
  } catch {
    return "";
  }
}

/**
 * @param {Pick<Storage, "setItem"> | null | undefined} storage
 * @param {string} gitSha
 */
export function writeStaleShellDismissedForSha(storage, gitSha) {
  const normalized = normalizeBuildGitSha(gitSha);
  if (!normalized) return;
  try {
    storage?.setItem(PWA_STALE_SHELL_DISMISS_KEY, normalized);
  } catch {
    /* private mode */
  }
}

/**
 * @param {{
 *   standalone: boolean;
 *   pathname: string;
 *   healthBuild?: { gitSha?: string; source?: string } | null;
 *   clientMeta?: { gitSha?: string; source?: string } | null;
 *   dismissedForSha?: string | null;
 *   deviceStatusLoadError?: boolean;
 * }} input
 */
export function shouldShowStaleShellNudge(input) {
  if (!input.standalone) return false;
  if (!isPwaShellPagePath(input.pathname)) return false;
  if (input.deviceStatusLoadError) return false;
  if (!isShellBuildStale(input.healthBuild, input.clientMeta)) return false;
  const dismissedFor = normalizeBuildGitSha(input.dismissedForSha);
  const healthSha = normalizeBuildGitSha(input.healthBuild?.gitSha);
  if (dismissedFor && dismissedFor === healthSha) return false;
  return true;
}

/**
 * @param {Pick<Storage, "getItem"> | null | undefined} storage
 */
export function readPtrTipDismissed(storage) {
  try {
    return storage?.getItem(PWA_PTR_TIP_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * @param {Pick<Storage, "setItem"> | null | undefined} storage
 */
export function writePtrTipDismissed(storage) {
  try {
    storage?.setItem(PWA_PTR_TIP_DISMISS_KEY, "1");
  } catch {
    /* private mode */
  }
}

/**
 * @param {{
 *   standalone: boolean;
 *   pathname: string;
 *   dismissed?: boolean;
 *   savedCardCount?: number;
 * }} input
 */
export function shouldShowStandalonePtrTip(input) {
  if (!input.standalone) return false;
  if (!isPullToRefreshPath(input.pathname)) return false;
  if (input.dismissed) return false;
  if ((input.savedCardCount ?? 0) < 1) return false;
  return true;
}

/**
 * @param {{
 *   standalone: boolean;
 *   pathname: string;
 *   savedCardCount?: number;
 * }} input
 */
export function shouldShowStandaloneRefreshRow(input) {
  if (!input.standalone) return false;
  if (!isPullToRefreshPath(input.pathname)) return false;
  if ((input.savedCardCount ?? 0) < 1) return false;
  return true;
}

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
