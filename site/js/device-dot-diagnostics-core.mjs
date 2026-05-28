/**
 * Pure trust-dot diagnostics helpers (testable).
 * @see docs/STATUS_INDICATOR_STEWARD_GREEN.md (Telemetry)
 */

export const DOT_DIAG_MAX_ENTRIES = 20;

/**
 * @param {unknown} entry
 */
export function normalizeDotDiagEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const row = /** @type {Record<string, unknown>} */ (entry);
  if (typeof row.type === "string") return row;
  if ("from" in row || "to" in row) {
    return { type: "state_transition", ...row };
  }
  return null;
}

/**
 * @param {unknown[]} log
 * @param {Record<string, unknown>} entry
 * @param {number} [max]
 */
export function appendDotDiagLog(log, entry, max = DOT_DIAG_MAX_ENTRIES) {
  const normalized = normalizeDotDiagEntry(entry);
  if (!normalized) return Array.isArray(log) ? [...log] : [];
  const next = Array.isArray(log) ? [...log] : [];
  const at =
    typeof normalized.at === "string" ? normalized.at : new Date().toISOString();
  next.unshift({ ...normalized, at });
  return next.slice(0, max);
}

/**
 * Popover opens since the most recent actionable follow-up (quick action or hub open).
 * @param {unknown[]} log
 */
export function countPopoverOpensWithoutAction(log) {
  if (!Array.isArray(log)) return 0;
  let streak = 0;
  for (const raw of log) {
    const e = normalizeDotDiagEntry(raw);
    if (!e) continue;
    if (e.type === "quick_action" || e.type === "hub_toggle") break;
    if (e.type === "popover_open") streak++;
  }
  return streak;
}

/**
 * State transitions within a recent time window (newest-first log).
 * @param {unknown[]} log
 * @param {number} [windowMs]
 * @param {number} [threshold]
 */
export function countStateFlaps(log, windowMs = 15_000, threshold = 3) {
  if (!Array.isArray(log)) return 0;
  const transitions = [];
  for (const raw of log) {
    const e = normalizeDotDiagEntry(raw);
    if (!e || e.type !== "state_transition") continue;
    if (e.from === e.to) continue;
    transitions.push(e);
  }
  if (transitions.length < threshold) return 0;
  const newestAt = Date.parse(String(transitions[0]?.at ?? ""));
  if (!Number.isFinite(newestAt)) return 0;
  let flaps = 0;
  for (const t of transitions) {
    const at = Date.parse(String(t.at ?? ""));
    if (!Number.isFinite(at) || newestAt - at > windowMs) break;
    flaps++;
  }
  return flaps >= threshold ? flaps : 0;
}
