/**
 * Pure live-proof polling for the background service worker (Phase D + request budget Phase 4).
 * @see docs/DEVICE_INBOX.md - v2 Phase D
 * @see docs/DEVICE_OS_REQUEST_BUDGET.md - Phase 4
 */
import { osNotificationContentForLiveProof } from "./device-browser-notifications-core.mjs";
import { isStaleLiveProofPushEvent } from "./device-steward-push-core.mjs";
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
import { fetchResolverJson } from "./resolver-conditional-fetch-core.mjs";

export const SW_STATE_CACHE = "hc-live-proof-sw-v1";
export const SW_STATE_CACHE_KEY = "/__hc_sw_live_proof_state__";
export const SW_SYNC_TAG = "hc-live-proof-poll";
export const SW_PERIODIC_TAG = "hc-live-proof-poll";
export const SW_NOTIFICATION_TAG = "hc-live-proof";

/** Page → SW: steward SSE `live_proof.pending` hint (hosted tier E4d). */
export const SW_MESSAGE_LIVE_PROOF_PUSH = "HC_SW_LIVE_PROOF_PUSH";
export const SW_MESSAGE_DELIVER_OS_PLANS = "HC_SW_DELIVER_OS_PLANS";

/**
 * @typedef {{
 *   profile_id?: string,
 *   qr_id?: string,
 *   challenge_id?: string,
 *   expires_at?: string,
 *   issued_at?: string,
 *   cachedAt?: number,
 * }} SwCachedPushHint
 */

/**
 * @param {SwCachedPushHint | null | undefined} hint
 */
export function pushHintChallengeId(hint) {
  return typeof hint?.challenge_id === "string" ? hint.challenge_id.trim() : "";
}

/**
 * @param {SwCachedPushHint[]} cache
 * @param {SwCachedPushHint} hint
 * @param {number} [now]
 */
export function upsertSwPushHintCache(cache, hint, now = Date.now()) {
  const challengeId = pushHintChallengeId(hint);
  if (!challengeId) return cache ?? [];
  if (isStaleLiveProofPushEvent(hint, now)) return cache ?? [];
  const next = (cache ?? []).filter((row) => pushHintChallengeId(row) !== challengeId);
  next.push({ ...hint, cachedAt: now });
  return next;
}

/**
 * @param {SwCachedPushHint[]} cache
 * @param {number} [now]
 */
export function pruneSwPushHintCache(cache, now = Date.now()) {
  return (cache ?? []).filter((row) => !isStaleLiveProofPushEvent(row, now));
}

/**
 * @param {import("./device-notification-delivery-core.mjs").OsNotificationPlan} plan
 */
export function osPlanCacheKey(plan) {
  if (!plan?.kind || !plan.dedupeKey) return "";
  return `${plan.kind}:${plan.dedupeKey}`;
}

/**
 * @param {import("./device-notification-delivery-core.mjs").OsNotificationPlan[]} cache
 * @param {import("./device-notification-delivery-core.mjs").OsNotificationPlan[]} plans
 */
export function upsertCachedOsPlans(cache, plans) {
  /** @type {Map<string, import("./device-notification-delivery-core.mjs").OsNotificationPlan>} */
  const map = new Map((cache ?? []).map((plan) => [osPlanCacheKey(plan), plan]));
  for (const plan of plans ?? []) {
    const key = osPlanCacheKey(plan);
    if (key) map.set(key, plan);
  }
  return [...map.values()];
}

/** Minimum periodicSync interval (request budget Phase 4: 5–15 min; use 15). */
export const SW_PERIODIC_MIN_INTERVAL_MS = 15 * 60 * 1000;

/**
 * @param {import("./device-steward-entitlements-core.mjs").StewardEntitlementsPolicy} [policy]
 */
export function resolveSwPeriodicMinIntervalMs(policy) {
  const ms = policy?.swPeriodicMinMs;
  return typeof ms === "number" && ms > 0 ? ms : SW_PERIODIC_MIN_INTERVAL_MS;
}

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
 *   watchLiveProofEnabled?: boolean,
 *   resolverHealth?: 'ok' | 'degraded' | 'offline',
 *   stewardPushEntitled?: boolean,
 *   stewardPushHealthy?: boolean,
 *   forcePoll?: boolean,
 * }} input
 */
export function swLiveProofPollingShouldRun(input) {
  /** `enabled` = background alerts on (synced from page), not Watch. */
  if (!input.enabled) return false;
  if (input.forcePoll === true) {
    return liveControlPollAllowedByResolverHealth(input.resolverHealth ?? "offline");
  }
  if (input.stewardPushEntitled === true && input.stewardPushHealthy === true) {
    return false;
  }
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
    const { status, body, notModified } = await fetchFn(url);
    const httpKind = classifyChallengeHttpStatus(status);
    if (httpKind === "unchanged" || notModified) return { kind: "unchanged" };
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
 * Probe every pollable wallet row in one wake (tab-hidden pollNow / background alerts).
 * Stops on first 429 and backs off like the page hidden probe.
 *
 * @param {Array<Record<string, unknown>>} entries
 * @param {string} apiOrigin
 * @param {(url: string) => Promise<{ ok: boolean, status: number, body: unknown }>} [fetchFn]
 * @param {Record<string, import("./device-live-control-inbox-core.mjs").LiveControlPendingItem>} [pollSlotsRecord]
 * @param {number} [roundRobinCursor] preserved when full probe completes
 */
export async function pollAllWalletEntriesForLiveProof(
  entries,
  apiOrigin,
  fetchFn = defaultFetch,
  pollSlotsRecord = {},
  roundRobinCursor = 0
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

  let rateLimited = false;
  for (const entry of pollable) {
    const result = await fetchLiveProofChallengeForEntry(entry, apiOrigin, fetchFn);
    if (result.kind === "rate_limited") {
      rateLimited = true;
      break;
    }
    updateLiveControlPollSlot(slots, entry, result);
  }

  const pending = pendingItemsFromPollSlots(pollable, slots);
  return {
    pending,
    signature: liveControlPendingSignature(pending),
    nextCursor: roundRobinCursor,
    pollSlots: Object.fromEntries(slots),
    rateLimited,
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
 * Build SW notification payload from a server push hint + mirrored wallet rows.
 *
 * @param {{
 *   profile_id?: string,
 *   qr_id?: string,
 *   challenge_id?: string,
 *   expires_at?: string,
 * }} hint
 * @param {Array<Record<string, unknown>>} entries
 * @param {string} pageOrigin
 */
export function buildLiveProofSwNotificationFromPushHint(hint, entries, pageOrigin) {
  const profileId =
    typeof hint.profile_id === "string" ? hint.profile_id.trim() : "";
  if (!profileId) return null;
  const entry = entries.find((row) => row.profile_id === profileId);
  if (!entry) return null;
  const challengeId =
    typeof hint.challenge_id === "string" ? hint.challenge_id.trim() : "";
  if (!challengeId) return null;
  return buildLiveProofSwNotification(
    {
      entry,
      challenge_id: challengeId,
      return_url: null,
      owner_url: null,
      expires_at: typeof hint.expires_at === "string" ? hint.expires_at : "",
    },
    pageOrigin
  );
}

/**
 * Whether a window client should defer SW polling to the page (foreground use).
 *
 * @param {{ visibilityState?: string, focused?: boolean }} client
 */
export function clientDefersSwLiveProofPolling(client) {
  if (client.visibilityState !== "visible") return false;
  if ("focused" in client && client.focused === false) return false;
  return true;
}

/**
 * @param {Array<{ visibilityState?: string, focused?: boolean }>} clients
 */
export function anyClientVisible(clients) {
  return clients.some((c) => clientDefersSwLiveProofPolling(c));
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

/** In-memory etag store (service worker has no sessionStorage). */
const swResolverEtagStore = {
  /** @type {Map<string, string>} */
  values: new Map(),
  /** @param {string} key */
  get(key) {
    return this.values.get(key) ?? null;
  },
  /** @param {string} key @param {string} value */
  set(key, value) {
    this.values.set(key, value);
  },
};

/** @param {string} url */
async function defaultFetch(url) {
  const { status, body, notModified } = await fetchResolverJson(
    url,
    {},
    swResolverEtagStore
  );
  return { ok: status >= 200 && status < 300, status, body, notModified };
}
