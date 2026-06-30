#!/usr/bin/env node
/**
 * SF-3 / GT-8 human sign-off — records orientation gate in map dashboard doc.
 *
 *   npm run city-game:network-lens-sign-off -- --pass --apply --reviewer "Name"
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildMapBoardInnerHtml } from "../../site/js/city-game-map-board-core.mjs";
import {
  applyMapDashboardSf3Gt8Pass,
  assessNetworkLensSf3Ready,
} from "./city-game-network-lens-sf3-core.mjs";
import {
  auditGameScanAnalyticsGate,
  SCAN_ANALYTICS_SOURCE_GUARD,
} from "./city-game-scan-analytics-gate-core.mjs";
import { COMPREHENSION_RUNBOOK_REL, MAP_DASHBOARD_REL } from "./city-game-map-board-b13-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
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

  const season = JSON.parse(
    readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
  );
  const boardHtml = buildMapBoardInnerHtml(season);
  const rulesHtml = readFileSync(join(root, "site/play/cedar-rapids/index.html"), "utf8");
  const runbook = readFileSync(join(root, COMPREHENSION_RUNBOOK_REL), "utf8");
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
    comprehensionRunbook: runbook,
    mapDashboardDoc,
  });

  if (parsed.fail) {
    console.log("SF-3 GT-8 sign-off recorded (fail). Fix orientation before marketing centerpiece.");
    return;
  }

  if (!report.engineeringReady) {
    console.error("Cannot sign SF-3 — engineering blockers:");
    for (const issue of report.issues) console.error(`  ✗ ${issue}`);
    process.exit(1);
  }

  if (!report.gt8.met) {
    console.error(
      `Cannot sign GT-8 — ${report.gt8.passCount}/${report.gt8.required} of ${report.gt8.cohort} testers ☑ in ${COMPREHENSION_RUNBOOK_REL} § Per-tester log`
    );
    process.exit(1);
  }

  console.log("SF-3 / GT-8 network lens sign-off (pass)");
  console.log(`  GT-8: ${report.gt8.passCount}/${report.gt8.cohort} testers`);
  console.log(`  Engineering: ☑`);

  if (!parsed.apply) {
    console.log("(Dry run — add --apply to update docs.)");
    return;
  }

  const mapPath = join(root, MAP_DASHBOARD_REL);
  writeFileSync(
    mapPath,
    applyMapDashboardSf3Gt8Pass(readFileSync(mapPath, "utf8"), {
      dateIso: parsed.dateIso,
      detail: parsed.reviewer || `${report.gt8.passCount}/${report.gt8.cohort} testers`,
    }),
    "utf8"
  );
  console.log("Updated:", MAP_DASHBOARD_REL);
  console.log("\n✅ SF-3 GT-8 recorded. B13 centerpiece unblocked pending GT-7 + privacy review.");
}

main();
