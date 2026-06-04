/**
 * Shell bfcache / back-forward resume gate (pure helpers).
 * @see docs/SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md RC-12
 */

import { pageOwnsDeviceBootReady } from "./device-shell-boot-core.mjs";

export const SHELL_BFCACHE_RESTORE_EVENT = "hc-shell-bfcache-resume";

/**
 * Pages that ship device shell chrome and personalized boot gates.
 * @param {string} pathname
 */
export function isDeviceShellResumePagePath(pathname = "") {
  const path = pathname.replace(/\/index\.html$/i, "/");
  if (path === "/" || path === "/index.html") return true;
  if (path === "/wallet/" || path.endsWith("/wallet/")) return true;
  if (path === "/created/" || path.endsWith("/created/")) return true;
  if (path === "/create/" || path.endsWith("/create/")) return true;
  return false;
}

/**
 * @param {{ persisted?: boolean; pathname?: string }} input
 */
export function shouldHandleShellBfcacheRestore(input) {
  if (input.persisted !== true) return false;
  return isDeviceShellResumePagePath(input.pathname ?? "");
}

/**
 * Landing, wallet, and create must re-fetch resolver health after bfcache restore
 * before chrome refresh can mark `data-boot=ready` (/created/ owns its own poll).
 * @param {string} [pathname]
 */
export function shouldRefreshNetworkBeforeShellBfcacheChrome(pathname = "") {
  return !pageOwnsDeviceBootReady(pathname);
}
