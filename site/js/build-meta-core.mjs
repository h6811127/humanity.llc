/**
 * Pure helpers for Pages build metadata.
 * @see docs/SITE_BUILD_VERSIONING.md
 */

/**
 * @typedef {"deploy" | "dev" | "ci"} SiteBuildMetaSource
 */

/**
 * @typedef {object} SiteBuildMeta
 * @property {string} gitSha
 * @property {string} builtAt ISO-8601 UTC
 * @property {number} shellAssetVersion
 * @property {SiteBuildMetaSource} source
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
 * @param {SiteBuildMeta} meta
 * @param {string} [pagePath]
 * @returns {string}
 */
export function formatSiteBuildCopyText(meta, pagePath = "") {
  return [
    `site.gitSha=${meta.gitSha}`,
    `site.builtAt=${meta.builtAt}`,
    `site.shellAssetVersion=${meta.shellAssetVersion}`,
    `site.source=${meta.source}`,
    pagePath ? `page=${pagePath}` : "",
  ]
    .filter(Boolean)
    .join("\n");
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
