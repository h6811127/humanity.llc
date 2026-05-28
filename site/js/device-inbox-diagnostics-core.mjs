/**
 * Pure inbox diagnostics helpers (testable).
 * @see docs/DEVICE_INBOX.md - Diagnostics
 */

export const INBOX_DIAG_MAX_ENTRIES = 20;

/** @typedef {'badge' | 'dot_explainer' | 'glance' | 'hub'} InboxOpenSource */

/**
 * @param {unknown} entry
 */
export function normalizeInboxDiagEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const row = /** @type {Record<string, unknown>} */ (entry);
  if (typeof row.type !== "string") return null;
  return row;
}

/**
 * @param {unknown[]} log
 * @param {Record<string, unknown>} entry
 * @param {number} [max]
 */
export function appendInboxDiagLog(log, entry, max = INBOX_DIAG_MAX_ENTRIES) {
  const normalized = normalizeInboxDiagEntry(entry);
  if (!normalized) return Array.isArray(log) ? [...log] : [];
  const next = Array.isArray(log) ? [...log] : [];
  const at =
    typeof normalized.at === "string" ? normalized.at : new Date().toISOString();
  next.unshift({ ...normalized, at });
  return next.slice(0, max);
}

/**
 * Inbox opens since the most recent row action or OS notification click.
 * @param {unknown[]} log
 */
export function countInboxOpensWithoutAction(log) {
  if (!Array.isArray(log)) return 0;
  let streak = 0;
  for (const raw of log) {
    const e = normalizeInboxDiagEntry(raw);
    if (!e) continue;
    if (e.type === "inbox_item_action" || e.type === "os_notification_click") break;
    if (e.type === "inbox_open") streak++;
  }
  return streak;
}
