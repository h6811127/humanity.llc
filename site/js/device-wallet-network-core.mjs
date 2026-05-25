import { isRevokedSinceLastVisitFromBaseline } from "./wallet-network-baseline.mjs";

export const WALLET_NETWORK_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * @param {number | null | undefined} cachedAt
 * @param {number} now
 * @param {number} [ttlMs]
 */
export function isNetworkCacheFresh(cachedAt, now, ttlMs = WALLET_NETWORK_CACHE_TTL_MS) {
  return typeof cachedAt === "number" && now - cachedAt <= ttlMs;
}

/**
 * @param {string | null | undefined} status
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
 * Cards in revoked-since-last-visit transition are skipped when syncing baselines.
 * @param {Record<string, string>} statusMap
 * @param {Record<string, string>} lastSeenMap
 */
export function mergeLastSeenFromNetworkMap(statusMap, lastSeenMap) {
  const next = { ...lastSeenMap };
  for (const [profileId, status] of Object.entries(statusMap)) {
    if (!profileId || !status) continue;
    if (isRevokedSinceLastVisitFromBaseline(lastSeenMap[profileId], status)) continue;
    next[profileId] = String(status).toLowerCase();
  }
  return next;
}

/**
 * @param {Record<string, { status?: string, at?: number }>} cache
 * @param {string} profileId
 * @param {number} now
 * @param {number} [ttlMs]
 */
export function readCachedNetworkStatus(cache, profileId, now, ttlMs = WALLET_NETWORK_CACHE_TTL_MS) {
  const entry = cache[profileId];
  if (!entry || !isNetworkCacheFresh(entry.at, now, ttlMs)) return null;
  return entry.status ?? null;
}
