/**
 * Browser storage for profiles removed from this device (cross-tab denylist).
 */
import {
  addRemovedProfileId,
  normalizeRemovedProfileIds,
  reconcileRemovedProfileIds,
  REMOVED_PROFILES_STORAGE_KEY,
} from "./device-wallet-removed-profiles-core.mjs";
import { clearDefaultVouchIfProfile } from "./vouch-ready-keys.mjs";

/**
 * @returns {Set<string>}
 */
export function loadRemovedProfileIds() {
  try {
    const raw = localStorage.getItem(REMOVED_PROFILES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(normalizeRemovedProfileIds(parsed));
  } catch {
    return new Set();
  }
}

function writeRemovedProfileIds(ids) {
  try {
    localStorage.setItem(REMOVED_PROFILES_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

/** @param {string} profileId */
export function markProfileRemovedFromDevice(profileId) {
  const pid = typeof profileId === "string" ? profileId.trim() : "";
  if (!pid) return;
  writeRemovedProfileIds(addRemovedProfileId([...loadRemovedProfileIds()], pid));
  clearDefaultVouchIfProfile(pid);
  window.dispatchEvent(new Event("hc-wallet-removed-profiles-changed"));
}

/**
 * After wallet save, stop suppressing profiles that are saved again.
 * @param {Array<{ profile_id?: string }>} walletEntries
 */
export function reconcileRemovedProfilesAfterWalletSave(walletEntries) {
  const saved = walletEntries.map((e) => e.profile_id).filter(Boolean);
  const next = reconcileRemovedProfileIds([...loadRemovedProfileIds()], saved);
  const prev = [...loadRemovedProfileIds()];
  if (next.length === prev.length && next.every((id, i) => id === prev[i])) return;
  writeRemovedProfileIds(next);
  window.dispatchEvent(new Event("hc-wallet-removed-profiles-changed"));
}
