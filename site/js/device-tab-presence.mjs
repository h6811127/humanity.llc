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
  PRESENCE_CHANGE_COALESCE_MS,
  PRESENCE_HEARTBEAT_MS,
  PRESENCE_SHOW_MS,
  removePresenceRowsForProfile,
  shouldSkipPresenceHeartbeat,
  shouldTouchPresenceRow,
} from "./device-tab-presence-core.mjs";

const PRESENCE_KEY = "hc_tab_keys_presence";
const FOCUS_CHANNEL = "hc-tab-focus";
const CUSTODY_CHANNEL = "hc-tab-keys-custody";
const DROP_PRESENCE_MSG = "drop-profile-presence";

let heartbeatTimer = null;
let focusChannel = null;
let custodyChannel = null;
/** @type {ReturnType<typeof setTimeout> | null} */
let presenceNotifyCoalesceTimer = null;

function emitTabPresenceChanged() {
  if (presenceNotifyCoalesceTimer != null) return;
  presenceNotifyCoalesceTimer = window.setTimeout(() => {
    presenceNotifyCoalesceTimer = null;
    window.dispatchEvent(new Event("hc-tab-presence-changed"));
  }, PRESENCE_CHANGE_COALESCE_MS);
}

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

  const now = Date.now();
  if (session?.profile_id && session?.owner_private_key_b58) {
    const row =
      normalizePresenceEntry({
        profile_id: session.profile_id,
        qr_id: session.qr_id ?? null,
        handle: session.handle ?? null,
        label: session.wallet_label ?? null,
        updatedAt: now,
      }) ?? null;
    if (row) {
      const existing = map[tabId];
      if (shouldTouchPresenceRow(existing, row, now)) {
        map[tabId] = row;
      }
    } else {
      delete map[tabId];
    }
  } else {
    delete map[tabId];
  }

  map = capPresenceMap(map);
  const changed = writePresenceIfChanged(map);
  if (changed) {
    emitTabPresenceChanged();
  }
}

export function clearTabKeysPresence() {
  const tabId = getTabId();
  const map = readPrunedPresence();
  if (!(tabId in map)) return;
  delete map[tabId];
  if (writePresenceIfChanged(map)) {
    emitTabPresenceChanged();
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
    emitTabPresenceChanged();
  }
}

/**
 * Other open tabs currently heartbeating keys for a profile (presence map only).
 * @param {string} profileId
 */
export function getOtherTabsHoldingProfile(profileId) {
  const pid = typeof profileId === "string" ? profileId.trim() : "";
  if (!pid) return [];
  const tabId = getTabId();
  const map = readPrunedPresence();
  const now = Date.now();
  /** @type {ReturnType<typeof getOtherTabsWithKeys>} */
  const rows = [];
  for (const [id, entry] of Object.entries(map)) {
    if (id === tabId) continue;
    const normalized = normalizePresenceEntry(entry, now);
    if (!normalized || normalized.profile_id !== pid) continue;
    if (now - normalized.updatedAt > PRESENCE_SHOW_MS) continue;
    rows.push({ tabId: id, ...normalized });
  }
  return rows;
}

/** Presence-only: drop shared rows after save; keys in session stay. */
export function broadcastDropPresenceForProfile(profileId) {
  const pid = typeof profileId === "string" ? profileId.trim() : "";
  if (!pid) return false;
  try {
    const ch = new BroadcastChannel(CUSTODY_CHANNEL);
    ch.postMessage({ type: DROP_PRESENCE_MSG, profile_id: pid });
    ch.close();
    return true;
  } catch {
    return false;
  }
}

/**
 * After save to wallet: purge stale presence rows and ping other tabs (Phase 3).
 * @param {string} profileId
 */
export function notifyProfileSavedOnDevice(profileId) {
  const pid = typeof profileId === "string" ? profileId.trim() : "";
  if (!pid) return;
  purgePresenceForProfile(pid);
  broadcastDropPresenceForProfile(pid);
  syncTabKeysPresence();
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
      if (data?.type === DROP_PRESENCE_MSG && data.profile_id) {
        purgePresenceForProfile(data.profile_id);
        syncTabKeysPresence();
        return;
      }
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
    if (document.visibilityState !== "visible") return;
    const session = getTabSession();
    const hasKeys = Boolean(session?.profile_id && session?.owner_private_key_b58);
    if (
      shouldSkipPresenceHeartbeat(readPrunedPresence(), getTabId(), hasKeys)
    ) {
      return;
    }
    syncTabKeysPresence();
  }, PRESENCE_HEARTBEAT_MS);
  window.addEventListener("pagehide", clearTabKeysPresence);
  window.addEventListener("pageshow", onPageShowPresence);
  window.addEventListener("hc-device-hub-changed", syncTabKeysPresence);
  window.addEventListener("storage", (e) => {
    if (e.key === PRESENCE_KEY) {
      emitTabPresenceChanged();
    }
  });
  window.addEventListener("hc-wallet-removed-profiles-changed", () => {
    emitTabPresenceChanged();
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("hc-profile-saved-on-device", (ev) => {
    const pid = ev.detail?.profile_id;
    if (typeof pid === "string" && pid) {
      notifyProfileSavedOnDevice(pid);
    }
  });
}
