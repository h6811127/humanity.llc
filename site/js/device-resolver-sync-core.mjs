/**
 * Pure helpers for cross-tab resolver network snapshot sync (Phase 1a).
 * @see docs/DEVICE_TAB_RESOLVER_SYNC.md
 */

import { pruneWalletNetworkCache } from "./device-wallet-network-core.mjs?v=88";

export const RESOLVER_SYNC_PREF_KEY = "hc_resolver_sync_tabs";

/** Unified cross-tab channel (network, health, live-control). */
export const RESOLVER_SYNC_CHANNEL = "hc-resolver-sync";

/** Follower may skip auto status GETs while leader snapshot is this fresh. */
export const RESOLVER_SYNC_SNAPSHOT_TTL_MS = 60_000;

/** Follower may skip auto health GETs while leader health snapshot is this fresh. */
export const HEALTH_SNAPSHOT_TTL_MS = 30_000;

/**
 * @param {string | null | undefined} raw localStorage `hc_resolver_sync_tabs`
 */
export function isResolverSyncTabsEnabled(raw) {
  return raw !== "0";
}

/**
 * @typedef {{
 *   profile_id: string;
 *   status: string;
 *   scanKind: string | null;
 *   qrScope?: string | null;
 *   verification?: { label?: string; state?: string } | null;
 *   cachedAt: number;
 *   resolverConfirmed: boolean;
 *   alertState?: string | null;
 * }} NetworkSnapshotRow
 */

/**
 * @typedef {{
 *   type: "network-snapshot";
 *   tabId: string;
 *   at: number;
 *   origin: string;
 *   entries: NetworkSnapshotRow[];
 * }} NetworkSnapshotMessage
 */

/**
 * @param {unknown} data BroadcastChannel payload
 * @returns {NetworkSnapshotMessage | null}
 */
export function parseNetworkSnapshotMessage(data) {
  if (!data || typeof data !== "object") return null;
  const msg = /** @type {Record<string, unknown>} */ (data);
  if (msg.type !== "network-snapshot") return null;
  const tabId = typeof msg.tabId === "string" ? msg.tabId : "";
  const at = typeof msg.at === "number" && Number.isFinite(msg.at) ? msg.at : 0;
  const origin = typeof msg.origin === "string" ? msg.origin : "";
  if (!tabId || !at || !origin) return null;
  const entries = Array.isArray(msg.entries) ? msg.entries : [];
  /** @type {NetworkSnapshotRow[]} */
  const rows = [];
  for (const rawRow of entries) {
    if (!rawRow || typeof rawRow !== "object") continue;
    const row = /** @type {Record<string, unknown>} */ (rawRow);
    const profile_id = typeof row.profile_id === "string" ? row.profile_id : "";
    if (!profile_id) continue;
    const status = typeof row.status === "string" ? row.status : "checking";
    const scanKind =
      row.scanKind === null || typeof row.scanKind === "string" ? row.scanKind : null;
    const qrScope =
      row.qrScope === null || typeof row.qrScope === "string" ? row.qrScope : null;
    const cachedAt =
      typeof row.cachedAt === "number" && Number.isFinite(row.cachedAt) ? row.cachedAt : at;
    const resolverConfirmed = row.resolverConfirmed === true;
    const alertState =
      row.alertState === null || typeof row.alertState === "string" ? row.alertState : null;
    let verification = null;
    if (row.verification && typeof row.verification === "object") {
      const v = /** @type {Record<string, unknown>} */ (row.verification);
      verification = {
        label: typeof v.label === "string" ? v.label : undefined,
        state: typeof v.state === "string" ? v.state : undefined,
      };
    }
    rows.push({
      profile_id,
      status,
      scanKind,
      qrScope,
      verification,
      cachedAt,
      resolverConfirmed,
      alertState,
    });
  }
  if (rows.length === 0) return null;
  return { type: "network-snapshot", tabId, at, origin, entries: rows };
}

/**
 * @param {{
 *   syncEnabled: boolean,
 *   isLeader: boolean,
 *   snapshotAt: number | null | undefined,
 *   now?: number,
 *   ttlMs?: number,
 * }} opts
 */
export function shouldFollowerSkipNetworkFetch(opts) {
  const {
    syncEnabled,
    isLeader,
    snapshotAt,
    now = Date.now(),
    ttlMs = RESOLVER_SYNC_SNAPSHOT_TTL_MS,
  } = opts;
  if (!syncEnabled || isLeader) return false;
  if (typeof snapshotAt !== "number" || !Number.isFinite(snapshotAt)) return false;
  return now - snapshotAt <= ttlMs;
}

/**
 * @param {Record<string, { status?: string, scanKind?: string | null, qrScope?: string | null, verificationLabel?: string | null, verificationState?: string | null, at?: number }>} cache
 * @param {NetworkSnapshotRow[]} snapshotEntries
 * @param {number} [fallbackAt]
 */
export function mergeNetworkSnapshotIntoCache(cache, snapshotEntries, fallbackAt = Date.now()) {
  const next = { ...cache };
  /** @type {string[]} */
  const protectProfileIds = [];
  for (const row of snapshotEntries) {
    if (!row?.profile_id) continue;
    protectProfileIds.push(row.profile_id);
    next[row.profile_id] = {
      status: row.status,
      scanKind: row.scanKind ?? null,
      qrScope: row.qrScope ?? null,
      verificationLabel: row.verification?.label ?? null,
      verificationState: row.verification?.state ?? null,
      at: row.cachedAt ?? fallbackAt,
    };
  }
  return pruneWalletNetworkCache(next, { protectProfileIds, now: fallbackAt });
}

/**
 * @param {string} messageOrigin
 * @param {string} localOrigin
 */
export function networkSnapshotOriginMatches(messageOrigin, localOrigin) {
  return Boolean(messageOrigin && localOrigin && messageOrigin === localOrigin);
}

/**
 * @typedef {{
 *   type: "health-snapshot";
 *   tabId: string;
 *   at: number;
 *   status: "ok" | "degraded" | "offline";
 * }} HealthSnapshotMessage
 */

/**
 * @param {unknown} data
 * @returns {HealthSnapshotMessage | null}
 */
export function parseHealthSnapshotMessage(data) {
  if (!data || typeof data !== "object") return null;
  const msg = /** @type {Record<string, unknown>} */ (data);
  if (msg.type !== "health-snapshot") return null;
  const tabId = typeof msg.tabId === "string" ? msg.tabId : "";
  const at = typeof msg.at === "number" && Number.isFinite(msg.at) ? msg.at : 0;
  const status = msg.status;
  if (!tabId || !at) return null;
  if (status !== "ok" && status !== "degraded" && status !== "offline") return null;
  return { type: "health-snapshot", tabId, at, status };
}

/**
 * @param {number} messageAt
 * @param {number} lastAppliedAt
 */
export function shouldIgnoreHealthSnapshotMessage(messageAt, lastAppliedAt) {
  if (!messageAt || !lastAppliedAt) return false;
  return messageAt <= lastAppliedAt;
}

/**
 * @param {{
 *   syncEnabled: boolean,
 *   isLeader: boolean,
 *   snapshotAt: number | null | undefined,
 *   now?: number,
 *   ttlMs?: number,
 * }} opts
 */
export function shouldFollowerSkipHealthFetch(opts) {
  const {
    syncEnabled,
    isLeader,
    snapshotAt,
    now = Date.now(),
    ttlMs = HEALTH_SNAPSHOT_TTL_MS,
  } = opts;
  if (!syncEnabled || isLeader) return false;
  if (typeof snapshotAt !== "number" || !Number.isFinite(snapshotAt)) return false;
  return now - snapshotAt <= ttlMs;
}

/**
 * @typedef {{
 *   type: "live-control-snapshot";
 *   tabId: string;
 *   at: number;
 *   pending: unknown[];
 *   health: "ok" | "degraded" | "offline";
 * }} LiveControlSnapshotMessage
 */

/**
 * @param {unknown} data
 * @returns {LiveControlSnapshotMessage | null}
 */
export function parseLiveControlSnapshotMessage(data) {
  if (!data || typeof data !== "object") return null;
  const msg = /** @type {Record<string, unknown>} */ (data);
  const type = msg.type;
  if (type !== "live-control-snapshot" && type !== "snapshot") return null;
  const tabId = typeof msg.tabId === "string" ? msg.tabId : "";
  const at = typeof msg.at === "number" && Number.isFinite(msg.at) ? msg.at : 0;
  if (!tabId || !at) return null;
  const health = msg.health;
  const normalizedHealth =
    health === "degraded" || health === "offline" ? health : "ok";
  const pending = Array.isArray(msg.pending) ? msg.pending : [];
  return {
    type: "live-control-snapshot",
    tabId,
    at,
    pending,
    health: normalizedHealth,
  };
}
