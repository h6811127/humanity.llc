/**
 * Defer hub personalized innerHTML until shell boot marks data-boot=ready.
 * @see docs/SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md RC-7
 */

import {
  DEVICE_BOOT_PENDING,
  isDeviceBootReadyState,
} from "./device-shell-boot-core.mjs";

/**
 * @param {string | undefined} bootState body dataset.boot
 */
export function shouldDeferHubPersonalizedRenderUntilShellBoot(bootState) {
  if (!bootState || bootState === DEVICE_BOOT_PENDING) return true;
  return !isDeviceBootReadyState(bootState);
}

/**
 * @param {Document | undefined} doc
 */
export function hubPersonalizedRenderDeferred(doc = typeof document !== "undefined" ? document : undefined) {
  return shouldDeferHubPersonalizedRenderUntilShellBoot(doc?.body?.dataset?.boot);
}
