/**
 * Fetch resolver card status for saved-wallet rows (cached in sessionStorage).
 */
import { getCardStatusUrl } from "./hc-sign.mjs";

const CACHE_KEY = "hc_wallet_network_cache";
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
  if (s === "active") return { label: "Active", tone: "ok" };
  if (s === "revoked") return { label: "Revoked", tone: "warn" };
  if (s === "offline" || s === "error") return { label: "Unreachable", tone: "offline" };
  if (s === "checking") return { label: "Checking…", tone: "muted" };
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
