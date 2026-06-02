/**
 * Defer hub personalized innerHTML until shell boot marks data-boot=ready.
 * @see docs/SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md RC-7
 */

import {
  DEVICE_BOOT_PENDING,
  isDeviceBootLocalOrReadyState,
  isDeviceBootReadyState,
  isWalletShellPage,
} from "./device-shell-boot-core.mjs";
import { isLandingHomePath } from "./device-hub-stranger-empty-core.mjs";

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

/**
 * Shell pages that pre-render hub DOM before `data-boot=ready` (RC-17 wallet, RC-18 landing).
 * @param {string} [pathname]
 */
export function isShellHubBootRevealPath(pathname = "") {
  return isWalletShellPage(pathname) || isLandingHomePath(pathname);
}

/**
 * @param {{
 *   pathname?: string;
 *   hasDeviceHub?: boolean;
 *   bootBefore?: string;
 *   healthSettled?: boolean;
 * }} input
 */
export function shouldPrepareShellHubBootReveal(input) {
  const path = input.pathname ?? "";
  if (!input.hasDeviceHub) return false;
  if (!isShellHubBootRevealPath(path)) return false;
  if (!input.healthSettled) return false;
  return !isDeviceBootReadyState(input.bootBefore);
}
