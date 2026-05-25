/**
 * Cross-tab heartbeat: which browser tabs currently hold signing keys (sessionStorage).
 * Stores only public metadata in localStorage  -  never private keys.
 */
import { tabNoticeCount } from "./device-counts.mjs";
import { shouldShowCrossTabKeysNotice } from "./device-cross-tab-visibility.mjs";
import { getTabSession } from "./device-keys.mjs";
import {
  listOtherTabsWithKeys,
  PRESENCE_HEARTBEAT_MS,
  PRESENCE_STALE_MS,
  pruneStalePresence,
} from "./device-tab-presence-core.mjs";

const PRESENCE_KEY = "hc_tab_keys_presence";
const FOCUS_CHANNEL = "hc-tab-focus";

let heartbeatTimer = null;
let focusChannel = null;

function getTabId() {
  let id = sessionStorage.getItem("hc_tab_id");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("hc_tab_id", id);
  }
  return id;
}

function readPresence() {
  try {
    const raw = localStorage.getItem(PRESENCE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writePresence(map) {
  localStorage.setItem(PRESENCE_KEY, JSON.stringify(map));
}

function readPrunedPresence() {
  const map = readPresence();
  const changed = pruneStalePresence(map, Date.now(), PRESENCE_STALE_MS);
  if (changed) writePresence(map);
  return map;
}

export function syncTabKeysPresence() {
  const tabId = getTabId();
  const map = readPrunedPresence();
  const session = getTabSession();

  if (session?.profile_id && session?.owner_private_key_b58) {
    map[tabId] = {
      profile_id: session.profile_id,
      qr_id: session.qr_id ?? null,
      handle: session.handle ?? null,
      label: session.wallet_label ?? null,
      updatedAt: Date.now(),
    };
  } else {
    delete map[tabId];
  }

  writePresence(map);
  window.dispatchEvent(new Event("hc-tab-presence-changed"));
}

export function clearTabKeysPresence() {
  const tabId = getTabId();
  const map = readPrunedPresence();
  delete map[tabId];
  writePresence(map);
  window.dispatchEvent(new Event("hc-tab-presence-changed"));
}

/**
 * @returns {Array<{
 *   tabId: string,
 *   profile_id: string,
 *   qr_id: string | null,
 *   handle: string | null,
 *   label: string | null,
 *   updatedAt: number,
 * }>}
 */
export function getOtherTabsWithKeys() {
  const tabId = getTabId();
  const map = readPrunedPresence();
  const session = getTabSession();
  const thisProfile = session?.profile_id ?? null;
  return listOtherTabsWithKeys({ map, tabId, thisProfile }).others;
}

export function crossTabNoticeCount() {
  const others = getOtherTabsWithKeys();
  return shouldShowCrossTabKeysNotice(others.length, tabNoticeCount()) ? others.length : 0;
}

/** Ask another tab (same origin) to bring itself to the front. */
export function requestFocusTab(targetTabId) {
  if (!targetTabId) return false;
  try {
    const ch = new BroadcastChannel(FOCUS_CHANNEL);
    ch.postMessage({ type: "focus", tabId: targetTabId });
    ch.close();
    return true;
  } catch {
    return false;
  }
}

function bindFocusChannel() {
  if (focusChannel) return;
  try {
    focusChannel = new BroadcastChannel(FOCUS_CHANNEL);
    focusChannel.onmessage = (ev) => {
      const data = ev.data;
      if (data?.type !== "focus" || data.tabId !== getTabId()) return;
      window.focus();
      if (!document.title.startsWith("● ")) {
        const prev = document.title;
        document.title = `● ${prev}`;
        window.setTimeout(() => {
          document.title = prev;
        }, 2000);
      }
    };
  } catch {
    focusChannel = null;
  }
}

function onVisibilityPresence() {
  if (document.visibilityState === "hidden") {
    clearTabKeysPresence();
  } else {
    syncTabKeysPresence();
  }
}

function onPageShowPresence(ev) {
  if (ev.persisted) {
    syncTabKeysPresence();
  }
}

export function startTabKeysPresence() {
  if (heartbeatTimer != null) return;
  bindFocusChannel();
  syncTabKeysPresence();
  heartbeatTimer = window.setInterval(() => {
    if (document.visibilityState === "visible") {
      syncTabKeysPresence();
    }
  }, PRESENCE_HEARTBEAT_MS);
  window.addEventListener("pagehide", clearTabKeysPresence);
  window.addEventListener("pageshow", onPageShowPresence);
  window.addEventListener("visibilitychange", onVisibilityPresence);
  window.addEventListener("hc-device-hub-changed", syncTabKeysPresence);
  window.addEventListener("storage", (e) => {
    if (e.key === PRESENCE_KEY) {
      window.dispatchEvent(new Event("hc-tab-presence-changed"));
    }
  });
}
