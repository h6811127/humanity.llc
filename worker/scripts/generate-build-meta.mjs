/**
 * Writes site/js/build-meta.mjs for Pages deploy identity.
 * @see docs/SITE_BUILD_VERSIONING.md — Phase 1
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildMetaSourceFromEnv,
  renderBuildMetaModule,
  resolveGitShaFromRoot,
} from "../../site/js/build-meta-core.mjs";
import { DEVICE_SHELL_ASSET_VERSION } from "../../site/js/device-status-shell-modules.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outPath = join(root, "site/js/build-meta.mjs");

const meta = {
  gitSha: resolveGitShaFromRoot(root),
  builtAt: new Date().toISOString(),
  shellAssetVersion: DEVICE_SHELL_ASSET_VERSION,
  source: buildMetaSourceFromEnv(root),
};

writeFileSync(outPath, renderBuildMetaModule(meta), "utf8");
console.log(`Wrote ${outPath} (${meta.gitSha}, shell=${meta.shellAssetVersion})`);
