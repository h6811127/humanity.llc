#!/usr/bin/env node
/**
 * SF-3 / GT-8 preflight — network lens engineering + human orientation gate.
 *
 *   npm run city-game:network-lens-preflight
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildMapBoardInnerHtml } from "../../site/js/city-game-map-board-core.mjs";
import {
  assessNetworkLensSf3Ready,
  formatNetworkLensSf3PreflightReport,
} from "./city-game-network-lens-sf3-core.mjs";
import {
  auditGameScanAnalyticsGate,
  SCAN_ANALYTICS_SOURCE_GUARD,
} from "./city-game-scan-analytics-gate-core.mjs";
import { COMPREHENSION_RUNBOOK_REL, MAP_DASHBOARD_REL } from "./city-game-map-board-b13-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const policyPath = join(root, "docs/REFERENCE_OPERATOR_DATA_POLICY.md");

function main() {
  const season = JSON.parse(
    readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
  );
  const boardHtml = buildMapBoardInnerHtml(season);
  const rulesHtml = readFileSync(join(root, "site/play/cedar-rapids/index.html"), "utf8");
  const comprehensionRunbook = readFileSync(join(root, COMPREHENSION_RUNBOOK_REL), "utf8");
  const mapDashboardDoc = readFileSync(join(root, MAP_DASHBOARD_REL), "utf8");

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

  const report = assessNetworkLensSf3Ready({
    season,
    boardHtml,
    rulesHtml,
    b14Ok: b14.ok,
    comprehensionRunbook,
    mapDashboardDoc,
  });

  console.log(formatNetworkLensSf3PreflightReport(report));

  if (!report.engineeringReady) {
    process.exit(1);
  }
}

main();
