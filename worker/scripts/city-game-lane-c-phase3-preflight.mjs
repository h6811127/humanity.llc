#!/usr/bin/env node
/**
 * Lane C Phase 3 — launch surfaces + C5/E4 engineering preflight (read-only).
 *
 *   npm run city-game:lane-c-phase3-preflight
 *   npm run city-game:lane-c-phase3-preflight -- --expect-applied
 *   npm run city-game:lane-c-phase3-preflight -- --launch-day-ready
 *
 * Does not --apply launch surfaces or edit wrangler.toml.
 *
 * @see docs/CITY_GAME_SUMMER_LANE_C.md § Phase 3
 */
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assessLaneCPhase3,
  formatLaneCPhase3Report,
} from "./city-game-lane-c-phase3-core.mjs";
import {
  INSTALL_QA_REL,
} from "./city-game-install-qa-core.mjs";
import {
  LAUNCH_CHECKLIST_REL,
} from "./city-game-launch-checklist-core.mjs";
import {
  RESEARCH_LAUNCH_PAGE_RELS,
  RULES_PAGE_REL,
} from "./city-game-launch-surfaces-core.mjs";
import { seasonLaunchContext } from "../../site/js/city-game-season-path-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");
const wranglerPath = join(root, "worker/wrangler.toml");

const expectApplied = process.argv.includes("--expect-applied");
const launchDayReady = process.argv.includes("--launch-day-ready");

function readRel(rel) {
  const path = join(root, rel);
  if (!existsSync(path)) {
    throw new Error(`Missing file: ${rel}`);
  }
  return readFileSync(path, "utf8");
}

function main() {
  const season = JSON.parse(readFileSync(seasonPath, "utf8"));
  const launchCtx = seasonLaunchContext(season, basename(seasonPath));
  const rulesHtml = readRel(launchCtx.rulesPageRel ?? RULES_PAGE_REL);
  const researchHtmlByRel = Object.fromEntries(
    RESEARCH_LAUNCH_PAGE_RELS.map((rel) => [rel, readRel(rel)])
  );
  const launchChecklistDoc = existsSync(join(root, LAUNCH_CHECKLIST_REL))
    ? readFileSync(join(root, LAUNCH_CHECKLIST_REL), "utf8")
    : "";
  const installQaDoc = existsSync(join(root, INSTALL_QA_REL))
    ? readFileSync(join(root, INSTALL_QA_REL), "utf8")
    : "";
  const wranglerToml = existsSync(wranglerPath) ? readFileSync(wranglerPath, "utf8") : "";

  const report = assessLaneCPhase3({
    season,
    rulesHtml,
    researchHtmlByRel,
    launchChecklistDoc,
    installQaDoc,
    wranglerToml,
    launchCtx,
    expectApplied,
    launchDayReady,
  });

  console.log(formatLaneCPhase3Report(report, { expectApplied, launchDayReady }));

  /** @type {string[]} */
  const exitBlockers = [...report.engineeringBlockers];
  if (launchDayReady) {
    exitBlockers.push(...report.launchDayBlockers);
  }

  if (exitBlockers.length) {
    process.exit(1);
  }
}

main();
