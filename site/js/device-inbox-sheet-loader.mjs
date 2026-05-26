/**
 * Lazy loader for inbox sheet — shared by device-status and hub glance.
 * @see docs/SAFARI_WEBKIT_SHELL_REGRESSION_INVESTIGATION.md — Phase 2.2
 */
import { DEVICE_SHELL_ASSET_VERSION } from "./device-status-shell-modules.mjs";

/** @type {Promise<typeof import("./device-inbox-sheet.mjs")> | null} */
let inboxSheetModulePromise = null;

export function loadInboxSheetModule() {
  if (!inboxSheetModulePromise) {
    inboxSheetModulePromise = import(
      `./device-inbox-sheet.mjs?v=${DEVICE_SHELL_ASSET_VERSION}`
    );
  }
  return inboxSheetModulePromise;
}

export function openInboxFromChrome(source) {
  void loadInboxSheetModule().then((mod) => mod.openInboxFromChrome(source));
}

export function closeInboxSheet() {
  void loadInboxSheetModule().then((mod) => mod.setInboxSheetOpen(false));
}
