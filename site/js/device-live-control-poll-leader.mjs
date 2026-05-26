/**
 * Browser leader tab + BroadcastChannel snapshots for live-control inbox (Phase 7).
 */
import {
  LIVE_CONTROL_POLL_LEADER_STORAGE_KEY,
  parseLiveControlPollLeader,
  serializeLiveControlPollLeader,
  shouldTabActAsLiveControlPollLeader,
} from "./device-live-control-poll-leader-core.mjs";

const CHANNEL_NAME = "hc-live-control-poll-leader";
const TAB_ID_SESSION_KEY = "hc_live_control_poll_tab_id";

/** @type {BroadcastChannel | null} */
let channel = null;
let listenerBound = false;

/** @type {((payload: import("./device-live-control-inbox.mjs").LiveControlLeaderSnapshot) => void) | null} */
let onSnapshot = null;

function ensureChannel() {
  if (channel || typeof BroadcastChannel === "undefined") return channel;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
  } catch {
    channel = null;
  }
  return channel;
}

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
  const ch = ensureChannel();
  if (!ch) return;
  try {
    ch.postMessage({ type: "snapshot", ...snapshot });
  } catch {
    /* ignore */
  }
}

/**
 * @param {(payload: import("./device-live-control-inbox.mjs").LiveControlLeaderSnapshot) => void} handler
 */
export function bindLiveControlPollLeaderSnapshot(handler) {
  onSnapshot = handler;
  const ch = ensureChannel();
  if (!ch || listenerBound) return;
  listenerBound = true;
  ch.addEventListener("message", (event) => {
    const data = event?.data;
    if (!data || data.type !== "snapshot") return;
    onSnapshot?.({
      pending: Array.isArray(data.pending) ? data.pending : [],
      health: data.health === "degraded" || data.health === "offline" ? data.health : "ok",
      at: typeof data.at === "number" ? data.at : Date.now(),
      tabId: typeof data.tabId === "string" ? data.tabId : "",
    });
  });

  if (typeof window !== "undefined" && !window.__hcLiveControlLeaderPagehide) {
    window.__hcLiveControlLeaderPagehide = true;
    window.addEventListener("pagehide", () => {
      releaseLiveControlPollLeader();
    });
  }
}
