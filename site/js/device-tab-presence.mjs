/**
 * Cross-tab heartbeat: which browser tabs currently hold signing keys (sessionStorage).
 * Stores only public metadata in localStorage  -  never private keys.
 */
import { getTabSession } from "./device-keys.mjs";

const PRESENCE_KEY = "hc_tab_keys_presence";
const FOCUS_CHANNEL = "hc-tab-focus";
const STALE_MS = 15000;
const HEARTBEAT_MS = 5000;

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
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writePresence(map) {
  localStorage.setItem(PRESENCE_KEY, JSON.stringify(map));
}

function pruneStale(map) {
  const now = Date.now();
  for (const [id, entry] of Object.entries(map)) {
    if (!entry?.updatedAt || now - entry.updatedAt > STALE_MS) {
      delete map[id];
    }
  }
}

export function syncTabKeysPresence() {
  const tabId = getTabId();
  const map = readPresence();
  pruneStale(map);
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
  const map = readPresence();
  delete map[tabId];
  writePresence(map);
  window.dispatchEvent(new Event("hc-tab-presence-changed"));
}

/**
 * @returns {Array<{
 *   profile_id: string,
 *   qr_id: string | null,
 *   handle: string | null,
 *   label: string | null,
 *   updatedAt: number,
 * }>}
 */
export function getOtherTabsWithKeys() {
  const tabId = getTabId();
  const map = readPresence();
  pruneStale(map);
  const others = [];
  for (const [id, entry] of Object.entries(map)) {
    if (id === tabId || !entry?.profile_id) continue;
    others.push(entry);
  }
  others.sort((a, b) => b.updatedAt - a.updatedAt);
  return others;
}

export function startTabKeysPresence() {
  if (heartbeatTimer != null) return;
  bindFocusChannel();
  syncTabKeysPresence();
  heartbeatTimer = window.setInterval(syncTabKeysPresence, HEARTBEAT_MS);
  window.addEventListener("pagehide", clearTabKeysPresence);
  window.addEventListener("hc-device-hub-changed", syncTabKeysPresence);
  window.addEventListener("storage", (e) => {
    if (e.key === PRESENCE_KEY) {
      window.dispatchEvent(new Event("hc-tab-presence-changed"));
    }
  });
}
