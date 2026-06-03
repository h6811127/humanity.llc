#!/usr/bin/env node
/**
 * Operator ops sign-off — mark O1, O3, O4 after human confirmation.
 *
 *   npm run city-game:operator-ops-sign-off -- --mark O1 --apply
 *   npm run city-game:operator-ops-sign-off -- --mark O3 O4 --apply
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyCustodyPhaseCGatePass,
  applyLaunchChecklistO1Pass,
  applyLaunchChecklistO3Pass,
  applyLaunchChecklistO4Pass,
  applySupportMacrosO4Pass,
  applyWeekendScheduleO3Pass,
  CUSTODY_REL,
  LAUNCH_CHECKLIST_REL,
  parseOperatorOpsSignOffArgs,
  SUPPORT_MACROS_REL,
  WEEKEND_SCHEDULE_REL,
} from "./city-game-operator-ops-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function main() {
  const parsed = parseOperatorOpsSignOffArgs(process.argv.slice(2));
  if (!parsed.mark.length) {
    console.error("Specify --mark O1, O3, and/or O4");
    process.exit(1);
  }

  console.log(`Operator ops sign-off — ${parsed.mark.join(", ")}\n`);
  console.log(`  Date: ${parsed.dateIso}`);

  if (!parsed.apply) {
    console.log("\n(Dry run — pass --apply to update docs.)");
    return;
  }

  const launchPath = join(root, LAUNCH_CHECKLIST_REL);
  let launchDoc = readFileSync(launchPath, "utf8");

  for (const gate of parsed.mark) {
    if (gate === "O1") {
      const custodyPath = join(root, CUSTODY_REL);
      let custodyDoc = readFileSync(custodyPath, "utf8");
      custodyDoc = applyCustodyPhaseCGatePass(custodyDoc, parsed);
      writeFileSync(custodyPath, custodyDoc, "utf8");
      console.log("Updated:", CUSTODY_REL);
      launchDoc = applyLaunchChecklistO1Pass(launchDoc, parsed);
    } else if (gate === "O3") {
      const schedulePath = join(root, WEEKEND_SCHEDULE_REL);
      let scheduleDoc = readFileSync(schedulePath, "utf8");
      scheduleDoc = applyWeekendScheduleO3Pass(scheduleDoc, parsed);
      writeFileSync(schedulePath, scheduleDoc, "utf8");
      console.log("Updated:", WEEKEND_SCHEDULE_REL);
      launchDoc = applyLaunchChecklistO3Pass(launchDoc, parsed);
    } else if (gate === "O4") {
      const macrosPath = join(root, SUPPORT_MACROS_REL);
      let macrosDoc = readFileSync(macrosPath, "utf8");
      macrosDoc = applySupportMacrosO4Pass(macrosDoc, parsed);
      writeFileSync(macrosPath, macrosDoc, "utf8");
      console.log("Updated:", SUPPORT_MACROS_REL);
      launchDoc = applyLaunchChecklistO4Pass(launchDoc, parsed);
    } else {
      console.error(`Unknown gate: ${gate} (use O1, O3, O4 — O2 via install-map-sign-off)`);
      process.exit(1);
    }
  }

  writeFileSync(launchPath, launchDoc, "utf8");
  console.log("Updated:", LAUNCH_CHECKLIST_REL);
  console.log("\n✅ Operator ops sign-off recorded.");
}

main();
