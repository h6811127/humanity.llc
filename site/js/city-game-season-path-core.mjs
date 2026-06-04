/**
 * Multi-city season config paths — Node operator scripts + build.
 * Browser play pages must import city-game-season-path-shared.mjs instead.
 * @see docs/CITY_GAME_V1_IMPLEMENTATION.md § Phase E
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

export {
  PILOT_SEASON_BASENAME,
  SEASON_DATA_DIR,
  SEASON_INDEX_BASENAME,
  SEASON_JSON_DRAFT_SUFFIX,
  SEASON_JSON_PREFIX,
  isBundledSeasonJsonBasename,
  seasonIndexEntryFromConfig,
  seasonJsonPublicUrl,
  seasonLaunchContext,
  seasonSlugFromRulesPath,
} from "./city-game-season-path-shared.mjs";

import {
  PILOT_SEASON_BASENAME,
  SEASON_DATA_DIR,
  SEASON_INDEX_BASENAME,
  SEASON_JSON_PREFIX,
  isBundledSeasonJsonBasename,
  seasonSlugFromRulesPath,
} from "./city-game-season-path-shared.mjs";

/**
 * @param {string} root Repo root
 * @returns {string[]}
 */
export function listSeasonJsonBasenames(root) {
  const dir = join(root, SEASON_DATA_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => isBundledSeasonJsonBasename(name))
    .sort();
}

/**
 * @param {string} root
 * @param {string} basename
 */
export function loadSeasonJsonFile(root, basename) {
  const path = join(root, SEASON_DATA_DIR, basename);
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw);
}

/**
 * @param {string} root
 * @returns {Record<string, unknown>[]}
 */
export function loadAllSeasonConfigs(root) {
  return listSeasonJsonBasenames(root).map((name) => loadSeasonJsonFile(root, name));
}

/**
 * @param {string} root
 * @param {{ seasonId?: string | null; slug?: string | null; basename?: string | null }} query
 * @returns {{ path: string; config: Record<string, unknown>; basename: string } | null}
 */
export function resolveSeasonConfigFile(root, query = {}) {
  const basenames = listSeasonJsonBasenames(root);
  if (query.basename) {
    const name = basename(String(query.basename));
    if (!basenames.includes(name)) return null;
    return {
      basename: name,
      path: join(root, SEASON_DATA_DIR, name),
      config: loadSeasonJsonFile(root, name),
    };
  }

  for (const name of basenames) {
    const config = loadSeasonJsonFile(root, name);
    if (query.seasonId && config.season_id === query.seasonId) {
      return { basename: name, path: join(root, SEASON_DATA_DIR, name), config };
    }
    if (query.slug) {
      const slug = seasonSlugFromRulesPath(config.rules_path);
      if (slug === query.slug) {
        return { basename: name, path: join(root, SEASON_DATA_DIR, name), config };
      }
    }
  }
  return null;
}

/**
 * Default pilot season path for operator scripts.
 * @param {string} root
 */
export function defaultPilotSeasonPath(root) {
  return join(root, SEASON_DATA_DIR, PILOT_SEASON_BASENAME);
}

/**
 * CLI/env resolution for operator scripts.
 * @param {string} root
 * @param {string[]} argv
 */
export function resolveSeasonPathFromCli(root, argv = process.argv) {
  const seasonIdx = argv.indexOf("--season");
  if (seasonIdx !== -1) {
    const id = argv[seasonIdx + 1]?.trim();
    if (!id) throw new Error("--season requires a season_id argument.");
    const resolved = resolveSeasonConfigFile(root, { seasonId: id });
    if (!resolved) throw new Error(`Unknown season_id: ${id}`);
    return resolved.path;
  }
  const slugIdx = argv.indexOf("--slug");
  if (slugIdx !== -1) {
    const slug = argv[slugIdx + 1]?.trim();
    if (!slug) throw new Error("--slug requires a play slug (e.g. cedar-rapids).");
    const resolved = resolveSeasonConfigFile(root, { slug });
    if (!resolved) throw new Error(`Unknown play slug: ${slug}`);
    return resolved.path;
  }
  if (process.env.CITY_GAME_SEASON_ID?.trim()) {
    const resolved = resolveSeasonConfigFile(root, {
      seasonId: process.env.CITY_GAME_SEASON_ID.trim(),
    });
    if (!resolved) {
      throw new Error(`Unknown CITY_GAME_SEASON_ID: ${process.env.CITY_GAME_SEASON_ID}`);
    }
    return resolved.path;
  }
  return defaultPilotSeasonPath(root);
}
