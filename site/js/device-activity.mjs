/**
 * Local activity log for the device hub (this browser only).
 */
const STORAGE_KEY = "hc_device_activity";
const MAX_ENTRIES = 40;

/** @typedef {'saved'|'use_keys'|'remove_card'|'pin_added'|'backup_import'|'live_control'} ActivityType */

/**
 * @param {ActivityType} type
 * @param {string} label
 */
export function logDeviceActivity(type, label) {
  const text = String(label || "").trim();
  if (!text) return;

  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    label: text,
    at: new Date().toISOString(),
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

/** @param {{ type: string, label: string, at: string }} entry */
export function activityHaystack(entry) {
  return [entry.label, entry.type, "activity recent device"].join(" ").toLowerCase();
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
