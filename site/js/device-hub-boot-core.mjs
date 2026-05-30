/**
 * Defer hub personalized innerHTML until shell boot marks data-boot=ready.
 * @see docs/SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md RC-7
 */

import {
  DEVICE_BOOT_PENDING,
  isDeviceBootLocalOrReadyState,
  isDeviceBootReadyState,
} from "./device-shell-boot-core.mjs";

/**
 * Network/inbox/custody chrome — still deferred until `ready` (RC-6/RC-7).
 * @param {string | undefined} bootState body dataset.boot
 */
export function shouldDeferHubPersonalizedRenderUntilShellBoot(bootState) {
  if (!bootState || bootState === DEVICE_BOOT_PENDING) return true;
  return !isDeviceBootReadyState(bootState);
}

/**
 * Saved cards / pins / activity from localStorage (RC-17 wallet local boot).
 * @param {string | undefined} bootState
 */
export function shouldDeferHubSavedListRenderUntilShellBoot(bootState) {
  if (!bootState || bootState === DEVICE_BOOT_PENDING) return true;
  return !isDeviceBootLocalOrReadyState(bootState);
}

/**
 * @param {Document | undefined} doc
 */
export function hubPersonalizedRenderDeferred(doc = typeof document !== "undefined" ? document : undefined) {
  return shouldDeferHubPersonalizedRenderUntilShellBoot(doc?.body?.dataset?.boot);
}

/**
 * @param {Document | undefined} doc
 */
export function hubSavedListRenderDeferred(doc = typeof document !== "undefined" ? document : undefined) {
  return shouldDeferHubSavedListRenderUntilShellBoot(doc?.body?.dataset?.boot);
}
