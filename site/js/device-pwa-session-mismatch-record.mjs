/**
 * Record last shell mode when tab gains signing keys (P2-2).
 */
import {
  rememberLastSigningShellMode,
  signingShellModeFromStandalone,
} from "./device-pwa-session-mismatch-core.mjs";
import { readStandaloneModeFromWindow } from "./pwa-standalone-refresh-core.mjs";

/** @param {Window | null | undefined} [win] */
export function recordSigningShellModeFromWindow(win) {
  const standalone = readStandaloneModeFromWindow(win ?? (typeof window !== "undefined" ? window : null));
  rememberLastSigningShellMode(signingShellModeFromStandalone(standalone));
}
