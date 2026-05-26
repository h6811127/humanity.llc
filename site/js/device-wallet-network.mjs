/**
 * Fetch resolver card status for saved-wallet rows (cached in sessionStorage).
 * Tracks last-seen network status per card for card-disabled-since-visit alerts.
 */
import { walletEntryQrId, loadWallet, saveWallet, normalizeWalletQrIds } from "./device-wallet.mjs";
import { getCardStatusUrl } from "./hc-sign.mjs";
import {
  alertStateForNetworkPoll,
  alertStateFromScanKind,
  CARD_REVOKED_ALERT_STATE,
  isRevokedSinceLastVisitFromBaseline,
} from "./wallet-network-baseline.mjs";
import {
  mergeLastSeenFromNetworkMap,
  networkStatusChip,
  parseNetworkVerification,
  readCachedNetworkStatus,
  readCachedVerification,
  shouldUseCachedNetworkStatus,
  verificationRecordFromLabelState,
  WALLET_NETWORK_CACHE_TTL_MS,
} from "./device-wallet-network-core.mjs";

export { readCachedVerification };

const CACHE_KEY = "hc_wallet_network_cache";
const LAST_SEEN_KEY = "hc_wallet_last_seen_network";
let latestResolvedAlertStateMap = {};
/** @type {Record<string, string | null>} */
let latestResolvedScanKindMap = {};
let latestResolvedAt = 0;
/** Profile IDs with at least one resolver-confirmed fetch this page visit. */
const resolverConfirmedProfileIdsThisVisit = new Set();

// bfcache / fast navigation can keep JS context alive. If we restore from bfcache,
// clear resolver-confirmed in-memory state so we don't re-light banners based on
// a previous visit's confirmed poll.
if (
  typeof window !== "undefined" &&
  typeof window.addEventListener === "function"
) {
  window.addEventListener("pageshow", (e) => {
    /** @type {{ persisted?: boolean } | undefined} */
    const detail = e;
    if (!detail?.persisted) return;
    latestResolvedAlertStateMap = {};
    latestResolvedScanKindMap = {};
    latestResolvedAt = 0;
    resolverConfirmedProfileIdsThisVisit.clear();
  });
}

/** @param {string} profileId */
function clearResolverConfirmedForProfile(profileId) {
  if (!profileId) return;
  delete latestResolvedAlertStateMap[profileId];
  delete latestResolvedScanKindMap[profileId];
  resolverConfirmedProfileIdsThisVisit.delete(profileId);
  if (resolverConfirmedProfileIdsThisVisit.size === 0) {
    latestResolvedAt = 0;
  }
}

/**
 * @param {string} profileId
 * @param {string} alertState
 * @param {string | null | undefined} scanKind
 */
function setResolverConfirmedForProfile(profileId, alertState, scanKind) {
  if (!profileId || !alertState) return;
  latestResolvedAlertStateMap[profileId] = alertState;
  latestResolvedScanKindMap[profileId] = scanKind ?? null;
  resolverConfirmedProfileIdsThisVisit.add(profileId);
  latestResolvedAt = Date.now();
}

/** @type {string} Fired when hc_wallet_last_seen_network changes (snapshot, Got it, Manage). */
export const NETWORK_BASELINE_CHANGED = "hc-wallet-network-baseline-changed";
export const NETWORK_REFRESHED = "hc-wallet-network-refreshed";

export { alertStateFromScanKind, CARD_REVOKED_ALERT_STATE, networkStatusChip };

function notifyBaselineChanged() {
  window.dispatchEvent(new Event(NETWORK_BASELINE_CHANGED));
}

function notifyNetworkRefreshed(statusMap, alertStateMap, scanKindMap, resolverConfirmedMap) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(NETWORK_REFRESHED, {
      detail: { statusMap, alertStateMap, scanKindMap, resolverConfirmedMap },
    })
  );
}

function loadCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveCache(cache) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
}

function readCachedEntry(profileId) {
  const cache = loadCache();
  const entry = cache[profileId];
  if (!entry || !readCachedNetworkStatus({ [profileId]: entry }, profileId, Date.now(), WALLET_NETWORK_CACHE_TTL_MS)) {
    return null;
  }
  return entry;
}

/** @param {string} profileId */
export function getCachedNetworkStatus(profileId) {
  return readCachedNetworkStatus(loadCache(), profileId, Date.now(), WALLET_NETWORK_CACHE_TTL_MS);
}

/** @param {string} profileId */
export function getCachedNetworkAlertState(profileId) {
  const entry = readCachedEntry(profileId);
  if (!entry) return null;
  return alertStateForNetworkPoll(entry.scanKind, entry.status);
}

/** True after at least one resolver-confirmed status read this page visit. */
export function hasLatestResolverNetworkPoll() {
  return latestResolvedAt > 0;
}

/** True when this profile had a resolver-confirmed status read this visit (not cache-only). */
export function isResolverConfirmedProfile(profileId) {
  if (!profileId || !latestResolvedAt) return false;
  return resolverConfirmedProfileIdsThisVisit.has(profileId);
}

/** Fresh resolver-backed alert state map from the latest wallet poll. */
export function getLatestResolvedAlertState(profileId) {
  if (!profileId) return null;
  if (!latestResolvedAt) return null;
  return latestResolvedAlertStateMap[profileId] ?? null;
}

/** @param {string} profileId */
export function getLatestResolvedScanKind(profileId) {
  if (!profileId) return null;
  if (!latestResolvedAt) return null;
  if (!Object.prototype.hasOwnProperty.call(latestResolvedScanKindMap, profileId)) {
    return null;
  }
  return latestResolvedScanKindMap[profileId] ?? null;
}

/**
 * Maps for since-visit UI from resolver-confirmed reads this visit only.
 * @param {Array<{ profile_id?: string }>} [entries] defaults to {@link loadWallet}
 * @returns {{
 *   alertStateMap: Record<string, string>,
 *   scanKindMap: Record<string, string | null>,
 *   resolverConfirmedMap: Record<string, boolean>,
 * } | null}
 */
export function buildResolverConfirmedWalletPollMaps(entries) {
  if (!hasLatestResolverNetworkPoll()) return null;
  const wallet = entries ?? loadWallet();
  /** @type {Record<string, string>} */
  const alertStateMap = {};
  /** @type {Record<string, string | null>} */
  const scanKindMap = {};
  /** @type {Record<string, boolean>} */
  const resolverConfirmedMap = {};
  for (const entry of wallet) {
    const pid = entry.profile_id;
    if (!pid || !isResolverConfirmedProfile(pid)) continue;
    const resolved = getLatestResolvedAlertState(pid);
    if (resolved == null) continue;
    alertStateMap[pid] = resolved;
    scanKindMap[pid] = getLatestResolvedScanKind(pid);
    resolverConfirmedMap[pid] = true;
  }
  return { alertStateMap, scanKindMap, resolverConfirmedMap };
}

/** @param {string} profileId */
export function getNetworkLastSeenBaseline(profileId) {
  if (!profileId) return null;
  const last = loadLastSeen()[profileId];
  return last == null ? null : String(last);
}

/** @param {string} profileId */
export function getCachedNetworkScanKind(profileId) {
  const entry = readCachedEntry(profileId);
  return entry?.scanKind ?? null;
}

/** @param {string} profileId */
export function getCachedNetworkSeenAt(profileId) {
  const cache = loadCache();
  const entry = cache?.[profileId];
  return typeof entry?.at === "number" ? entry.at : null;
}

/** @param {string} profileId */
export function getCachedVerification(profileId) {
  return readCachedVerification(loadCache(), profileId, Date.now(), WALLET_NETWORK_CACHE_TTL_MS);
}

/**
 * @param {unknown} body
 * @returns {{ status: string, scanKind: string | null, alertState: string }}
 */
function parseNetworkFetchBody(body) {
  const scanKind = typeof body?.scan?.kind === "string" ? body.scan.kind : null;
  const status = body?.scan?.card?.status || "unknown";
  const { verificationLabel, verificationState } = parseNetworkVerification(body);
  return {
    status,
    scanKind,
    alertState: alertStateForNetworkPoll(scanKind, status),
    verificationLabel,
    verificationState,
  };
}

/**
 * @param {Array<{ profile_id: string, qr_id?: string | null }>} entries
 * @param {(result: {
 *   statusMap: Record<string, string>,
 *   alertStateMap: Record<string, string>,
 *   scanKindMap: Record<string, string | null>,
 *   resolverConfirmedMap: Record<string, boolean>,
 * }) => void} [onDone]
 * @param {{ generation?: number, isCurrentGeneration?: () => boolean }} [options]
 */
export async function refreshWalletNetworkStatuses(entries, onDone, options = {}) {
  const { generation, isCurrentGeneration } = options;
  const cache = loadCache();
  const statusMap = {};
  const alertStateMap = {};
  const scanKindMap = {};
  const resolverConfirmedAlertStateMap = {};
  const resolverConfirmedScanKindMap = {};
  const fetches = [];
  /** Profile IDs that took a network fetch this poll (not session-cache short circuit). */
  const networkFetchedProfileIds = new Set();
  const now = Date.now();
  const lastSeen = loadLastSeen();

  for (const entry of entries) {
    const pid = entry.profile_id;
    const cached = cache[pid];
    if (shouldUseCachedNetworkStatus(lastSeen, pid, cached, now, WALLET_NETWORK_CACHE_TTL_MS)) {
      statusMap[pid] = cached.status;
      scanKindMap[pid] = cached.scanKind ?? null;
      continue;
    }
    networkFetchedProfileIds.add(pid);
    fetches.push(
      (async () => {
        try {
          const res = await fetch(getCardStatusUrl(pid, walletEntryQrId(entry)), {
            cache: "no-store",
          });
          if (!res.ok) {
            statusMap[pid] = "error";
            scanKindMap[pid] = null;
            cache[pid] = {
              status: "error",
              scanKind: null,
              verificationLabel: null,
              verificationState: null,
              at: now,
            };
            return;
          }
          const body = await res.json();
          const parsed = parseNetworkFetchBody(body);
          statusMap[pid] = parsed.status;
          scanKindMap[pid] = parsed.scanKind;
          if (parsed.alertState != null) {
            alertStateMap[pid] = parsed.alertState;
            resolverConfirmedAlertStateMap[pid] = parsed.alertState;
            resolverConfirmedScanKindMap[pid] = parsed.scanKind;
          }
          cache[pid] = {
            status: parsed.status,
            scanKind: parsed.scanKind,
            verificationLabel: parsed.verificationLabel,
            verificationState: parsed.verificationState,
            at: now,
          };
        } catch {
          statusMap[pid] = "offline";
          scanKindMap[pid] = null;
          cache[pid] = {
            status: "offline",
            scanKind: null,
            verificationLabel: null,
            verificationState: null,
            at: now,
          };
        }
      })()
    );
  }

  await Promise.all(fetches);

  if (generation != null && isCurrentGeneration && !isCurrentGeneration()) {
    onDone?.();
    return;
  }

  saveCache(cache);
  for (const pid of networkFetchedProfileIds) {
    const alertState = resolverConfirmedAlertStateMap[pid];
    if (alertState != null) {
      setResolverConfirmedForProfile(pid, alertState, resolverConfirmedScanKindMap[pid]);
    } else {
      clearResolverConfirmedForProfile(pid);
    }
  }
  const resolverConfirmedMap = Object.fromEntries(
    Object.keys(resolverConfirmedAlertStateMap).map((pid) => [pid, true])
  );
  const bannerAlertStateMap = { ...resolverConfirmedAlertStateMap };
  const bannerScanKindMap = { ...resolverConfirmedScanKindMap };
  persistWalletFromNetworkPoll({ statusMap, alertStateMap, scanKindMap });
  notifyNetworkRefreshed(
    statusMap,
    bannerAlertStateMap,
    bannerScanKindMap,
    resolverConfirmedMap
  );
  onDone?.({
    statusMap,
    alertStateMap: bannerAlertStateMap,
    scanKindMap: bannerScanKindMap,
    resolverConfirmedMap,
  });
}

function loadLastSeen() {
  try {
    const raw = localStorage.getItem(LAST_SEEN_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveLastSeen(map) {
  try {
    localStorage.setItem(LAST_SEEN_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/**
 * True when the resolver now reports card disabled but this device last recorded otherwise.
 * @param {string} profileId
 * @param {string | null | undefined} currentAlertState
 */
export function isRevokedSinceLastVisit(profileId, currentAlertState) {
  const last = loadLastSeen()[profileId];
  return isRevokedSinceLastVisitFromBaseline(last, currentAlertState);
}

/** @param {string} profileId @param {string} alertState */
export function recordNetworkSeen(profileId, alertState) {
  if (!profileId) return;
  const map = loadLastSeen();
  map[profileId] = String(alertState || "").toLowerCase();
  saveLastSeen(map);
  notifyBaselineChanged();
}

/** Snapshot current cached alert states when leaving the site (end of visit). */
export function snapshotNetworkSeenOnExit() {
  // DH-4: Only persist baselines from resolver-confirmed reads in this visit.
  if (!latestResolvedAt) return;
  const seen = loadLastSeen();
  for (const entry of loadWallet()) {
    const pid = entry.profile_id;
    const alertState = latestResolvedAlertStateMap[pid] ?? null;
    if (!alertState) continue;
    seen[pid] = String(alertState).toLowerCase();
  }
  saveLastSeen(seen);
  notifyBaselineChanged();

  // Prevent stale in-memory resolver-confirmed state from being re-applied when the
  // browser keeps the JS context (bfcache / fast navigation).
  latestResolvedAlertStateMap = {};
  latestResolvedScanKindMap = {};
  latestResolvedAt = 0;
  resolverConfirmedProfileIdsThisVisit.clear();
}

/**
 * After a fresh resolver fetch, store baseline for cards that are not in transition.
 * @param {Record<string, string>} alertStateMap
 */
export function syncLastSeenFromNetworkMap(alertStateMap) {
  saveLastSeen(mergeLastSeenFromNetworkMap(alertStateMap, loadLastSeen()));
}

/**
 * Mirror resolver poll into hc_wallet (status, scan_kind, qr_id backfill). Alerts use scan.kind + baseline.
 * @param {{
 *   statusMap?: Record<string, string>,
 *   alertStateMap?: Record<string, string>,
 *   scanKindMap?: Record<string, string | null>,
 * }} poll
 */
export function persistWalletFromNetworkPoll(poll) {
  const { statusMap = {}, scanKindMap = {} } = poll;
  if (poll.alertStateMap) syncLastSeenFromNetworkMap(poll.alertStateMap);

  const stored = loadWallet();
  const cache = loadCache();
  const { entries, changed: qrBackfill } = normalizeWalletQrIds(stored);
  let changed = qrBackfill;
  const next = entries.map((e) => {
    const pid = e.profile_id;
    const net = statusMap[pid];
    const scanKind = scanKindMap[pid] ?? null;
    const resolvedQr = walletEntryQrId(e);
    const hadScanKind = Object.prototype.hasOwnProperty.call(e, "scan_kind");
    const currentScanKind = hadScanKind ? e.scan_kind ?? null : null;
    const qrChanged = resolvedQr && e.qr_id !== resolvedQr;
    const cached = cache[pid];
    const verification = cached
      ? verificationRecordFromLabelState(cached.verificationLabel, cached.verificationState)
      : e.verification;
    const verificationDirty =
      verification &&
      JSON.stringify(verification) !== JSON.stringify(e.verification ?? null);
    if (
      (net && (e.status !== net || currentScanKind !== scanKind || qrChanged)) ||
      verificationDirty
    ) {
      changed = true;
      return {
        ...e,
        ...(qrChanged ? { qr_id: resolvedQr } : {}),
        ...(net ? { status: net, scan_kind: scanKind } : {}),
        ...(verification ? { verification } : {}),
      };
    }
    return e;
  });
  if (changed) saveWallet(next);
}
