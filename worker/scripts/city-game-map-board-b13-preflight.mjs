#!/usr/bin/env node
/**
 * B13 / P6 preflight — live city board marketing vs GT-7 + privacy + B14.
 *
 *   npm run city-game:map-board-b13-preflight
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assessMapBoardB13Ready,
  COMPREHENSION_RUNBOOK_REL,
  formatMapBoardB13PreflightReport,
  MAP_DASHBOARD_REL,
  surfacesMarketLiveCityBoard,
} from "./city-game-map-board-b13-core.mjs";
import { LAUNCH_CHECKLIST_REL } from "./city-game-launch-checklist-core.mjs";
import {
  auditGameScanAnalyticsGate,
  SCAN_ANALYTICS_SOURCE_GUARD,
} from "./city-game-scan-analytics-gate-core.mjs";
import { RESEARCH_LAUNCH_PAGE_RELS } from "./city-game-launch-surfaces-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const rulesPath = join(root, "site/play/cedar-rapids/index.html");
const policyPath = join(root, "docs/REFERENCE_OPERATOR_DATA_POLICY.md");

function main() {
  const rulesHtml = readFileSync(rulesPath, "utf8");
  const researchHtmlByRel = Object.fromEntries(
    RESEARCH_LAUNCH_PAGE_RELS.filter((rel) => {
      try {
        readFileSync(join(root, rel));
        return true;
      } catch {
        return false;
      }
    }).map((rel) => [rel, readFileSync(join(root, rel), "utf8")])
  );

  const sourceByRel = Object.fromEntries(
    [
      ...SCAN_ANALYTICS_SOURCE_GUARD.map((row) => row.rel),
      "worker/src/resolver/game-contribute.ts",
    ].map((rel) => [rel, readFileSync(join(root, rel), "utf8")])
  );
  const b14 = auditGameScanAnalyticsGate({
    policyMarkdown: readFileSync(policyPath, "utf8"),
    sourceByRel,
  });

  const marketsLiveCityBoard = surfacesMarketLiveCityBoard({
    rulesHtml,
    researchHtmlByRel,
  });

  const b13 = assessMapBoardB13Ready({
    marketsLiveCityBoard,
    b14Ok: b14.ok,
    comprehensionRunbook: readFileSync(join(root, COMPREHENSION_RUNBOOK_REL), "utf8"),
    mapDashboardDoc: readFileSync(join(root, MAP_DASHBOARD_REL), "utf8"),
    launchChecklistDoc: readFileSync(join(root, LAUNCH_CHECKLIST_REL), "utf8"),
  });

  console.log(formatMapBoardB13PreflightReport(b13));

  if (b13.required && !b13.ready) {
    process.exit(1);
  }
}

main();
