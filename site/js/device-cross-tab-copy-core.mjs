/**
 * Shared cross-tab presence copy (Phase 5).
 * @see docs/KEYS_CUSTODY_AND_NOTIFICATION_IMPROVEMENT_PLAN.md Phase 5
 */

/**
 * @param {{ profile_id?: string, label?: string, handle?: string }} entry
 */
export function crossTabPresenceLabel(entry) {
  if (entry?.label) return entry.label;
  if (entry?.handle) return `@${entry.handle}`;
  const pid = entry?.profile_id;
  return pid ? `${String(pid).slice(0, 12)}…` : "Other tab";
}

/**
 * @param {number} count
 */
export function crossTabAggregateTitle(count) {
  if (count <= 0) return "";
  if (count === 1) return "Keys open in 1 other tab";
  return `Keys open in ${count} other tabs`;
}

/**
 * @param {Array<{ profile_id?: string, label?: string, handle?: string }>} entries
 * @param {{ maxVisible?: number }} [opts]
 */
export function crossTabAggregateSubtitle(entries, opts = {}) {
  const maxVisible = opts.maxVisible ?? 3;
  const labels = entries.map((entry) => crossTabPresenceLabel(entry));
  if (labels.length === 0) return "";
  if (labels.length <= maxVisible) return labels.join(" · ");
  const shown = labels.slice(0, maxVisible).join(" · ");
  const rest = labels.length - maxVisible;
  return `${shown} (+${rest} more)`;
}
