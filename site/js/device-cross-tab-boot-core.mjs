/**
 * Defer cross-tab chrome until shell boot marks data-boot=ready.
 * @see docs/SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md RC-6
 */

import {
  DEVICE_BOOT_PENDING,
  isDeviceBootReadyState,
} from "./device-shell-boot-core.mjs";

/**
 * @param {string | undefined} bootState body dataset.boot
 */
export function shouldSuppressCrossTabChromeUntilShellBoot(bootState) {
  if (!bootState || bootState === DEVICE_BOOT_PENDING) return true;
  return !isDeviceBootReadyState(bootState);
}

/**
 * Hide cross-tab inbox/dot surfaces while boot is pending; streak still advances in caller.
 * @param {import("./device-cross-tab-state-core.mjs").CrossTabNotificationState} state
 * @param {string | undefined} bootState
 */
export function suppressCrossTabNotificationStateUntilBoot(state, bootState) {
  if (!shouldSuppressCrossTabChromeUntilShellBoot(bootState)) return state;
  return {
    ...state,
    showGeneric: false,
    showOrphan: false,
    genericEntries: [],
    orphanEntries: [],
    badgeContribution: 0,
  };
}

/**
 * @param {{ show: boolean, entries: Array<unknown> }} snapshot
 * @param {string | undefined} bootState
 */
export function suppressCrossTabScanSnapshotUntilBoot(snapshot, bootState) {
  if (!shouldSuppressCrossTabChromeUntilShellBoot(bootState)) return snapshot;
  return { show: false, entries: [] };
}
