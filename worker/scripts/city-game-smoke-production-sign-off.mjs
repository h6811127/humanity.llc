#!/usr/bin/env node
/**
 * C4 production scan smoke — operator sign-off recorder.
 *
 *   npm run city-game:smoke-production-sign-off -- --pass --apply
 *   npm run city-game:smoke-production-sign-off -- --pass --apply --nodes node_01,node_04,node_07
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyLaunchChecklistE5Pass,
  LAUNCH_CHECKLIST_REL,
  parseProductionSmokeSignOffArgs,
  productionSmokeSignOffSummaryLines,
  resolveProductionSmokeSignOffResult,
} from "./city-game-smoke-production-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function main() {
  const parsed = parseProductionSmokeSignOffArgs(process.argv.slice(2));
  const result = resolveProductionSmokeSignOffResult(parsed);

  for (const line of productionSmokeSignOffSummaryLines({ ...parsed, result })) {
    console.log(line);
  }

  if (!parsed.apply) {
    console.log("(Dry run — pass --apply to update docs.)");
    return;
  }

  if (result === "pass") {
    const launchPath = join(root, LAUNCH_CHECKLIST_REL);
    let launchDoc = readFileSync(launchPath, "utf8");
    launchDoc = applyLaunchChecklistE5Pass(launchDoc, parsed);
    writeFileSync(launchPath, launchDoc, "utf8");
    console.log("Updated:", LAUNCH_CHECKLIST_REL);
    console.log("\n✅ C4 production scan smoke sign-off recorded (pass).");
    return;
  }

  console.log("\n⚠️  C4 production scan smoke sign-off recorded (fail).");
}

main();
