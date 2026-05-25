/**
 * Fetch resolver card status for saved-wallet rows (cached in sessionStorage).
 * Tracks last-seen network status per card for "revoked since last visit" alerts.
 */
import { getCardStatusUrl } from "./hc-sign.mjs";
import { loadWallet } from "./device-wallet.mjs";
import { isRevokedSinceLastVisitFromBaseline } from "./wallet-network-baseline.mjs";

const CACHE_KEY = "hc_wallet_network_cache";
const LAST_SEEN_KEY = "hc_wallet_last_seen_network";
const TTL_MS = 5 * 60 * 1000;

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

/** @param {string} profileId */
export function getCachedNetworkStatus(profileId) {
  const entry = loadCache()[profileId];
  if (!entry || Date.now() - entry.at > TTL_MS) return null;
  return entry.status;
}

/**
 * @param {string} status
 * @returns {{ label: string, tone: 'ok' | 'warn' | 'muted' | 'offline' }}
 */
export function networkStatusChip(status) {
  const s = String(status || "").toLowerCase();
  if (s === "active") return { label: "Live State Active", tone: "ok" };
  if (s === "revoked") return { label: "Revoked on Network", tone: "warn" };
  if (s === "offline" || s === "error") return { label: "Resolver Unreachable", tone: "offline" };
  if (s === "checking") return { label: "Sync Checking…", tone: "muted" };
  return { label: s ? s.charAt(0).toUpperCase() + s.slice(1) : "Unknown", tone: "muted" };
}

/**
 * @param {Array<{ profile_id: string, qr_id?: string | null }>} entries
 * @param {(map: Record<string, string>) => void} [onDone]
 */
export async function refreshWalletNetworkStatuses(entries, onDone) {
  const cache = loadCache();
  const map = {};
  const fetches = [];

  for (const entry of entries) {
    const pid = entry.profile_id;
    const cached = cache[pid];
    if (cached && Date.now() - cached.at <= TTL_MS) {
      map[pid] = cached.status;
      continue;
    }
    fetches.push(
      (async () => {
        try {
          const res = await fetch(getCardStatusUrl(pid, entry.qr_id ?? null), {
            cache: "no-store",
          });
          if (!res.ok) {
            map[pid] = "error";
            cache[pid] = { status: "error", at: Date.now() };
            return;
          }
          const body = await res.json();
          const status = body?.scan?.card?.status || "unknown";
          map[pid] = status;
          cache[pid] = { status, at: Date.now() };
        } catch {
          map[pid] = "offline";
          cache[pid] = { status: "offline", at: Date.now() };
        }
      })()
    );
  }

  await Promise.all(fetches);
  saveCache(cache);
  onDone?.(map);
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
 * True when the resolver now reports revoked but this device last recorded a non-revoked state.
 * @param {string} profileId
 * @param {string | null | undefined} currentStatus
 */
export function isRevokedSinceLastVisit(profileId, currentStatus) {
  const last = loadLastSeen()[profileId];
  return isRevokedSinceLastVisitFromBaseline(last, currentStatus);
}

/** @param {string} profileId @param {string} status */
export function recordNetworkSeen(profileId, status) {
  if (!profileId) return;
  const map = loadLastSeen();
  map[profileId] = String(status || "").toLowerCase();
  saveLastSeen(map);
}

/** Snapshot current cached statuses when leaving the site (end of visit). */
export function snapshotNetworkSeenOnExit() {
  const seen = loadLastSeen();
  for (const entry of loadWallet()) {
    const pid = entry.profile_id;
    const cached = getCachedNetworkStatus(pid);
    if (!cached) continue;
    seen[pid] = String(cached).toLowerCase();
  }
  saveLastSeen(seen);
}

/**
 * After a fresh resolver fetch, store baseline for cards that are not in transition.
 * @param {Record<string, string>} statusMap
 */
export function syncLastSeenFromNetworkMap(statusMap) {
  for (const [profileId, status] of Object.entries(statusMap)) {
    if (!profileId || !status) continue;
    if (isRevokedSinceLastVisit(profileId, status)) continue;
    recordNetworkSeen(profileId, status);
  }
}
