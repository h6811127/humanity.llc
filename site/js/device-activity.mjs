/**
 * Local activity log for the device hub (this browser only).
 */
import { loadWallet } from "./device-wallet.mjs";

const STORAGE_KEY = "hc_device_activity";
const MAX_ENTRIES = 40;

/** @typedef {'saved'|'use_keys'|'remove_card'|'pin_added'|'backup_import'|'live_control'} ActivityType */

/**
 * @param {ActivityType} type
 * @param {string} label
 * @param {{ profile_id?: string | null, qr_id?: string | null }} [meta]
 */
export function logDeviceActivity(type, label, meta = {}) {
  const text = String(label || "").trim();
  if (!text) return;

  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    label: text,
    at: new Date().toISOString(),
    profile_id: meta.profile_id ?? null,
    qr_id: meta.qr_id ?? null,
  };

  const entries = loadActivity();
  entries.unshift(entry);
  if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    return;
  }
  window.dispatchEvent(new Event("hc-device-activity-changed"));
}

export function loadActivity() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** @param {{ type: string, label: string, at: string, profile_id?: string | null }} entry */
export function activityHaystack(entry) {
  return [entry.label, entry.type, entry.profile_id, "activity recent device now"]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** @param {{ type: string, label: string, profile_id?: string | null, qr_id?: string | null }} entry */
export function walletEntryForActivity(entry) {
  if (entry.profile_id) {
    const match = loadWallet().find((w) => w.profile_id === entry.profile_id);
    if (match) return match;
  }
  const label = entry.label;
  return (
    loadWallet().find(
      (w) => w.label === label || (w.handle && `@${w.handle}` === label)
    ) ?? null
  );
}

/** @param {{ type: string }} entry */
export function activityActionHint(entry) {
  if (entry.type === "pin_added") return "Pinned scan";
  if (walletEntryForActivity(entry) || entry.profile_id) return "Open Now";
  return "";
}

/**
 * @param {{ label?: string, handle?: string }} entry
 * @returns {string}
 */
export function lastActivityForEntry(entry) {
  const activities = loadActivity();
  const candidates = new Set(
    [entry.label, entry.handle ? `@${entry.handle}` : null].filter(Boolean)
  );
  for (const act of activities) {
    if (candidates.has(act.label)) return formatActivityTime(act.at);
  }
  return "";
}

/** @param {string} iso */
export function formatActivityTime(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
