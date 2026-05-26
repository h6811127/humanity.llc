/**
 * Pure helpers for hub network / live-proof manual checks (request budget Phases 5–8).
 * @see docs/DEVICE_OS_REQUEST_BUDGET.md
 */

import { liveControlAutoPollBudgetPausedMessage } from "./device-live-control-poll-budget-core.mjs";
import { stewardServerQuotaPausedMessage } from "./device-steward-quota-core.mjs";

export const STORAGE_WATCH_LIVE_PROOF = "hc_watch_live_proof";

/** Debounce hub wallet status fetches (Safari P1 / request budget). */
export const WALLET_NETWORK_HUB_FETCH_DEBOUNCE_MS = 300;

/**
 * Network poll runs when wallet page is open or hub sheet is expanded (not collapsed landing).
 *
 * @param {{ onWalletPage: boolean, hubExpanded: boolean }} scope
 */
export function walletHubNetworkFetchScopeActive(scope) {
  return scope.onWalletPage === true || scope.hubExpanded === true;
}

/**
 * @param {{
 *   fetchNetworkStatus: boolean,
 *   onWalletPage: boolean,
 *   hubExpanded: boolean,
 * }} input
 */
export function shouldScheduleWalletNetworkFetchAfterHubRender(input) {
  if (!input.fetchNetworkStatus) return false;
  return walletHubNetworkFetchScopeActive({
    onWalletPage: input.onWalletPage,
    hubExpanded: input.hubExpanded,
  });
}

/**
 * Opt-in automatic live-control polling (`localStorage.hc_watch_live_proof === "1"`).
 * Unset or `"0"` is off (request budget / long-session default).
 *
 * @param {() => string | null} [readStorage]
 */
export function isWatchLiveProofEnabled(readStorage) {
  const read =
    readStorage ??
    (() => {
      try {
        return localStorage.getItem(STORAGE_WATCH_LIVE_PROOF);
      } catch {
        return null;
      }
    });
  return read() === "1";
}

/**
 * @param {number} checkedAt epoch ms; 0 = never
 * @param {number} [now]
 */
export function formatLastCheckedRel(checkedAt, now = Date.now()) {
  if (!checkedAt || checkedAt <= 0) return null;
  const secs = Math.max(0, Math.floor((now - checkedAt) / 1000));
  if (secs < 45) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return mins === 1 ? "1 min ago" : `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours === 1 ? "1 hr ago" : `${hours} hr ago`;
  try {
    return new Date(checkedAt).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

/**
 * @param {{
 *   networkCheckedAt?: number,
 *   liveProofCheckedAt?: number,
 *   now?: number,
 *   autoPollBudgetPaused?: boolean,
 *   stewardQuotaPaused?: boolean,
 *   liveProofWatchOn?: boolean,
 * }} input
 */
export function formatHubNetworkStatusLine(input) {
  if (input.stewardQuotaPaused && input.liveProofWatchOn) {
    return stewardServerQuotaPausedMessage();
  }
  if (input.autoPollBudgetPaused && input.liveProofWatchOn) {
    return liveControlAutoPollBudgetPausedMessage();
  }
  const now = input.now ?? Date.now();
  const parts = [];
  const networkRel = formatLastCheckedRel(input.networkCheckedAt ?? 0, now);
  const proofRel = formatLastCheckedRel(input.liveProofCheckedAt ?? 0, now);
  if (networkRel) parts.push(`Network checked ${networkRel}`);
  if (proofRel) parts.push(`Live proof checked ${proofRel}`);
  if (parts.length === 0) return "Not checked yet this visit";
  return parts.join(" · ");
}
