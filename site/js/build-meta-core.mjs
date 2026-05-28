/**
 * Node-only build metadata generators (git SHA, file emit).
 * Do not import from shell pages — use build-meta-browser.mjs in the browser.
 * @see docs/SITE_BUILD_VERSIONING.md
 * @see docs/HUB_DOT_DEAD_INVESTIGATION_2026-05-27.md
 */
import { execSync } from "node:child_process";

export {
  DEFAULT_SITE_BUILD_META,
  DEFAULT_WORKER_BUILD_META,
  formatCombinedBuildCopyText,
  formatSiteBuildConsoleLine,
  formatSiteBuildCopyText,
  formatSiteBuildHubLabel,
  formatWorkerBuildHubLabel,
  isSiteDebugEnabled,
  parseResolverHealthBuild,
  SITE_DEBUG_FLAG_KEY,
} from "./build-meta-browser.mjs";

/**
 * @typedef {import("./build-meta-browser.mjs").SiteBuildMeta} SiteBuildMeta
 * @typedef {import("./build-meta-browser.mjs").WorkerBuildMeta} WorkerBuildMeta
 * @typedef {import("./build-meta-browser.mjs").BuildMetaSource} BuildMetaSource
 */

/**
 * @param {string} root Repo root (directory containing .git)
 * @returns {string}
 */
export function resolveGitShaFromRoot(root) {
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

/**
 * @param {string} root
 * @returns {import("./build-meta-browser.mjs").BuildMetaSource}
 */
export function buildMetaSourceFromEnv(root) {
  void root;
  return process.env.CI === "true" ? "ci" : "deploy";
}

/**
 * @param {import("./build-meta-browser.mjs").SiteBuildMeta} meta
 * @returns {string}
 */
export function renderBuildMetaModule(meta) {
  const body = JSON.stringify(meta, null, 2);
  return `/**
 * Auto-generated — do not edit. Regenerate: npm run site:build-meta
 * @see docs/SITE_BUILD_VERSIONING.md
 */
export const SITE_BUILD_META = ${body};
`;
}

/**
 * @param {import("./build-meta-browser.mjs").WorkerBuildMeta} meta
 * @returns {string}
 */
export function renderWorkerBuildMetaModule(meta) {
  const body = JSON.stringify(meta, null, 2);
  return `/**
 * Auto-generated — do not edit. Regenerate: npm run worker:build-meta
 * @see docs/SITE_BUILD_VERSIONING.md
 */
export const WORKER_BUILD_META = ${body} as const;

export type WorkerBuildMeta = typeof WORKER_BUILD_META;
`;
}
