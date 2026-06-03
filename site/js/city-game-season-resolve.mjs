/**
 * Resolve season JSON URL on play pages (multi-city).
 */
import { seasonSlugFromRulesPath } from "./city-game-season-path-shared.mjs";

export const CITY_GAME_SEASONS_INDEX_URL = "/data/city-game-seasons-index.json";

/** @deprecated use resolvePlayPageSeason */
export const CITY_GAME_SEASON_JSON_URL = "/data/city-game-cr-season-01.json";

/**
 * @param {string} pathname
 */
export function playSlugFromPathname(pathname = location.pathname) {
  const match = String(pathname).match(/^\/play\/([^/]+)\/?/);
  return match?.[1] ?? null;
}

/**
 * @param {URLSearchParams} params
 */
export function seasonQueryFromSearch(params = new URLSearchParams(location.search)) {
  const seasonId = params.get("season_id")?.trim() || params.get("season")?.trim() || "";
  const slug = params.get("slug")?.trim() || "";
  return { seasonId: seasonId || null, slug: slug || null };
}

/**
 * @param {HTMLElement} [mount]
 */
export function seasonIdFromMount(mount) {
  const id = mount?.dataset?.seasonId?.trim();
  return id || null;
}

/**
 * @param {{ seasons: Array<{ season_id: string; slug?: string | null; json_url: string; rules_path?: string | null }> }} index
 * @param {{ seasonId?: string | null; slug?: string | null; pathname?: string }} query
 */
export function pickSeasonFromIndex(index, query = {}) {
  const rows = Array.isArray(index?.seasons) ? index.seasons : [];
  if (query.seasonId) {
    return rows.find((row) => row.season_id === query.seasonId) ?? null;
  }
  const slug =
    query.slug ??
    (query.pathname ? playSlugFromPathname(query.pathname) : null);
  if (slug === "season") return null;
  if (slug) {
    const bySlug = rows.find((row) => row.slug === slug);
    if (bySlug) return bySlug;
    const byRules = rows.find(
      (row) => seasonSlugFromRulesPath(row.rules_path) === slug
    );
    if (byRules) return byRules;
  }
  return rows.find((row) => row.season_id === "cr_season_01_wake") ?? rows[0] ?? null;
}

/**
 * @param {HTMLElement} [mount]
 */
export async function resolvePlayPageSeason(mount) {
  const mountSeasonId = seasonIdFromMount(mount);
  const res = await fetch(CITY_GAME_SEASONS_INDEX_URL, { cache: "no-store" });
  if (!res.ok) {
    if (mountSeasonId) {
      return {
        seasonId: mountSeasonId,
        jsonUrl: CITY_GAME_SEASON_JSON_URL,
      };
    }
    throw new Error(`season index fetch ${res.status}`);
  }
  const index = await res.json();
  const query = seasonQueryFromSearch();
  const row = pickSeasonFromIndex(index, {
    seasonId: mountSeasonId ?? query.seasonId,
    slug: query.slug,
    pathname: location.pathname,
  });
  if (!row?.json_url) {
    throw new Error("No season matched this play page.");
  }
  return {
    seasonId: row.season_id,
    jsonUrl: row.json_url,
    rulesPath: row.rules_path ?? null,
    title: row.title ?? row.season_id,
    city: row.city ?? "",
  };
}
