/**
 * Lazy loader for hub sheet reconcile — shrinks device-status.mjs static graph.
 * @see docs/STATUS_DOT_LOAD_FAILURE_POSTMORTEM.md § P2 Step 4
 */
import { DEVICE_SHELL_ASSET_VERSION } from "./device-status-shell-modules.mjs";

/** @type {Promise<typeof import("./device-hub-sheet.mjs")> | null} */
let hubSheetModulePromise = null;

export function loadHubSheetModule() {
  if (!hubSheetModulePromise) {
    hubSheetModulePromise = import(
      `./device-hub-sheet.mjs?v=${DEVICE_SHELL_ASSET_VERSION}`
    );
  }
  return hubSheetModulePromise;
}

export function reconcileHubSheetState() {
  void loadHubSheetModule().then((mod) => mod.reconcileHubSheetState());
}
