/**
 * Pure helpers for quiet rehydrate boot ordering (RC-10).
 * @see docs/SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md RC-10
 */

/** @type {Promise<unknown> | null} */
let bootstrapPromise = null;

/**
 * Page modules that read tab session during top-level init should await
 * quiet rehydrate bootstrap on shell routes (not scan — scan uses scan-tab-keys).
 *
 * @param {string} pathname
 */
export function shouldAwaitQuietRehydrateBootstrap(pathname = "") {
  const path = pathname.replace(/\/index\.html$/i, "/");
  if (path === "/created/" || path.endsWith("/created/")) return true;
  if (path === "/wallet/" || path.endsWith("/wallet/")) return true;
  return false;
}

/**
 * @param {() => Promise<unknown>} run
 */
export function bindQuietTabRehydrateBootstrap(run) {
  if (!bootstrapPromise) {
    bootstrapPromise = run();
  }
  return bootstrapPromise;
}

/** @internal Vitest only */
export function resetQuietTabRehydrateBootstrapForTests() {
  bootstrapPromise = null;
}
