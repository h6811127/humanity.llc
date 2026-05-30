/**
 * Shell boot gate — hide personalized DOM until JS marks data-boot=ready.
 * @see docs/SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md RC-1
 */

export const DEVICE_BOOT_PENDING = "pending";
export const DEVICE_BOOT_READY = "ready";
export const DEVICE_BOOT_READY_EVENT = "hc-device-boot-ready";

/**
 * Pages that call markDeviceBootReady from their own module after session populate.
 * @param {string} pathname
 */
export function pageOwnsDeviceBootReady(pathname = "") {
  const path = pathname.replace(/\/index\.html$/i, "/");
  return path === "/created/" || path.endsWith("/created/");
}

/**
 * @param {string | undefined} state body dataset.boot
 */
export function isDeviceBootReadyState(state) {
  return state === DEVICE_BOOT_READY;
}
