#!/usr/bin/env node
/**
 * C2 engineering preflight — comprehension kit ready for human testers.
 *
 *   npm run city-game:comprehension-preflight
 *
 * Does not record human sign-off (use city-game:comprehension-sign-off after ≥5 pass).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assessComprehensionEngineeringReady,
  comprehensionGt8FieldWalkPageRel,
  comprehensionDualGateWalkPageRel,
  comprehensionPlayerFlowFieldWalkPageRel,
  comprehensionProductionPageRel,
  formatComprehensionPreflightReport,
  LOCAL_DEV_COMPREHENSION_REL,
  productionScanProfileId,
} from "./city-game-comprehension-kit-core.mjs";
import { LOCAL_DEV_GT8_FIELD_WALK_REL } from "./city-game-network-lens-gt8-field-kit-core.mjs";
import { LOCAL_DEV_PLAYER_FLOW_FIELD_WALK_REL } from "../../site/js/public-network-player-flow-field-kit-core.mjs";
import {
  comprehensionGt7GateMet,
  comprehensionGt8GateMet,
  surfacesMarketLiveCityBoard,
} from "./city-game-map-board-b13-core.mjs";
import { RESEARCH_LAUNCH_PAGE_RELS } from "./city-game-launch-surfaces-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");
const seedPath = join(root, "worker/.local/city-game-seed.json");
const runbookPath = join(root, "docs/CITY_GAME_COMPREHENSION_RUNBOOK.md");

function readOptional(rel) {
  const path = join(root, rel);
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf8");
}

function humanSignedOff(runbook) {
  return (
    runbook.includes("GT comprehension **passed**") ||
    runbook.includes("| Result | ☑ Pass")
  );
}

function main() {
  const season = JSON.parse(readFileSync(seasonPath, "utf8"));
  const productionRel = comprehensionProductionPageRel(season);
  let productionSeed = null;
  if (existsSync(join(root, "worker/.local/city-game-production-seed.json"))) {
    productionSeed = JSON.parse(
      readFileSync(join(root, "worker/.local/city-game-production-seed.json"), "utf8")
    );
  }
  const c2 = assessComprehensionEngineeringReady({
    season,
    localSeed: existsSync(seedPath),
    localDevPageHtml: readOptional(LOCAL_DEV_COMPREHENSION_REL),
    localFieldWalkHtml: readOptional(LOCAL_DEV_GT8_FIELD_WALK_REL),
    localPlayerFlowWalkHtml: readOptional(LOCAL_DEV_PLAYER_FLOW_FIELD_WALK_REL),
    productionPageHtml: readOptional(productionRel),
    productionFieldWalkHtml: readOptional(comprehensionGt8FieldWalkPageRel(season)),
    productionPlayerFlowWalkHtml: readOptional(comprehensionPlayerFlowFieldWalkPageRel(season)),
    productionDualGateWalkHtml: readOptional(comprehensionDualGateWalkPageRel(season)),
    productionScanProfileId: productionSeed ? productionScanProfileId(productionSeed) : null,
  });
  const runbook = existsSync(runbookPath) ? readFileSync(runbookPath, "utf8") : "";
  const rulesHtml = readFileSync(join(root, "site/play/cedar-rapids/index.html"), "utf8");
  const researchHtmlByRel = Object.fromEntries(
    RESEARCH_LAUNCH_PAGE_RELS.map((rel) => [rel, readFileSync(join(root, rel), "utf8")])
  );
  const marketsLiveCityBoard = surfacesMarketLiveCityBoard({
    rulesHtml,
    researchHtmlByRel,
  });
  const gt7 = comprehensionGt7GateMet(runbook);
  const gt8 = comprehensionGt8GateMet(runbook);
  const c2Report = { ...c2, humanSignedOff: humanSignedOff(runbook), warnings: [...c2.warnings] };
  if (marketsLiveCityBoard && !gt7.met) {
    c2Report.warnings.push(
      `GT-7 required for live board (B13): ${gt7.passCount}/${gt7.required} testers ☑ in per-tester log`
    );
  }

  console.log(formatComprehensionPreflightReport(c2Report));
  if (marketsLiveCityBoard) {
    console.log("");
    console.log(
      `B13 GT-7: ${gt7.met ? "☑" : "☐"} ${gt7.passCount}/${gt7.required} · npm run city-game:map-board-b13-preflight`
    );
  }
  console.log("");
  console.log(
    `SF-3 GT-8: ${gt8.met ? "☑" : "☐"} ${gt8.passCount}/${gt8.required} of ${gt8.cohort} · npm run city-game:network-lens-preflight`
  );

  if (!c2.ready) {
    process.exit(1);
  }
}

main();
