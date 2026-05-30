/**
 * Shell boot gate — set body[data-boot] when personalized copy is safe to show.
 * @see docs/SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md RC-1
 */
import {
  DEVICE_BOOT_PENDING,
  DEVICE_BOOT_READY,
  DEVICE_BOOT_READY_EVENT,
  isDeviceBootReadyState,
  pageOwnsDeviceBootReady,
} from "./device-shell-boot-core.mjs";

export { DEVICE_BOOT_PENDING, DEVICE_BOOT_READY, DEVICE_BOOT_READY_EVENT, pageOwnsDeviceBootReady };

/**
 * @param {Document | undefined} doc
 */
export function markDeviceBootPending(doc = document) {
  doc?.body?.setAttribute("data-boot", DEVICE_BOOT_PENDING);
}

/**
 * @param {Document | undefined} doc
 */
export function markDeviceBootReady(doc = document) {
  const body = doc?.body;
  if (!body) return;
  if (isDeviceBootReadyState(body.dataset.boot)) return;
  body.dataset.boot = DEVICE_BOOT_READY;
  doc.defaultView?.dispatchEvent(new Event(DEVICE_BOOT_READY_EVENT));
}

/**
 * Mark boot ready on hub/wallet/landing shells after first chrome refresh.
 * /created/ owns its own ready signal after session populate.
 * @param {Document | undefined} doc
 */
export function markDeviceBootReadyIfShellPage(doc = document) {
  const path = doc?.location?.pathname ?? "";
  if (pageOwnsDeviceBootReady(path)) return;
  markDeviceBootReady(doc);
}
