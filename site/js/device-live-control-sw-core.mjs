/**
 * Pure live-proof polling for the background service worker (Phase D + request budget Phase 4).
 * @see docs/DEVICE_INBOX.md - v2 Phase D
 * @see docs/DEVICE_OS_REQUEST_BUDGET.md - Phase 4
 */
import { osNotificationContentForLiveProof } from "./device-browser-notifications-core.mjs";
import {
  buildLiveControlProofHref,
  classifyChallengeHttpStatus,
  isPollableWalletEntry,
  liveControlPendingSignature,
  parsePendingChallengeBody,
  pendingItemsFromPollSlots,
  pruneLiveControlPollSlots,
  updateLiveControlPollSlot,
} from "./device-live-control-inbox-core.mjs";
import {
  liveControlPollAllowedByResolverHealth,
  nextRoundRobinIndex,
  pickRoundRobinPollIndex,
} from "./device-live-control-poll-scheduler.mjs";
import { walletEntryQrId } from "./device-wallet.mjs";

export const SW_STATE_CACHE = "hc-live-proof-sw-v1";
export const SW_STATE_CACHE_KEY = "/__hc_sw_live_proof_state__";
export const SW_SYNC_TAG = "hc-live-proof-poll";
export const SW_PERIODIC_TAG = "hc-live-proof-poll";
export const SW_NOTIFICATION_TAG = "hc-live-proof";

/** Minimum periodicSync interval (request budget Phase 4: 5–15 min; use 15). */
export const SW_PERIODIC_MIN_INTERVAL_MS = 15 * 60 * 1000;

/** Back off SW polls after challenge 429 (align with tab inbox). */
export const SW_RATE_LIMIT_BACKOFF_MS = 60_000;

/**
 * @param {string} apiOrigin
 * @param {string} profileId
 * @param {string} qrId
 */
export function pendingLiveControlChallengeUrl(apiOrigin, profileId, qrId) {
  const url = new URL(
    `/.well-known/hc/v1/cards/${encodeURIComponent(profileId)}/live-control/challenges`,
    apiOrigin
  );
  url.searchParams.set("qr_id", qrId);
  return url.href;
}

/**
 * Wallet rows the page should mirror into the service worker.
 * @param {Array<Record<string, unknown>>} wallet
 */
export function liveProofPollTargetsFromWallet(wallet) {
  return wallet
    .filter((entry) => isPollableWalletEntry(entry))
    .map((entry) => ({
      profile_id: entry.profile_id,
      qr_id: walletEntryQrId(entry),
      label: entry.label,
      handle: entry.handle,
      scan_url: entry.scan_url,
    }))
    .filter((row) => typeof row.profile_id === "string" && typeof row.qr_id === "string");
}

/**
 * @param {{
 *   enabled: boolean,
 *   resolverHealth?: 'ok' | 'degraded' | 'offline',
 * }} input
 */
export function swLiveProofPollingShouldRun(input) {
  if (!input.enabled) return false;
  return liveControlPollAllowedByResolverHealth(input.resolverHealth ?? "offline");
}

/**
 * @param {Record<string, unknown>} entry
 * @param {string} apiOrigin
 * @param {(url: string) => Promise<{ ok: boolean, status: number, body: unknown }>} fetchFn
 * @returns {Promise<{ kind: import("./device-live-control-inbox-core.mjs").LiveControlPollKind, item?: import("./device-live-control-inbox-core.mjs").LiveControlPendingItem }>}
 */
async function fetchLiveProofChallengeForEntry(entry, apiOrigin, fetchFn) {
  const profileId = String(entry.profile_id);
  const qrId = walletEntryQrId(entry);
  if (!qrId) return { kind: "none" };
  const url = pendingLiveControlChallengeUrl(apiOrigin, profileId, qrId);
  try {
    const { status, body } = await fetchFn(url);
    const httpKind = classifyChallengeHttpStatus(status);
    if (httpKind === "none") return { kind: "none" };
    if (httpKind === "rate_limited") return { kind: "rate_limited" };
    if (httpKind === "unreachable") return { kind: "unreachable" };
    const item = parsePendingChallengeBody(body, entry);
    return item ? { kind: "pending", item } : { kind: "none" };
  } catch {
    return { kind: "unreachable" };
  }
}

/**
 * One challenge GET per call (round-robin). Accumulates pending in pollSlots across SW ticks.
 *
 * @param {Array<Record<string, unknown>>} entries
 * @param {string} apiOrigin
 * @param {(url: string) => Promise<{ ok: boolean, status: number, body: unknown }>} [fetchFn]
 * @param {number} [roundRobinCursor]
 * @param {Record<string, import("./device-live-control-inbox-core.mjs").LiveControlPendingItem>} [pollSlotsRecord]
 */
export async function pollWalletEntriesForLiveProof(
  entries,
  apiOrigin,
  fetchFn = defaultFetch,
  roundRobinCursor = 0,
  pollSlotsRecord = {}
) {
  const pollable = entries.filter((e) => isPollableWalletEntry(e));
  /** @type {Map<string, import("./device-live-control-inbox-core.mjs").LiveControlPendingItem>} */
  const slots = new Map(Object.entries(pollSlotsRecord));
  pruneLiveControlPollSlots(slots, pollable);

  if (pollable.length === 0) {
    return {
      pending: [],
      signature: "",
      nextCursor: 0,
      pollSlots: {},
      rateLimited: false,
    };
  }

  const pollIndex = pickRoundRobinPollIndex(roundRobinCursor, pollable.length);
  const entry = pollable[pollIndex];
  const result = await fetchLiveProofChallengeForEntry(entry, apiOrigin, fetchFn);

  if (result.kind !== "rate_limited") {
    updateLiveControlPollSlot(slots, entry, result);
  }

  const pending = pendingItemsFromPollSlots(pollable, slots);
  return {
    pending,
    signature: liveControlPendingSignature(pending),
    nextCursor: nextRoundRobinIndex(roundRobinCursor, pollable.length),
    pollSlots: Object.fromEntries(slots),
    rateLimited: result.kind === "rate_limited",
  };
}

/**
 * @param {import("./device-live-control-inbox-core.mjs").LiveControlPendingItem} item
 * @param {string} pageOrigin
 */
export function buildLiveProofSwNotification(item, pageOrigin) {
  const { title, body } = osNotificationContentForLiveProof(item);
  return {
    title,
    body,
    tag: SW_NOTIFICATION_TAG,
    href: buildLiveControlProofHref(item, pageOrigin),
  };
}

/**
 * @param {Array<{ visibilityState?: string }>} clients
 */
export function anyClientVisible(clients) {
  return clients.some((c) => c.visibilityState === "visible");
}

/**
 * @param {string | null | undefined} prevSig
 * @param {string} nextSig
 * @param {number} pendingCount
 */
export function shouldShowSwLiveProofNotification(prevSig, nextSig, pendingCount) {
  if (pendingCount <= 0) return false;
  if (!nextSig) return false;
  return prevSig !== nextSig;
}

/** @param {string} url */
async function defaultFetch(url) {
  const res = await fetch(url, { cache: "no-store" });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { ok: res.ok, status: res.status, body };
}
