/**
 * Status dot boot gate — DOM helpers for data-dot-boot on #brand-status-dot-btn.
 * @see docs/SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md RC-3
 */
import {
  DEVICE_DOT_BOOT_PENDING,
  DEVICE_DOT_BOOT_READY,
  isDotBootstrapSettled,
} from "./device-status-dot-boot-core.mjs";

export {
  DEVICE_DOT_BOOT_PENDING,
  DEVICE_DOT_BOOT_READY,
  isDotBootstrapSettled,
  markDotBootstrapSettled,
  resetDotBootstrapSettledForTests,
  resetDotBootstrapSettledForResume,
  shouldDeferCoreDotPaint,
} from "./device-status-dot-boot-core.mjs";

/**
 * @param {Document | undefined} doc
 */
export function markDotBootPending(doc = document) {
  doc.getElementById("brand-status-dot-btn")?.setAttribute("data-dot-boot", DEVICE_DOT_BOOT_PENDING);
}

/**
 * @param {Document | undefined} doc
 */
export function markDotBootReady(doc = document) {
  doc.getElementById("brand-status-dot-btn")?.setAttribute("data-dot-boot", DEVICE_DOT_BOOT_READY);
}

/**
 * Reveal dot only after the first settled status paint (health + session).
 * @param {Document | undefined} doc
 */
export function markDotBootReadyIfSettled(doc = document) {
  if (isDotBootstrapSettled()) markDotBootReady(doc);
}
