import {
  alertStateFromScanKind,
  isRevokedSinceLastVisitFromBaseline,
} from "./wallet-network-baseline.mjs";

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
 * @param {string | null | undefined} [scanKind] Resolver scan.kind when available (overrides ambiguous card.status).
 * @returns {{ label: string, tone: 'ok' | 'warn' | 'muted' | 'offline' }}
 */
export function networkStatusChip(status, scanKind) {
  const kind = String(scanKind || "").toLowerCase();
  if (kind === "card_revoked") return { label: "Card disabled", tone: "warn" };
  if (kind === "qr_revoked") return { label: "QR revoked", tone: "warn" };
  const s = String(status || "").toLowerCase();
  if (s === "active") return { label: "Live State Active", tone: "ok" };
  if (s === "revoked") return { label: "Revoked on Network", tone: "warn" };
  if (s === "offline" || s === "error") return { label: "Resolver Unreachable", tone: "offline" };
  if (s === "checking") return { label: "Sync Checking…", tone: "muted" };
  return { label: s ? s.charAt(0).toUpperCase() + s.slice(1) : "Unknown", tone: "muted" };
}

/**
 * After a fresh resolver fetch, update device baselines.
 * Skips only during active→revoked transition (alert visible until Got it).
 * Self-heal: a non-revoked fetch always updates baseline (recovers from stale cache).
 * @param {Record<string, string>} statusMap
 * @param {Record<string, string>} lastSeenMap
 */
export function mergeLastSeenFromNetworkMap(statusMap, lastSeenMap) {
  const next = { ...lastSeenMap };
  for (const [profileId, status] of Object.entries(statusMap)) {
    if (!profileId || !status) continue;
    const normalized = String(status).toLowerCase();
    if (isRevokedSinceLastVisitFromBaseline(lastSeenMap[profileId], normalized)) {
      continue;
    }
    next[profileId] = normalized;
  }
  return next;
}

/**
 * @param {Record<string, string>} lastSeenMap
 * @param {string} profileId
 * @param {{ status?: string, scanKind?: string | null, at?: number } | undefined} cachedEntry
 * @param {number} now
 * @param {number} [ttlMs]
 */
export function shouldUseCachedNetworkStatus(
  lastSeenMap,
  profileId,
  cachedEntry,
  now,
  ttlMs = WALLET_NETWORK_CACHE_TTL_MS
) {
  if (!readCachedNetworkStatus({ [profileId]: cachedEntry }, profileId, now, ttlMs)) {
    return false;
  }
  const cachedStatus = String(cachedEntry?.status || "").toLowerCase();
  const lastSeen = lastSeenMap[profileId];
  const cachedAlert = alertStateFromScanKind(cachedEntry?.scanKind, cachedStatus);
  if (
    cachedAlert === "card_revoked" &&
    isRevokedSinceLastVisitFromBaseline(lastSeen, cachedAlert)
  ) {
    return false;
  }
  return true;
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
