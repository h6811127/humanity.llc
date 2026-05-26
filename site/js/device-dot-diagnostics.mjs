/**
 * Dev-only trust-dot interaction log (sessionStorage ring buffer).
 * Enable with localStorage.hc_dot_diagnostics = "1"
 * @see docs/STATUS_INDICATOR_STEWARD_GREEN.md
 */
import {
  appendDotDiagLog,
  countPopoverOpensWithoutAction,
  countStateFlaps,
} from "./device-dot-diagnostics-core.mjs";

export const DOT_DIAG_LOG_KEY = "hc_dot_diag_log";
export const DOT_DIAG_FLAG_KEY = "hc_dot_diagnostics";

export function isDotDiagnosticsEnabled() {
  try {
    return localStorage.getItem(DOT_DIAG_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * @param {Record<string, unknown>} entry
 */
export function logDotDiagnostic(entry) {
  if (!isDotDiagnosticsEnabled()) return;
  try {
    const raw = sessionStorage.getItem(DOT_DIAG_LOG_KEY);
    const log = raw ? JSON.parse(raw) : [];
    const next = appendDotDiagLog(log, {
      page: location.pathname,
      ...entry,
    });
    sessionStorage.setItem(DOT_DIAG_LOG_KEY, JSON.stringify(next));
    maybeLogConfusionSignals(next);
  } catch {
    /* ignore */
  }
}

/**
 * @param {unknown[]} log
 */
function maybeLogConfusionSignals(log) {
  const popoverStreak = countPopoverOpensWithoutAction(log);
  if (popoverStreak >= 3) {
    console.info(
      "[hc-dot-diag] Repeated glance popover opens without action:",
      popoverStreak
    );
  }
  const flaps = countStateFlaps(log);
  if (flaps >= 3) {
    console.info("[hc-dot-diag] Frequent dot state transitions:", flaps);
  }
}
