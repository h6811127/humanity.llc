#!/usr/bin/env node
/**
 * C5 launch checklist preflight — P1–P5 + O1–O4 gate status.
 *
 *   npm run city-game:launch-checklist-preflight
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assessLaunchChecklistReady,
  formatLaunchChecklistPreflightReport,
  LAUNCH_CHECKLIST_REL,
} from "./city-game-launch-checklist-core.mjs";
import {
  assessMapBoardB13Ready,
  COMPREHENSION_RUNBOOK_REL,
  MAP_DASHBOARD_REL,
  surfacesMarketLiveCityBoard,
} from "./city-game-map-board-b13-core.mjs";
import {
  auditGameScanAnalyticsGate,
  SCAN_ANALYTICS_SOURCE_GUARD,
} from "./city-game-scan-analytics-gate-core.mjs";
import { RESEARCH_LAUNCH_PAGE_RELS } from "./city-game-launch-surfaces-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function main() {
  const checklistPath = join(root, LAUNCH_CHECKLIST_REL);
  const launchChecklistDoc = existsSync(checklistPath) ? readFileSync(checklistPath, "utf8") : "";
  const rulesHtml = readFileSync(join(root, "site/play/cedar-rapids/index.html"), "utf8");
  const researchHtmlByRel = Object.fromEntries(
    RESEARCH_LAUNCH_PAGE_RELS.map((rel) => [rel, readFileSync(join(root, rel), "utf8")])
  );
  const sourceByRel = Object.fromEntries(
    [
      ...SCAN_ANALYTICS_SOURCE_GUARD.map((row) => row.rel),
      "worker/src/resolver/game-contribute.ts",
    ].map((rel) => [rel, readFileSync(join(root, rel), "utf8")])
  );
  const b14 = auditGameScanAnalyticsGate({
    policyMarkdown: readFileSync(join(root, "docs/REFERENCE_OPERATOR_DATA_POLICY.md"), "utf8"),
    sourceByRel,
  });
  const marketsLiveCityBoard = surfacesMarketLiveCityBoard({
    rulesHtml,
    researchHtmlByRel,
  });
  const mapBoardB13 = assessMapBoardB13Ready({
    marketsLiveCityBoard,
    b14Ok: b14.ok,
    comprehensionRunbook: readFileSync(join(root, COMPREHENSION_RUNBOOK_REL), "utf8"),
    mapDashboardDoc: readFileSync(join(root, MAP_DASHBOARD_REL), "utf8"),
    launchChecklistDoc,
  });

  const c5 = assessLaunchChecklistReady({
    launchChecklistDoc,
    scanAnalyticsGateOk: b14.ok,
    marketsLiveCityBoard,
    mapBoardB13Ready: mapBoardB13.ready,
  });

  console.log(formatLaunchChecklistPreflightReport(c5));

  if (!c5.readyForLaunchDay) {
    process.exit(1);
  }
}

main();
