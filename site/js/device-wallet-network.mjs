/**
 * Fetch resolver card status for saved-wallet rows (cached in sessionStorage).
 * Tracks last-seen network status per card for card-disabled-since-visit alerts.
 */
import { getCardStatusUrl } from "./hc-sign.mjs";
import { loadWallet } from "./device-wallet.mjs";
import {
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
  WALLET_NETWORK_CACHE_TTL_MS,
} from "./device-wallet-network-core.mjs";

export { readCachedVerification };

const CACHE_KEY = "hc_wallet_network_cache";
const LAST_SEEN_KEY = "hc_wallet_last_seen_network";
let latestResolvedAlertStateMap = {};
let latestResolvedAt = 0;

/** @type {string} Fired when hc_wallet_last_seen_network changes (snapshot, Got it, Manage). */
export const NETWORK_BASELINE_CHANGED = "hc-wallet-network-baseline-changed";
export const NETWORK_REFRESHED = "hc-wallet-network-refreshed";

export { alertStateFromScanKind, CARD_REVOKED_ALERT_STATE, networkStatusChip };

function notifyBaselineChanged() {
  window.dispatchEvent(new Event(NETWORK_BASELINE_CHANGED));
}

function notifyNetworkRefreshed(statusMap, alertStateMap, scanKindMap) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(NETWORK_REFRESHED, {
      detail: { statusMap, alertStateMap, scanKindMap },
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
  return alertStateFromScanKind(entry.scanKind, entry.status);
}

/** Fresh resolver-backed alert state map from the latest wallet poll. */
export function getLatestResolvedAlertState(profileId) {
  if (!profileId) return null;
  if (!latestResolvedAt) return null;
  return latestResolvedAlertStateMap[profileId] ?? null;
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
    alertState: alertStateFromScanKind(scanKind, status),
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
 * }) => void} [onDone]
 */
export async function refreshWalletNetworkStatuses(entries, onDone) {
  const cache = loadCache();
  const statusMap = {};
  const alertStateMap = {};
  const scanKindMap = {};
  const resolverConfirmedAlertStateMap = {};
  const fetches = [];
  const now = Date.now();
  const lastSeen = loadLastSeen();

  for (const entry of entries) {
    const pid = entry.profile_id;
    const cached = cache[pid];
    if (shouldUseCachedNetworkStatus(lastSeen, pid, cached, now, WALLET_NETWORK_CACHE_TTL_MS)) {
      statusMap[pid] = cached.status;
      alertStateMap[pid] = alertStateFromScanKind(cached.scanKind, cached.status);
      scanKindMap[pid] = cached.scanKind ?? null;
      continue;
    }
    fetches.push(
      (async () => {
        try {
          const res = await fetch(getCardStatusUrl(pid, entry.qr_id ?? null), {
            cache: "no-store",
          });
          if (!res.ok) {
            statusMap[pid] = "error";
            alertStateMap[pid] = "active";
            scanKindMap[pid] = null;
            resolverConfirmedAlertStateMap[pid] = "active";
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
          alertStateMap[pid] = parsed.alertState;
          scanKindMap[pid] = parsed.scanKind;
          resolverConfirmedAlertStateMap[pid] = parsed.alertState;
          cache[pid] = {
            status: parsed.status,
            scanKind: parsed.scanKind,
            verificationLabel: parsed.verificationLabel,
            verificationState: parsed.verificationState,
            at: now,
          };
        } catch {
          statusMap[pid] = "offline";
          alertStateMap[pid] = "active";
          scanKindMap[pid] = null;
          resolverConfirmedAlertStateMap[pid] = "active";
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
  saveCache(cache);
  if (Object.keys(resolverConfirmedAlertStateMap).length > 0) {
    latestResolvedAlertStateMap = {
      ...latestResolvedAlertStateMap,
      ...resolverConfirmedAlertStateMap,
    };
    latestResolvedAt = Date.now();
  }
  notifyNetworkRefreshed(statusMap, alertStateMap, scanKindMap);
  onDone?.({ statusMap, alertStateMap, scanKindMap });
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
}

/**
 * After a fresh resolver fetch, store baseline for cards that are not in transition.
 * @param {Record<string, string>} alertStateMap
 */
export function syncLastSeenFromNetworkMap(alertStateMap) {
  saveLastSeen(mergeLastSeenFromNetworkMap(alertStateMap, loadLastSeen()));
}
