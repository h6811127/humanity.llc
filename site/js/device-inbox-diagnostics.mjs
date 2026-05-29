/**
 * Dev-only inbox interaction log (sessionStorage ring buffer).
 * Enable with localStorage.hc_inbox_diagnostics = "1"
 * @see docs/DEVICE_INBOX.md - Diagnostics
 */
import {
  appendInboxDiagLog,
  countInboxOpensWithoutAction,
} from "./device-inbox-diagnostics-core.mjs?v=59";

export const INBOX_DIAG_LOG_KEY = "hc_inbox_diag_log";
export const INBOX_DIAG_FLAG_KEY = "hc_inbox_diagnostics";

export function isInboxDiagnosticsEnabled() {
  try {
    return localStorage.getItem(INBOX_DIAG_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * @param {Record<string, unknown>} entry
 */
export function logInboxDiagnostic(entry) {
  if (!isInboxDiagnosticsEnabled()) return;
  try {
    const raw = sessionStorage.getItem(INBOX_DIAG_LOG_KEY);
    const log = raw ? JSON.parse(raw) : [];
    const next = appendInboxDiagLog(log, {
      page: location.pathname,
      ...entry,
    });
    sessionStorage.setItem(INBOX_DIAG_LOG_KEY, JSON.stringify(next));
    maybeLogConfusionSignals(next);
  } catch {
    /* ignore */
  }
}

/**
 * @param {unknown[]} log
 */
function maybeLogConfusionSignals(log) {
  const openStreak = countInboxOpensWithoutAction(log);
  if (openStreak >= 3) {
    console.info(
      "[hc-inbox-diag] Repeated inbox opens without row action:",
      openStreak
    );
  }
}
