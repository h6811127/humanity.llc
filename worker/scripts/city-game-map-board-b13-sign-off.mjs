#!/usr/bin/env node
/**
 * B13 human sign-off — privacy review row + launch checklist P6 (when gates met).
 *
 *   npm run city-game:map-board-b13-sign-off -- --pass --apply
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyLaunchChecklistP6Pass,
  applyMapDashboardB13PrivacyPass,
  assessMapBoardB13Ready,
  COMPREHENSION_RUNBOOK_REL,
  MAP_DASHBOARD_REL,
} from "./city-game-map-board-b13-core.mjs";
import { LAUNCH_CHECKLIST_REL } from "./city-game-launch-checklist-core.mjs";
import {
  auditGameScanAnalyticsGate,
  SCAN_ANALYTICS_SOURCE_GUARD,
} from "./city-game-scan-analytics-gate-core.mjs";
import { RESEARCH_LAUNCH_PAGE_RELS } from "./city-game-launch-surfaces-core.mjs";
import { surfacesMarketLiveCityBoard } from "./city-game-map-board-b13-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const rulesPath = join(root, "site/play/cedar-rapids/index.html");
const policyPath = join(root, "docs/REFERENCE_OPERATOR_DATA_POLICY.md");

function parseArgs(argv) {
  const pass = argv.includes("--pass");
  const fail = argv.includes("--fail");
  const apply = argv.includes("--apply");
  let dateIso = new Date().toISOString().slice(0, 10);
  let reviewer = "";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--date" && argv[i + 1]) dateIso = argv[++i];
    if (argv[i] === "--reviewer" && argv[i + 1]) reviewer = argv[++i];
  }
  return { pass, fail, apply, dateIso, reviewer };
}

function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.pass && parsed.fail) {
    console.error("Use only one of --pass or --fail");
    process.exit(1);
  }
  if (!parsed.pass && !parsed.fail) {
    console.error("Specify --pass or --fail");
    process.exit(1);
  }

  const rulesHtml = readFileSync(rulesPath, "utf8");
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
    policyMarkdown: readFileSync(policyPath, "utf8"),
    sourceByRel,
  });

  const marketsLiveCityBoard = surfacesMarketLiveCityBoard({
    rulesHtml,
    researchHtmlByRel,
  });

  const runbook = readFileSync(join(root, COMPREHENSION_RUNBOOK_REL), "utf8");
  const b13 = assessMapBoardB13Ready({
    marketsLiveCityBoard,
    b14Ok: b14.ok,
    comprehensionRunbook: runbook,
    mapDashboardDoc: readFileSync(join(root, MAP_DASHBOARD_REL), "utf8"),
    launchChecklistDoc: readFileSync(join(root, LAUNCH_CHECKLIST_REL), "utf8"),
  });

  if (!marketsLiveCityBoard) {
    console.log("Live city board not marketed — B13 sign-off not required.");
    return;
  }

  if (parsed.fail) {
    console.log("B13 sign-off recorded (fail). Fix GT-7 / privacy before launch.");
    return;
  }

  if (!b13.gt7.met || !b13.b14Ok) {
    console.error("Cannot sign B13 — gates not met:");
    for (const issue of b13.issues) console.error(`  ✗ ${issue}`);
    process.exit(1);
  }

  console.log("B13 map board sign-off (pass)");
  console.log(`  GT-7: ${b13.gt7.passCount}/${b13.gt7.required} testers`);
  console.log(`  B14: ${b13.b14Ok ? "☑" : "☐"}`);

  if (!parsed.apply) {
    console.log("(Dry run — add --apply to update docs.)");
    return;
  }

  const mapPath = join(root, MAP_DASHBOARD_REL);
  writeFileSync(
    mapPath,
    applyMapDashboardB13PrivacyPass(readFileSync(mapPath, "utf8"), {
      dateIso: parsed.dateIso,
      detail: parsed.reviewer || "GT-7 + snapshot JSON review",
    }),
    "utf8"
  );
  console.log("Updated:", MAP_DASHBOARD_REL);

  const launchPath = join(root, LAUNCH_CHECKLIST_REL);
  writeFileSync(
    launchPath,
    applyLaunchChecklistP6Pass(readFileSync(launchPath, "utf8"), { dateIso: parsed.dateIso }),
    "utf8"
  );
  console.log("Updated:", LAUNCH_CHECKLIST_REL);
  console.log("\n✅ B13 + P6 recorded.");
}

main();
