/**
 * Browser-safe season path helpers (no Node built-ins).
 * Node scripts import via city-game-season-path-core.mjs.
 */

export const SEASON_DATA_DIR = "site/data";
export const SEASON_INDEX_BASENAME = "city-game-seasons-index.json";
export const SEASON_JSON_PREFIX = "city-game-";

/** Merge-input drafts under site/data — not bundled seasons (see merge-city-game-wave-open.mjs). */
export const SEASON_JSON_DRAFT_SUFFIX = "-wave-open-nodes.json";

/** Pilot season file (Cedar Rapids S1). */
export const PILOT_SEASON_BASENAME = "city-game-cr-season-01.json";

/**
 * @param {string} name Filename under site/data
 * @returns {boolean}
 */
export function isBundledSeasonJsonBasename(name) {
  return (
    name.startsWith(SEASON_JSON_PREFIX) &&
    name.endsWith(".json") &&
    name !== SEASON_INDEX_BASENAME &&
    !name.endsWith(SEASON_JSON_DRAFT_SUFFIX)
  );
}

/**
 * @param {string} rulesPath e.g. /play/cedar-rapids/
 * @returns {string | null}
 */
export function seasonSlugFromRulesPath(rulesPath) {
  const trimmed = String(rulesPath ?? "").trim();
  const match = trimmed.match(/^\/play\/([^/]+)\/?$/);
  return match?.[1] ?? null;
}

/**
 * @param {string} basename
 */
export function seasonJsonPublicUrl(basename) {
  return `/data/${basename}`;
}

/**
 * @param {Record<string, unknown>} season
 * @param {string} basename
 */
export function seasonIndexEntryFromConfig(season, basename) {
  const rulesPath = String(season.rules_path ?? "").trim();
  const slug = seasonSlugFromRulesPath(rulesPath);
  const rootRaw = season.season_root_profile_id;
  const seasonRootProfileId =
    typeof rootRaw === "string" && rootRaw.trim() ? rootRaw.trim() : null;
  return {
    season_id: String(season.season_id ?? ""),
    title: String(season.title ?? season.season_id ?? ""),
    city: String(season.city ?? ""),
    status: String(season.status ?? "planned"),
    rules_path: rulesPath || null,
    slug,
    season_root_profile_id: seasonRootProfileId,
    json_url: seasonJsonPublicUrl(basename),
    json_basename: basename,
  };
}

/**
 * Paths derived from season config + registry basename.
 * @param {Record<string, unknown>} season
 * @param {string} jsonBasename
 */
export function seasonLaunchContext(season, jsonBasename) {
  const slug = seasonSlugFromRulesPath(String(season.rules_path ?? ""));
  if (!slug) {
    throw new Error("season.rules_path must be /play/{slug}/ for launch surfaces.");
  }
  const rulesPath = String(season.rules_path).trim().replace(/\/?$/, "/");
  return {
    slug,
    rulesPath,
    rulesPageRel: `site/play/${slug}/index.html`,
    seasonJsonUrl: seasonJsonPublicUrl(jsonBasename),
    comprehensionPageRel: `site/play/${slug}/comprehension/index.html`,
  };
}
