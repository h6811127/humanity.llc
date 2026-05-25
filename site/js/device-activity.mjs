/**
 * Local activity log for the device hub (this browser only).
 */
import { loadWallet } from "./device-wallet.mjs";

const STORAGE_KEY = "hc_device_activity";
const MAX_ENTRIES = 40;
export const HUB_RECENT_DISPLAY_LIMIT = 3;

/**
 * Skip back-to-back duplicate actions (e.g. Use keys twice on the same card).
 * @param {ReturnType<typeof loadActivity>} entries
 * @param {{ type: string, label: string, profile_id?: string | null, qr_id?: string | null }} entry
 */
function isRepeatOfLatest(entries, entry) {
  const prev = entries[0];
  if (!prev || prev.type !== entry.type) return false;
  if (entry.profile_id && prev.profile_id) {
    return entry.profile_id === prev.profile_id;
  }
  return prev.label === entry.label;
}

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
  if (isRepeatOfLatest(entries, entry)) return;

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

/** @param {ActivityType | string} type */
export function activityTypeLabel(type) {
  const labels = {
    saved: "Saved on device",
    use_keys: "Loaded keys",
    remove_card: "Removed from wallet",
    pin_added: "Pinned scan link",
    backup_import: "Imported backup",
    live_control: "Signed live proof",
  };
  return labels[type] ?? "Action on device";
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
