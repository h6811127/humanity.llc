/**
 * Status dot boot gate — defer core paint until full status module settles health + session.
 * @see docs/SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md RC-3
 */

export const DEVICE_DOT_BOOT_PENDING = "pending";
export const DEVICE_DOT_BOOT_READY = "ready";

/** Core bootstrap must not paint a misleading offline/steward dot from summary cache alone. */
export function shouldDeferCoreDotPaint() {
  return true;
}

let bootstrapSettled = false;

export function markDotBootstrapSettled() {
  bootstrapSettled = true;
}

export function isDotBootstrapSettled() {
  return bootstrapSettled;
}

export function resetDotBootstrapSettledForTests() {
  bootstrapSettled = false;
}

/** bfcache resume — core must defer dot paint until status re-settles. */
export function resetDotBootstrapSettledForResume() {
  bootstrapSettled = false;
}
