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
  readCachedNetworkStatus,
  shouldUseCachedNetworkStatus,
  WALLET_NETWORK_CACHE_TTL_MS,
} from "./device-wallet-network-core.mjs";

const CACHE_KEY = "hc_wallet_network_cache";
const LAST_SEEN_KEY = "hc_wallet_last_seen_network";

/** @type {string} Fired when hc_wallet_last_seen_network changes (snapshot, Got it, Manage). */
export const NETWORK_BASELINE_CHANGED = "hc-wallet-network-baseline-changed";

export { alertStateFromScanKind, CARD_REVOKED_ALERT_STATE, networkStatusChip };

function notifyBaselineChanged() {
  window.dispatchEvent(new Event(NETWORK_BASELINE_CHANGED));
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

/** @param {string} profileId */
export function getCachedNetworkScanKind(profileId) {
  const entry = readCachedEntry(profileId);
  return entry?.scanKind ?? null;
}

/**
 * @param {unknown} body
 * @returns {{ status: string, scanKind: string | null, alertState: string }}
 */
function parseNetworkFetchBody(body) {
  const scanKind = typeof body?.scan?.kind === "string" ? body.scan.kind : null;
  const status = body?.scan?.card?.status || "unknown";
  return {
    status,
    scanKind,
    alertState: alertStateFromScanKind(scanKind, status),
  };
}

/**
 * @param {Array<{ profile_id: string, qr_id?: string | null }>} entries
 * @param {(result: { statusMap: Record<string, string>, alertStateMap: Record<string, string> }) => void} [onDone]
 */
export async function refreshWalletNetworkStatuses(entries, onDone) {
  const cache = loadCache();
  const statusMap = {};
  const alertStateMap = {};
  const fetches = [];
  const now = Date.now();
  const lastSeen = loadLastSeen();

  for (const entry of entries) {
    const pid = entry.profile_id;
    const cached = cache[pid];
    if (shouldUseCachedNetworkStatus(lastSeen, pid, cached, now, WALLET_NETWORK_CACHE_TTL_MS)) {
      statusMap[pid] = cached.status;
      alertStateMap[pid] = alertStateFromScanKind(cached.scanKind, cached.status);
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
            cache[pid] = { status: "error", scanKind: null, at: now };
            return;
          }
          const body = await res.json();
          const parsed = parseNetworkFetchBody(body);
          statusMap[pid] = parsed.status;
          alertStateMap[pid] = parsed.alertState;
          cache[pid] = { status: parsed.status, scanKind: parsed.scanKind, at: now };
        } catch {
          statusMap[pid] = "offline";
          alertStateMap[pid] = "active";
          cache[pid] = { status: "offline", scanKind: null, at: now };
        }
      })()
    );
  }

  await Promise.all(fetches);
  saveCache(cache);
  onDone?.({ statusMap, alertStateMap });
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
  const seen = loadLastSeen();
  for (const entry of loadWallet()) {
    const pid = entry.profile_id;
    const alertState = getCachedNetworkAlertState(pid);
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
