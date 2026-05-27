/**
 * Browser leader tab election for live-control auto polling (Phase 7).
 * Cross-tab snapshots use unified `hc-resolver-sync` (Phase 3).
 * @see docs/DEVICE_TAB_RESOLVER_SYNC.md
 */
import {
  LIVE_CONTROL_POLL_LEADER_STORAGE_KEY,
  parseLiveControlPollLeader,
  serializeLiveControlPollLeader,
  shouldTabActAsLiveControlPollLeader,
} from "./device-live-control-poll-leader-core.mjs";

const TAB_ID_SESSION_KEY = "hc_live_control_poll_tab_id";

let pagehideBound = false;

function randomTabId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getLiveControlPollTabId() {
  if (typeof sessionStorage === "undefined") return "";
  try {
    let id = sessionStorage.getItem(TAB_ID_SESSION_KEY);
    if (!id) {
      id = randomTabId();
      sessionStorage.setItem(TAB_ID_SESSION_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

function readLeaderRecord() {
  if (typeof localStorage === "undefined") return null;
  try {
    return parseLiveControlPollLeader(
      localStorage.getItem(LIVE_CONTROL_POLL_LEADER_STORAGE_KEY)
    );
  } catch {
    return null;
  }
}

export function isLiveControlPollLeaderTab(now = Date.now()) {
  const tabId = getLiveControlPollTabId();
  return shouldTabActAsLiveControlPollLeader(readLeaderRecord(), tabId, now);
}

export function claimLiveControlPollLeader(now = Date.now()) {
  const tabId = getLiveControlPollTabId();
  if (!tabId || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      LIVE_CONTROL_POLL_LEADER_STORAGE_KEY,
      serializeLiveControlPollLeader({ tabId, at: now })
    );
  } catch {
    /* ignore */
  }
}

export function touchLiveControlPollLeader(now = Date.now()) {
  if (!isLiveControlPollLeaderTab(now)) return;
  claimLiveControlPollLeader(now);
}

export function releaseLiveControlPollLeader() {
  const tabId = getLiveControlPollTabId();
  const record = readLeaderRecord();
  if (!record || record.tabId !== tabId || typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(LIVE_CONTROL_POLL_LEADER_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * @param {import("./device-live-control-inbox.mjs").LiveControlLeaderSnapshot} snapshot
 */
export function broadcastLiveControlPollSnapshot(snapshot) {
  void import("./device-resolver-sync.mjs").then((m) => {
    m.broadcastLiveControlSyncSnapshot(snapshot);
  });
}

/**
 * @param {(payload: import("./device-live-control-inbox.mjs").LiveControlLeaderSnapshot) => void} handler
 */
export function bindLiveControlPollLeaderSnapshot(handler) {
  void import("./device-resolver-sync.mjs").then((m) => {
    m.registerLiveControlSnapshotHandler((message) => {
      handler({
        pending: message.pending,
        health: message.health,
        at: message.at,
        tabId: message.tabId,
      });
    });
    m.initResolverTabSync();
  });

  if (typeof window !== "undefined" && !pagehideBound) {
    pagehideBound = true;
    window.addEventListener("pagehide", () => {
      releaseLiveControlPollLeader();
    });
  }
}
