/**
 * Cross-tab heartbeat: which browser tabs currently hold signing keys (sessionStorage).
 * Stores only public metadata in localStorage  -  never private keys.
 */
import { tabNoticeCount } from "./device-counts.mjs";
import {
  shouldShowCrossTabKeysNotice,
  shouldShowOrphanRemovedKeysNotice,
} from "./device-cross-tab-visibility.mjs";
import { clearTabSessionKeys, getTabSession } from "./device-keys.mjs";
import { loadRemovedProfileIds } from "./device-wallet-removed-profiles.mjs";
import { loadWallet } from "./device-wallet.mjs";
import {
  capPresenceMap,
  listOtherTabsWithKeys,
  normalizePresenceEntry,
  normalizePresenceMap,
  PRESENCE_HEARTBEAT_MS,
  removePresenceRowsForProfile,
} from "./device-tab-presence-core.mjs";

const PRESENCE_KEY = "hc_tab_keys_presence";
const FOCUS_CHANNEL = "hc-tab-focus";
const CUSTODY_CHANNEL = "hc-tab-keys-custody";

let heartbeatTimer = null;
let focusChannel = null;
let custodyChannel = null;

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

function writePresenceIfChanged(map) {
  const next = JSON.stringify(map);
  if (localStorage.getItem(PRESENCE_KEY) === next) return false;
  localStorage.setItem(PRESENCE_KEY, next);
  return true;
}

function readPrunedPresence() {
  const raw = readPresence();
  const normalized = normalizePresenceMap(raw);
  if (JSON.stringify(normalized) !== JSON.stringify(raw)) {
    writePresenceIfChanged(normalized);
  }
  return normalized;
}

export function syncTabKeysPresence() {
  const tabId = getTabId();
  let map = readPrunedPresence();
  const session = getTabSession();

  if (session?.profile_id && session?.owner_private_key_b58) {
    const row =
      normalizePresenceEntry({
        profile_id: session.profile_id,
        qr_id: session.qr_id ?? null,
        handle: session.handle ?? null,
        label: session.wallet_label ?? null,
        updatedAt: Date.now(),
      }) ?? null;
    if (row) {
      map[tabId] = row;
    } else {
      delete map[tabId];
    }
  } else {
    delete map[tabId];
  }

  map = capPresenceMap(map);
  const changed = writePresenceIfChanged(map);
  if (changed) {
    window.dispatchEvent(new Event("hc-tab-presence-changed"));
  }
}

export function clearTabKeysPresence() {
  const tabId = getTabId();
  const map = readPrunedPresence();
  if (!(tabId in map)) return;
  delete map[tabId];
  if (writePresenceIfChanged(map)) {
    window.dispatchEvent(new Event("hc-tab-presence-changed"));
  }
}

function savedProfileIdsOnDevice() {
  return new Set(loadWallet().map((e) => e.profile_id).filter(Boolean));
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
/**
 * @param {{ includeSavedProfiles?: boolean }} [opts]
 * When `includeSavedProfiles` is true, other tabs are listed even if that card is
 * saved on this device (scan vouch surfaces need “keys in another tab” + Use keys here).
 */
export function getOtherTabsWithKeys(opts = {}) {
  const tabId = getTabId();
  const map = readPrunedPresence();
  const session = getTabSession();
  const thisProfile = session?.profile_id ?? null;
  const savedProfileIds = opts.includeSavedProfiles
    ? []
    : savedProfileIdsOnDevice();
  return listOtherTabsWithKeys({
    map,
    tabId,
    thisProfile,
    savedProfileIds,
    removedProfileIds: loadRemovedProfileIds(),
  }).others;
}

/**
 * Other tabs still heartbeating keys for a profile removed from this device.
 * @returns {ReturnType<typeof getOtherTabsWithKeys>}
 */
export function getOrphanRemovedTabsWithKeys() {
  const removed = loadRemovedProfileIds();
  if (removed.size === 0) return [];
  const tabId = getTabId();
  const map = readPrunedPresence();
  const session = getTabSession();
  return listOtherTabsWithKeys({
    map,
    tabId,
    thisProfile: session?.profile_id ?? null,
    savedProfileIds: [],
    removedProfileIds: removed,
    orphanRemovedOnly: true,
  }).others;
}

/**
 * Drop presence rows for a profile (e.g. after remove from device).
 * @param {string} profileId
 */
export function purgePresenceForProfile(profileId) {
  const map = readPrunedPresence();
  const { map: next, changed } = removePresenceRowsForProfile({ ...map }, profileId);
  if (!changed) return;
  if (writePresenceIfChanged(next)) {
    window.dispatchEvent(new Event("hc-tab-presence-changed"));
  }
}

export function crossTabNoticeCount() {
  const others = getOtherTabsWithKeys();
  return shouldShowCrossTabKeysNotice(others.length, tabNoticeCount()) ? others.length : 0;
}

/** Ask other tabs to drop session keys for a profile (remove-from-device cleanup). */
export function broadcastClearProfileKeys(profileId) {
  const pid = typeof profileId === "string" ? profileId.trim() : "";
  if (!pid) return false;
  try {
    const ch = new BroadcastChannel(CUSTODY_CHANNEL);
    ch.postMessage({ type: "clear-profile-keys", profile_id: pid });
    ch.close();
    return true;
  } catch {
    return false;
  }
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

function bindCustodyChannel() {
  if (custodyChannel) return;
  try {
    custodyChannel = new BroadcastChannel(CUSTODY_CHANNEL);
    custodyChannel.onmessage = (ev) => {
      const data = ev.data;
      if (data?.type !== "clear-profile-keys" || !data.profile_id) return;
      const session = getTabSession();
      if (session?.profile_id !== data.profile_id) return;
      clearTabSessionKeys();
      clearTabKeysPresence();
    };
  } catch {
    custodyChannel = null;
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
  bindCustodyChannel();
  syncTabKeysPresence();
  heartbeatTimer = window.setInterval(() => {
    if (document.visibilityState === "visible") {
      syncTabKeysPresence();
    }
  }, PRESENCE_HEARTBEAT_MS);
  window.addEventListener("pagehide", clearTabKeysPresence);
  window.addEventListener("pageshow", onPageShowPresence);
  window.addEventListener("hc-device-hub-changed", syncTabKeysPresence);
  window.addEventListener("storage", (e) => {
    if (e.key === PRESENCE_KEY) {
      window.dispatchEvent(new Event("hc-tab-presence-changed"));
    }
  });
  window.addEventListener("hc-wallet-removed-profiles-changed", () => {
    window.dispatchEvent(new Event("hc-tab-presence-changed"));
  });
}
