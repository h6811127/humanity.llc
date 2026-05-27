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

/** Default stamp committed for local dev before `npm run site:build-meta`. */
export const DEFAULT_SITE_BUILD_META = {
  gitSha: "dev",
  builtAt: "1970-01-01T00:00:00.000Z",
  shellAssetVersion: 0,
  source: "dev",
};

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
