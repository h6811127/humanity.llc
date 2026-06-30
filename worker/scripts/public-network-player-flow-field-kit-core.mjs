/**
 * Agent D player flow field walk kit — script helpers.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildPlayerFlowFieldWalkKitHtml,
  LOCAL_DEV_PLAYER_FLOW_FIELD_WALK_REL,
  PLAYER_FLOW_FIELD_MIN_STRANGERS,
  PLAYER_FLOW_FIELD_WALK_COMPREHENSION_BASENAME,
  playerFlowRelativeUrlsForSeason,
  playerFlowUrlsForSeason,
  validatePlayerFlowFieldWalkKitHtml,
} from "../../site/js/public-network-player-flow-field-kit-core.mjs";
import { seasonSlugFromRulesPath } from "../../site/js/city-game-season-path-shared.mjs";

export const CR_SEASON_REL = "site/data/city-game-cr-season-01.json";

/**
 * @param {string} rootDir
 * @param {{ requireProduction?: boolean }} [opts]
 */
export function assessPlayerFlowFieldKitReady(rootDir, opts = {}) {
  const issues = [];
  const devPath = join(rootDir, LOCAL_DEV_PLAYER_FLOW_FIELD_WALK_REL);
  if (!existsSync(devPath)) {
    issues.push(`missing ${LOCAL_DEV_PLAYER_FLOW_FIELD_WALK_REL}`);
  } else {
    const html = readFileSync(devPath, "utf8");
    issues.push(...validatePlayerFlowFieldWalkKitHtml(html).issues);
  }

  if (opts.requireProduction) {
    const season = JSON.parse(readFileSync(join(rootDir, CR_SEASON_REL), "utf8"));
    const slug = seasonSlugFromRulesPath(String(season.rules_path ?? "")) ?? "cedar-rapids";
    const prodRel = join(
      "site/play",
      slug,
      "comprehension",
      PLAYER_FLOW_FIELD_WALK_COMPREHENSION_BASENAME
    );
    const prodPath = join(rootDir, prodRel);
    if (!existsSync(prodPath)) {
      issues.push(`missing ${prodRel}`);
    } else {
      const html = readFileSync(prodPath, "utf8");
      issues.push(...validatePlayerFlowFieldWalkKitHtml(html).issues);
    }
  }

  return {
    ready: issues.length === 0,
    issues,
    minStrangers: PLAYER_FLOW_FIELD_MIN_STRANGERS,
    kitRel: LOCAL_DEV_PLAYER_FLOW_FIELD_WALK_REL,
  };
}

/**
 * @param {string} rootDir
 * @param {{ production?: boolean }} [opts]
 */
export function buildPlayerFlowFieldKitHtml(rootDir, opts = {}) {
  const season = JSON.parse(readFileSync(join(rootDir, CR_SEASON_REL), "utf8"));
  const production = opts.production === true;
  const urls = playerFlowRelativeUrlsForSeason(season);
  return buildPlayerFlowFieldWalkKitHtml({ urls, production });
}
