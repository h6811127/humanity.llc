/**
 * Cross-tab resolver network snapshot sync (Phase 1a).
 * @see docs/DEVICE_TAB_RESOLVER_SYNC.md
 */
import { resolverApiOrigin } from "./hc-sign.mjs";
import {
  getLiveControlPollTabId,
  isLiveControlPollLeaderTab,
  touchLiveControlPollLeader,
} from "./device-live-control-poll-leader.mjs";
import {
  HEALTH_SNAPSHOT_TTL_MS,
  isResolverSyncTabsEnabled,
  mergeNetworkSnapshotIntoCache,
  networkSnapshotOriginMatches,
  parseHealthSnapshotMessage,
  parseNetworkSnapshotMessage,
  RESOLVER_SYNC_PREF_KEY,
  RESOLVER_SYNC_SNAPSHOT_TTL_MS,
  shouldFollowerSkipHealthFetch,
  shouldFollowerSkipNetworkFetch,
  shouldIgnoreHealthSnapshotMessage,
} from "./device-resolver-sync-core.mjs";

export const RESOLVER_HEALTH_PEER_SYNC = "hc-resolver-health-peer-sync";
import { alertStateForNetworkPoll } from "./wallet-network-baseline.mjs";
import {
  applyResolverNetworkSnapshot,
  loadWalletNetworkCacheForSync,
  saveWalletNetworkCacheForSync,
} from "./device-wallet-network.mjs";
import { verificationRecordFromLabelState } from "./device-wallet-network-core.mjs";

const CHANNEL_NAME = "hc-resolver-sync";

/** @typedef {{
 *   profile_id: string;
 *   status: string;
 *   scanKind: string | null;
 *   verification?: { label?: string; state?: string } | null;
 *   cachedAt: number;
 *   resolverConfirmed: boolean;
 *   alertState?: string | null;
 * }} NetworkSnapshotRow */

/** @typedef {{
 *   type: "network-snapshot";
 *   tabId: string;
 *   at: number;
 *   origin: string;
 *   entries: NetworkSnapshotRow[];
 * }} NetworkSnapshotMessage */

/** @type {BroadcastChannel | null} */
let channel = null;
let listenerBound = false;
/** @type {number | null} */
let lastAppliedSnapshotAt = null;
/** @type {number | null} */
let lastReceivedSnapshotAt = null;
/** @type {number | null} */
let lastReceivedHealthAt = null;
/** @type {number | null} */
let lastAppliedHealthAt = null;

function ensureChannel() {
  if (channel || typeof BroadcastChannel === "undefined") return channel;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
  } catch {
    channel = null;
  }
  return channel;
}

export function readResolverSyncTabsPref() {
  if (typeof localStorage === "undefined") return true;
  try {
    return isResolverSyncTabsEnabled(localStorage.getItem(RESOLVER_SYNC_PREF_KEY));
  } catch {
    return true;
  }
}

/** @param {boolean} on */
export function setResolverSyncTabsEnabled(on) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(RESOLVER_SYNC_PREF_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function applySnapshotMessage(message) {
  if (!readResolverSyncTabsPref()) return;
  if (!networkSnapshotOriginMatches(message.origin, resolverApiOrigin())) return;
  if (lastAppliedSnapshotAt === message.at) return;
  lastAppliedSnapshotAt = message.at;
  lastReceivedSnapshotAt = message.at;

  const cache = loadWalletNetworkCacheForSync();
  const merged = mergeNetworkSnapshotIntoCache(cache, message.entries, message.at);
  saveWalletNetworkCacheForSync(merged);
  applyResolverNetworkSnapshot(message.entries, message.at);
  void import("./device-chrome-refresh.mjs")
    .then((m) => m.refreshDeviceChrome({ immediate: true }))
    .catch(() => {});
}

/**
 * @param {import("./device-resolver-sync-core.mjs").HealthSnapshotMessage} message
 */
function applyHealthSnapshotMessage(message) {
  if (!readResolverSyncTabsPref()) return;
  if (message.tabId === getLiveControlPollTabId()) return;
  if (shouldIgnoreHealthSnapshotMessage(message.at, lastAppliedHealthAt ?? 0)) return;
  lastAppliedHealthAt = message.at;
  lastReceivedHealthAt = message.at;
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
  window.dispatchEvent(
    new CustomEvent(RESOLVER_HEALTH_PEER_SYNC, {
      detail: { networkStatus: message.status },
    })
  );
}

/**
 * Bind BroadcastChannel listener once per page.
 */
export function initResolverTabSync() {
  const ch = ensureChannel();
  if (!ch || listenerBound) return;
  listenerBound = true;
  ch.addEventListener("message", (event) => {
    const data = event?.data;
    const network = parseNetworkSnapshotMessage(data);
    if (network) {
      if (network.tabId === getLiveControlPollTabId()) return;
      applySnapshotMessage(network);
      return;
    }
    const health = parseHealthSnapshotMessage(data);
    if (health) applyHealthSnapshotMessage(health);
  });
}

/**
 * Follower auto hub visibility refresh may skip GETs when a fresh leader snapshot exists.
 */
export function shouldFollowerSkipAutoNetworkFetch(now = Date.now()) {
  return shouldFollowerSkipNetworkFetch({
    syncEnabled: readResolverSyncTabsPref(),
    isLeader: isLiveControlPollLeaderTab(now),
    snapshotAt: lastReceivedSnapshotAt,
    now,
    ttlMs: RESOLVER_SYNC_SNAPSHOT_TTL_MS,
  });
}

/**
 * Follower visibility health refresh may skip GET when a fresh leader snapshot exists.
 */
export function shouldFollowerSkipAutoHealthFetch(now = Date.now()) {
  return shouldFollowerSkipHealthFetch({
    syncEnabled: readResolverSyncTabsPref(),
    isLeader: isLiveControlPollLeaderTab(now),
    snapshotAt: lastReceivedHealthAt,
    now,
    ttlMs: HEALTH_SNAPSHOT_TTL_MS,
  });
}

/**
 * @param {"ok" | "degraded" | "offline"} status
 * @param {{ manual?: boolean }} [opts]
 */
export function broadcastHealthSnapshotIfEligible(status, opts = {}) {
  if (!readResolverSyncTabsPref()) return;
  if (status !== "ok" && status !== "degraded" && status !== "offline") return;
  const manual = opts.manual === true;
  const now = Date.now();
  if (!manual && !isLiveControlPollLeaderTab(now)) return;
  if (!manual) touchLiveControlPollLeader(now);

  const tabId = getLiveControlPollTabId();
  if (!tabId) return;
  lastReceivedHealthAt = now;
  lastAppliedHealthAt = now;

  const ch = ensureChannel();
  if (!ch) return;
  try {
    ch.postMessage({ type: "health-snapshot", tabId, at: now, status });
  } catch {
    /* ignore */
  }
}

/**
 * @param {{
 *   manual?: boolean,
 *   entries: Array<{ profile_id: string }>,
 *   statusMap: Record<string, string>,
 *   scanKindMap: Record<string, string | null>,
 *   resolverConfirmedMap: Record<string, boolean>,
 *   alertStateMap?: Record<string, string>,
 *   networkFetchedProfileIds?: Iterable<string>,
 * }} detail
 */
export function broadcastNetworkSnapshotIfEligible(detail) {
  if (!readResolverSyncTabsPref()) return;
  const manual = detail.manual === true;
  const now = Date.now();
  if (!manual && !isLiveControlPollLeaderTab(now)) return;
  if (!manual) touchLiveControlPollLeader(now);

  const cache = loadWalletNetworkCacheForSync();
  const alertStateMap = detail.alertStateMap ?? {};
  /** @type {NetworkSnapshotRow[]} */
  const rows = detail.entries.map((entry) => {
    const pid = entry.profile_id;
    const cached = cache[pid];
    const status = detail.statusMap[pid] ?? cached?.status ?? "checking";
    const scanKind = detail.scanKindMap[pid] ?? cached?.scanKind ?? null;
    const resolverConfirmed = detail.resolverConfirmedMap[pid] === true;
    const alertState =
      alertStateMap[pid] ??
      (resolverConfirmed ? alertStateForNetworkPoll(scanKind, status) : null);
    return {
      profile_id: pid,
      status,
      scanKind,
      verification: cached
        ? verificationRecordFromLabelState(
            cached.verificationLabel,
            cached.verificationState
          )
        : null,
      cachedAt: typeof cached?.at === "number" ? cached.at : now,
      resolverConfirmed,
      alertState,
    };
  });
  if (rows.length === 0) return;

  const tabId = getLiveControlPollTabId();
  const origin = resolverApiOrigin();
  /** @type {NetworkSnapshotMessage} */
  const message = {
    type: "network-snapshot",
    tabId,
    at: now,
    origin,
    entries: rows,
  };
  lastReceivedSnapshotAt = now;
  lastAppliedSnapshotAt = now;

  const ch = ensureChannel();
  if (!ch) return;
  try {
    ch.postMessage(message);
  } catch {
    /* ignore */
  }
}
