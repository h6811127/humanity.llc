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
  isResolverSyncTabsEnabled,
  mergeNetworkSnapshotIntoCache,
  networkSnapshotOriginMatches,
  parseNetworkSnapshotMessage,
  RESOLVER_SYNC_PREF_KEY,
  RESOLVER_SYNC_SNAPSHOT_TTL_MS,
  shouldFollowerSkipNetworkFetch,
} from "./device-resolver-sync-core.mjs";
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
 * Bind BroadcastChannel listener once per page.
 */
export function initResolverTabSync() {
  const ch = ensureChannel();
  if (!ch || listenerBound) return;
  listenerBound = true;
  ch.addEventListener("message", (event) => {
    const message = parseNetworkSnapshotMessage(event?.data);
    if (!message) return;
    if (message.tabId === getLiveControlPollTabId()) return;
    applySnapshotMessage(message);
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
