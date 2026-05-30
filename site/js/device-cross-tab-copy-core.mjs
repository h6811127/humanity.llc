/**
 * Shared cross-tab presence copy (Phase 5).
 * @see docs/KEYS_CUSTODY_AND_NOTIFICATION_IMPROVEMENT_PLAN.md Phase 5
 * @see docs/OWNERSHIP_AND_CONTROL_MODEL.md D1 — Layer 2 custody copy
 */
import {
  crossTabAggregateTitle as shellCrossTabAggregateTitle,
  crossTabPresenceFallbackLabel,
} from "./device-shell-copy-core.mjs";

/** @typedef {import("./device-shell-copy-core.mjs").ShellSurface} ShellSurface */

/**
 * @param {{ profile_id?: string, label?: string, handle?: string }} entry
 * @param {ShellSurface} [surface]
 */
export function crossTabPresenceLabel(entry, surface = "browser") {
  if (entry?.label) return entry.label;
  if (entry?.handle) return `@${entry.handle}`;
  const pid = entry?.profile_id;
  return pid ? `${String(pid).slice(0, 12)}…` : crossTabPresenceFallbackLabel(surface);
}

/**
 * @param {number} count
 * @param {ShellSurface} [surface]
 */
export function crossTabAggregateTitle(count, surface = "browser") {
  return shellCrossTabAggregateTitle(count, surface);
}

/**
 * @param {Array<{ profile_id?: string, label?: string, handle?: string }>} entries
 * @param {{ maxVisible?: number, surface?: ShellSurface }} [opts]
 */
export function crossTabAggregateSubtitle(entries, opts = {}) {
  const maxVisible = opts.maxVisible ?? 3;
  const surface = opts.surface ?? "browser";
  const labels = entries.map((entry) => crossTabPresenceLabel(entry, surface));
  if (labels.length === 0) return "";
  if (labels.length <= maxVisible) return labels.join(" · ");
  const shown = labels.slice(0, maxVisible).join(" · ");
  const rest = labels.length - maxVisible;
  return `${shown} (+${rest} more)`;
}
