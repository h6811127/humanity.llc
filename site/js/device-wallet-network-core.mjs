import {
  alertStateForNetworkPoll,
  alertStateFromScanKind,
  isRevokedSinceLastVisitFromBaseline,
} from "./wallet-network-baseline.mjs";

export const WALLET_NETWORK_CACHE_TTL_MS = 5 * 60 * 1000;

/** Max fresh rows kept in session `hc_wallet_network_cache` (S6 / large-wallet shell perf). */
export const WALLET_NETWORK_CACHE_MAX_ENTRIES = 20;

/**
 * @typedef {{
 *   status?: string,
 *   scanKind?: string | null,
 *   qrScope?: string | null,
 *   verificationLabel?: string | null,
 *   verificationState?: string | null,
 *   at?: number,
 * }} WalletNetworkCacheEntry
 */

/**
 * Drop expired rows and LRU-evict when over {@link WALLET_NETWORK_CACHE_MAX_ENTRIES}.
 * Protected profile IDs (current wallet / active poll set) are evicted last.
 *
 * @param {Record<string, WalletNetworkCacheEntry>} cache
 * @param {{
 *   now?: number,
 *   ttlMs?: number,
 *   maxEntries?: number,
 *   protectProfileIds?: Iterable<string>,
 *   scopeProfileIds?: Iterable<string>,
 * }} [opts]
 */
export function pruneWalletNetworkCache(cache, opts = {}) {
  const {
    now = Date.now(),
    ttlMs = WALLET_NETWORK_CACHE_TTL_MS,
    maxEntries = WALLET_NETWORK_CACHE_MAX_ENTRIES,
    protectProfileIds = [],
    scopeProfileIds = null,
  } = opts;

  const protect = new Set(
    [...protectProfileIds].filter((pid) => typeof pid === "string" && pid)
  );
  const scope = scopeProfileIds
    ? new Set([...scopeProfileIds].filter((pid) => typeof pid === "string" && pid))
    : null;
  /** @type {Record<string, WalletNetworkCacheEntry>} */
  const fresh = {};

  for (const [profileId, entry] of Object.entries(cache || {})) {
    if (!profileId || !entry || typeof entry !== "object") continue;
    if (scope && !scope.has(profileId)) continue;
    if (!isNetworkCacheFresh(entry.at, now, ttlMs)) continue;
    fresh[profileId] = entry;
  }

  const ids = Object.keys(fresh);
  if (ids.length <= maxEntries) return fresh;

  const byOldest = ids.sort(
    (a, b) => (fresh[a]?.at ?? 0) - (fresh[b]?.at ?? 0)
  );
  let over = ids.length - maxEntries;

  for (const profileId of byOldest) {
    if (over <= 0) break;
    if (protect.has(profileId)) continue;
    delete fresh[profileId];
    over -= 1;
  }

  if (over > 0) {
    for (const profileId of byOldest) {
      if (over <= 0) break;
      if (!(profileId in fresh)) continue;
      delete fresh[profileId];
      over -= 1;
    }
  }

  return fresh;
}

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
  if (kind === "active") return { label: "Live State Active", tone: "ok" };
  const s = String(status || "").toLowerCase();
  if (s === "active") return { label: "Live State Active", tone: "ok" };
  if (s === "revoked") return { label: "Card disabled", tone: "warn" };
  if (s === "offline" || s === "error") return { label: "Resolver Unreachable", tone: "offline" };
  if (s === "checking") return { label: "Sync Checking…", tone: "muted" };
  return { label: s ? s.charAt(0).toUpperCase() + s.slice(1) : "Unknown", tone: "muted" };
}

/**
 * After a fresh resolver fetch, update device baselines.
 * Skips only during active→revoked transition (alert visible until Got it).
 * Self-heal: a non-revoked fetch always updates baseline (recovers from stale cache).
 * P0b-1: never seed baseline on in-visit poll when this device has no prior baseline
 * for the profile (fresh create / first sight). Exit snapshot seeds baseline instead.
 * @param {Record<string, string>} statusMap
 * @param {Record<string, string>} lastSeenMap
 */
export function mergeLastSeenFromNetworkMap(statusMap, lastSeenMap) {
  const next = { ...lastSeenMap };
  for (const [profileId, status] of Object.entries(statusMap)) {
    if (!profileId || !status) continue;
    const prior = lastSeenMap[profileId];
    if (prior == null || prior === "") continue;
    const normalized = String(status).toLowerCase();
    if (isRevokedSinceLastVisitFromBaseline(prior, normalized)) {
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
  const cachedScanKind = String(cachedEntry?.scanKind || "").toLowerCase();
  const lastSeen = lastSeenMap[profileId];
  const cachedAlert = alertStateForNetworkPoll(cachedEntry?.scanKind, cachedStatus);
  // Never trust session cache for card-level revoke without a resolver poll this visit.
  if (cachedScanKind === "card_revoked" || cachedAlert === "card_revoked") {
    return false;
  }
  if (isRevokedSinceLastVisitFromBaseline(lastSeen, cachedAlert)) {
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

/**
 * @param {unknown} body Resolver GET .../status JSON
 * @returns {string | null}
 */
export function parseNetworkQrScope(body) {
  const scope = body?.scan?.qr?.scope;
  return typeof scope === "string" && scope.trim() ? scope.trim() : null;
}

/**
 * @param {unknown} body Resolver GET .../status JSON
 * @returns {{ verificationLabel: string | null, verificationState: string | null }}
 */
export function parseNetworkVerification(body) {
  const verification = body?.scan?.verification;
  const human = body?.scan?.human_trust;
  const label =
    (typeof human?.label === "string" && human.label) ||
    (typeof verification?.label === "string" && verification.label) ||
    null;
  const state =
    (typeof verification?.state === "string" && verification.state) || null;
  return { verificationLabel: label, verificationState: state };
}

/**
 * Wallet/session verification row aligned with scan human_trust + verification.
 * @param {string | null | undefined} label
 * @param {string | null | undefined} state
 * @returns {{ label?: string, state?: string } | null}
 */
export function verificationRecordFromLabelState(label, state) {
  const nextLabel = typeof label === "string" && label.trim() ? label.trim() : null;
  let nextState = typeof state === "string" && state.trim() ? state.trim() : null;
  if (nextLabel === "Steward") {
    nextState = "steward";
  } else if (nextLabel === "Vouched Human" && !nextState) {
    nextState = "verified_human";
  } else if (nextLabel === "Verification revoked") {
    nextState = "revoked";
  }
  if (!nextLabel && !nextState) return null;
  return {
    ...(nextLabel ? { label: nextLabel } : {}),
    ...(nextState ? { state: nextState } : {}),
  };
}

/**
 * @param {unknown} body Resolver GET .../status JSON
 * @returns {{ label?: string, state?: string } | null}
 */
export function verificationRecordFromStatusBody(body) {
  const parsed = parseNetworkVerification(body);
  const base =
    body?.scan?.verification && typeof body.scan.verification === "object"
      ? body.scan.verification
      : null;
  return (
    verificationRecordFromLabelState(
      parsed.verificationLabel || base?.label,
      parsed.verificationState || base?.state
    ) ?? (base ? { ...base } : null)
  );
}

/**
 * @param {Record<string, { verificationLabel?: string | null, verificationState?: string | null, at?: number }>} cache
 * @param {string} profileId
 * @param {number} now
 * @param {number} [ttlMs]
 */
export function readCachedVerification(cache, profileId, now, ttlMs = WALLET_NETWORK_CACHE_TTL_MS) {
  const entry = cache[profileId];
  if (!entry || !isNetworkCacheFresh(entry.at, now, ttlMs)) return null;
  return {
    label: entry.verificationLabel ?? null,
    state: entry.verificationState ?? null,
  };
}

/**
 * RC-4: show checking chip until resolver confirms this profile this visit.
 * @param {string | null | undefined} profileId
 * @param {{ forceChecking?: boolean, fetchNetworkStatus?: boolean }} ctx
 * @param {(profileId: string) => boolean} isResolverConfirmedProfile
 */
export function shouldShowHubNetworkCheckingChip(
  profileId,
  ctx,
  isResolverConfirmedProfile
) {
  if (ctx.fetchNetworkStatus === false) return false;
  if (ctx.forceChecking === true) return true;
  const pid = typeof profileId === "string" ? profileId.trim() : "";
  if (!pid) return true;
  return !isResolverConfirmedProfile(pid);
}

/**
 * @param {string | null | undefined} profileId
 * @param {{ forceChecking?: boolean, fetchNetworkStatus?: boolean }} ctx
 * @param {(profileId: string) => boolean} isResolverConfirmedProfile
 * @param {(profileId: string) => string | null | undefined} getCachedStatus
 */
export function hubNetworkChipStatusForProfile(
  profileId,
  ctx,
  isResolverConfirmedProfile,
  getCachedStatus
) {
  if (
    shouldShowHubNetworkCheckingChip(profileId, ctx, isResolverConfirmedProfile)
  ) {
    return "checking";
  }
  const pid = typeof profileId === "string" ? profileId.trim() : "";
  return pid ? getCachedStatus(pid) ?? "checking" : "checking";
}
