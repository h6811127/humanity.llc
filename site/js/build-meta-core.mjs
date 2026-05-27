/**
 * Pure helpers for Pages and Worker build metadata.
 * @see docs/SITE_BUILD_VERSIONING.md
 */
import { execSync } from "node:child_process";

/**
 * @typedef {"deploy" | "dev" | "ci"} BuildMetaSource
 */

/** @typedef {BuildMetaSource} SiteBuildMetaSource */

/**
 * @typedef {object} SiteBuildMeta
 * @property {string} gitSha
 * @property {string} builtAt ISO-8601 UTC
 * @property {number} shellAssetVersion
 * @property {SiteBuildMetaSource} source
 */

/**
 * @typedef {object} WorkerBuildMeta
 * @property {string} gitSha
 * @property {string} builtAt ISO-8601 UTC
 * @property {BuildMetaSource} source
 */

/** @see docs/SITE_BUILD_VERSIONING.md — Phase 2 hub stamp */
export const SITE_DEBUG_FLAG_KEY = "hc_debug";

/** Default stamp committed for local dev before `npm run site:build-meta`. */
export const DEFAULT_SITE_BUILD_META = {
  gitSha: "dev",
  builtAt: "1970-01-01T00:00:00.000Z",
  shellAssetVersion: 0,
  source: "dev",
};

/** Default Worker stamp before `npm run worker:build-meta`. */
export const DEFAULT_WORKER_BUILD_META = {
  gitSha: "dev",
  builtAt: "1970-01-01T00:00:00.000Z",
  source: "dev",
};

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
 * @returns {BuildMetaSource}
 */
export function buildMetaSourceFromEnv(root) {
  void root;
  return process.env.CI === "true" ? "ci" : "deploy";
}

/**
 * @param {Pick<Location, "search"> | null | undefined} locationLike
 * @param {Pick<Storage, "getItem"> | null | undefined} storageLike
 * @returns {boolean}
 */
export function isSiteDebugEnabled(locationLike, storageLike) {
  try {
    if (storageLike?.getItem(SITE_DEBUG_FLAG_KEY) === "1") return true;
  } catch {
    /* ignore */
  }
  try {
    const search = locationLike?.search;
    if (!search) return false;
    const value = new URLSearchParams(search).get("hc_debug");
    return value === "1" || value === "true";
  } catch {
    return false;
  }
}

/**
 * @param {SiteBuildMeta} meta
 * @returns {string}
 */
export function formatSiteBuildHubLabel(meta) {
  return `Site ${meta.gitSha} · shell ${meta.shellAssetVersion} · ${meta.source}`;
}

/**
 * @param {WorkerBuildMeta} meta
 * @returns {string}
 */
export function formatWorkerBuildHubLabel(meta) {
  return `Worker ${meta.gitSha} · ${meta.source}`;
}

/**
 * @param {unknown} body Health JSON body
 * @returns {WorkerBuildMeta | null}
 */
export function parseResolverHealthBuild(body) {
  if (!body || typeof body !== "object") return null;
  const build = /** @type {{ build?: unknown }} */ (body).build;
  if (!build || typeof build !== "object") return null;
  const record = /** @type {Record<string, unknown>} */ (build);
  const gitSha = typeof record.gitSha === "string" ? record.gitSha : "";
  const builtAt = typeof record.builtAt === "string" ? record.builtAt : "";
  const source = typeof record.source === "string" ? record.source : "";
  if (!gitSha || !builtAt || !source) return null;
  if (source !== "deploy" && source !== "dev" && source !== "ci") return null;
  return { gitSha, builtAt, source };
}

/**
 * @param {SiteBuildMeta} meta
 * @param {string} [pagePath]
 * @returns {string}
 */
export function formatSiteBuildCopyText(meta, pagePath = "") {
  return formatCombinedBuildCopyText(meta, null, pagePath);
}

/**
 * @param {SiteBuildMeta} siteMeta
 * @param {WorkerBuildMeta | null | undefined} workerBuild
 * @param {string} [pagePath]
 * @returns {string}
 */
export function formatCombinedBuildCopyText(siteMeta, workerBuild, pagePath = "") {
  const lines = [
    `site.gitSha=${siteMeta.gitSha}`,
    `site.builtAt=${siteMeta.builtAt}`,
    `site.shellAssetVersion=${siteMeta.shellAssetVersion}`,
    `site.source=${siteMeta.source}`,
  ];
  if (workerBuild) {
    lines.push(
      `worker.gitSha=${workerBuild.gitSha}`,
      `worker.builtAt=${workerBuild.builtAt}`,
      `worker.source=${workerBuild.source}`
    );
  } else {
    lines.push("worker.build=(unavailable)");
  }
  if (pagePath) lines.push(`page=${pagePath}`);
  return lines.join("\n");
}

/**
 * @param {SiteBuildMeta} meta
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
 * @param {SiteBuildMeta} meta
 * @returns {string}
 */
export function formatSiteBuildConsoleLine(meta) {
  return `[humanity] site build ${meta.gitSha} shell=${meta.shellAssetVersion} ${meta.builtAt}`;
}

/**
 * @param {WorkerBuildMeta} meta
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
