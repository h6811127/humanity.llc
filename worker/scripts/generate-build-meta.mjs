/**
 * Writes site/js/build-meta.mjs for Pages deploy identity.
 * @see docs/SITE_BUILD_VERSIONING.md — Phase 1
 */
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { renderBuildMetaModule } from "../../site/js/build-meta-core.mjs";
import { DEVICE_SHELL_ASSET_VERSION } from "../../site/js/device-status-shell-modules.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outPath = join(root, "site/js/build-meta.mjs");

/**
 * @returns {string}
 */
function resolveGitSha() {
  try {
    return execSync("git rev-parse --short HEAD", {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unknown";
  }
}

/** @type {import("../../site/js/build-meta-core.mjs").SiteBuildMetaSource} */
const source = process.env.CI === "true" ? "ci" : "deploy";

const meta = {
  gitSha: resolveGitSha(),
  builtAt: new Date().toISOString(),
  shellAssetVersion: DEVICE_SHELL_ASSET_VERSION,
  source,
};

writeFileSync(outPath, renderBuildMetaModule(meta), "utf8");
console.log(`Wrote ${outPath} (${meta.gitSha}, shell=${meta.shellAssetVersion})`);
