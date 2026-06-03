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
  comprehensionProductionPageRel,
  formatComprehensionPreflightReport,
  LOCAL_DEV_COMPREHENSION_REL,
  productionScanProfileId,
} from "./city-game-comprehension-kit-core.mjs";

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
    productionPageHtml: readOptional(productionRel),
    productionScanProfileId: productionSeed ? productionScanProfileId(productionSeed) : null,
  });
  const runbook = existsSync(runbookPath) ? readFileSync(runbookPath, "utf8") : "";

  console.log(
    formatComprehensionPreflightReport({
      ...c2,
      humanSignedOff: humanSignedOff(runbook),
    })
  );

  if (!c2.ready) {
    process.exit(1);
  }
}

main();
