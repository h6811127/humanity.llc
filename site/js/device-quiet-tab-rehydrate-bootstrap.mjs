/**
 * Single quiet-tab rehydrate attempt per page load (RC-10).
 * Shell status boot and page modules share this promise so session reads
 * do not race ahead of bootstrap rehydrate.
 * @see docs/SHELL_PAGE_LOAD_CONTENT_FLASH_INVESTIGATION.md RC-10
 */
import { bindQuietTabRehydrateBootstrap } from "./device-quiet-tab-rehydrate-boot-core.mjs";
import { maybeQuietTabRehydrate } from "./device-quiet-tab-rehydrate.mjs";

/**
 * @param {{ excludeProfileId?: string | null, urlProfileId?: string | null }} [opts]
 */
export function ensureQuietTabRehydrateBootstrap(opts = {}) {
  return bindQuietTabRehydrateBootstrap(() => maybeQuietTabRehydrate(opts));
}

export { resetQuietTabRehydrateBootstrapForTests } from "./device-quiet-tab-rehydrate-boot-core.mjs";
