#!/usr/bin/env node
/**
 * B13 privacy engineering preflight — snapshot shape + public surface copy.
 *
 *   npm run city-game:map-board-privacy-preflight
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildMapBoardInnerHtml } from "../../site/js/city-game-map-board-core.mjs";
import { comprehensionProductionPageRel } from "./city-game-comprehension-kit-core.mjs";
import {
  auditMapBoardPrivacyEngineering,
  formatMapBoardPrivacyPreflightReport,
} from "./city-game-map-board-privacy-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readOptional(rel) {
  try {
    return readFileSync(join(root, rel), "utf8");
  } catch {
    return null;
  }
}

function main() {
  const season = JSON.parse(
    readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
  );
  const snapshotFixture = JSON.parse(
    readFileSync(
      join(root, "worker/tests/fixtures/city-game-snapshot-empty-board.json"),
      "utf8"
    )
  );
  const boardHtml = buildMapBoardInnerHtml(season);
  const rulesHtml = readFileSync(join(root, "site/play/cedar-rapids/index.html"), "utf8");
  const comprehensionRel = comprehensionProductionPageRel(season);
  const comprehensionHtml = readOptional(comprehensionRel);

  const audit = auditMapBoardPrivacyEngineering({
    snapshot: snapshotFixture,
    rulesHtml,
    boardHtml,
    comprehensionHtml,
  });

  console.log(formatMapBoardPrivacyPreflightReport(audit));
  if (!audit.ok) process.exit(1);
}

main();
