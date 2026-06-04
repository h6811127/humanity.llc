#!/usr/bin/env node
/**
 * C5 launch checklist — operator sign-off recorder.
 *
 *   npm run city-game:launch-checklist-sign-off -- --mark O1 O2 O3 O4 --apply
 *   npm run city-game:launch-checklist-sign-off -- --pass --apply --commander "Name"
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyLaunchChecklistC5Pass,
  applyLaunchChecklistRowPass,
  assessLaunchChecklistReady,
  LAUNCH_CHECKLIST_REL,
  launchChecklistSignOffSummaryLines,
  parseLaunchChecklistSignOffArgs,
  resolveLaunchChecklistSignOffResult,
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

function loadB13Context(checklistDoc) {
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
    launchChecklistDoc: checklistDoc,
  });
  return { marketsLiveCityBoard, mapBoardB13 };
}

function main() {
  const parsed = parseLaunchChecklistSignOffArgs(process.argv.slice(2));
  const result = resolveLaunchChecklistSignOffResult(parsed);

  for (const line of launchChecklistSignOffSummaryLines({ ...parsed, result })) {
    console.log(line);
  }

  if (!parsed.apply) {
    console.log("(Dry run — pass --apply to update docs.)");
    return;
  }

  const checklistPath = join(root, LAUNCH_CHECKLIST_REL);
  let content = readFileSync(checklistPath, "utf8");

  if (result === "mark") {
    const { marketsLiveCityBoard, mapBoardB13 } = loadB13Context(content);
    if (parsed.mark.includes("P6") && marketsLiveCityBoard && !mapBoardB13.ready) {
      console.error("\nCannot mark P6 — B13 not ready:");
      for (const issue of mapBoardB13.issues) console.error(`  ✗ ${issue}`);
      process.exit(1);
    }
    for (const gate of parsed.mark) {
      content = applyLaunchChecklistRowPass(content, gate, {
        dateIso: parsed.dateIso,
        detail: parsed.commander || undefined,
      });
    }
    writeFileSync(checklistPath, content, "utf8");
    console.log("Updated:", LAUNCH_CHECKLIST_REL);
    console.log(`\n✅ Marked ${parsed.mark.join(", ")} on launch checklist.`);
    return;
  }

  if (result === "fail") {
    console.log("\n⚠️  C5 launch checklist sign-off recorded (fail).");
    return;
  }

  const { marketsLiveCityBoard, mapBoardB13 } = loadB13Context(content);
  const assessment = assessLaunchChecklistReady({
    launchChecklistDoc: content,
    marketsLiveCityBoard,
    mapBoardB13Ready: mapBoardB13.ready,
  });
  if (!assessment.allRequiredSigned) {
    console.error("\nCannot sign C5 — pending gates:", assessment.pending.join(", "));
    console.error("Run npm run city-game:launch-checklist-preflight");
    process.exit(1);
  }

  content = applyLaunchChecklistC5Pass(content, parsed);
  writeFileSync(checklistPath, content, "utf8");
  console.log("Updated:", LAUNCH_CHECKLIST_REL);
  console.log("\n✅ C5 launch checklist signed — launch-day may proceed.");
}

main();
