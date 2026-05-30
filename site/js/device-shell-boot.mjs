/**
 * Shell boot gate — set body[data-boot] when personalized copy is safe to show.
 * @see docs/SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md RC-1 · RC-17
 */
import {
  DEVICE_BOOT_LOCAL,
  DEVICE_BOOT_LOCAL_EVENT,
  DEVICE_BOOT_PENDING,
  DEVICE_BOOT_READY,
  DEVICE_BOOT_READY_EVENT,
  isDeviceBootReadyState,
  isWalletShellPage,
  pageOwnsDeviceBootReady,
} from "./device-shell-boot-core.mjs";

export {
  DEVICE_BOOT_LOCAL,
  DEVICE_BOOT_LOCAL_EVENT,
  DEVICE_BOOT_PENDING,
  DEVICE_BOOT_READY,
  DEVICE_BOOT_READY_EVENT,
  pageOwnsDeviceBootReady,
};

/** @type {number | null} */
let lastDeviceBootReadyAtMs = null;

/**
 * @param {number} [nowMs]
 */
export function deviceBootReadyAtMs(nowMs = Date.now()) {
  return lastDeviceBootReadyAtMs;
}

/**
 * Milliseconds since boot reached ready (null if never ready this load).
 * @param {number} [nowMs]
 */
export function msSinceDeviceBootReady(nowMs = Date.now()) {
  if (lastDeviceBootReadyAtMs == null) return null;
  return nowMs - lastDeviceBootReadyAtMs;
}

/**
 * @param {Document | undefined} doc
 */
export function markDeviceBootPending(doc = document) {
  doc?.body?.setAttribute("data-boot", DEVICE_BOOT_PENDING);
  lastDeviceBootReadyAtMs = null;
}

/**
 * @param {Document | undefined} doc
 */
export function markDeviceBootReady(doc = document) {
  const body = doc?.body;
  if (!body) return;
  if (isDeviceBootReadyState(body.dataset.boot)) return;
  body.dataset.boot = DEVICE_BOOT_READY;
  lastDeviceBootReadyAtMs = Date.now();
  doc.defaultView?.dispatchEvent(new Event(DEVICE_BOOT_READY_EVENT));
}

/**
 * Wallet: show saved list from localStorage before network chrome (RC-17).
 * @param {Document | undefined} doc
 */
export function markDeviceBootLocalIfWalletPage(doc = document) {
  const path = doc?.location?.pathname ?? "";
  if (!isWalletShellPage(path)) return;
  const body = doc?.body;
  if (!body) return;
  if (isDeviceBootReadyState(body.dataset.boot)) return;
  if (body.dataset.boot === DEVICE_BOOT_LOCAL) return;
  body.dataset.boot = DEVICE_BOOT_LOCAL;
  doc.defaultView?.dispatchEvent(new Event(DEVICE_BOOT_LOCAL_EVENT));
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
