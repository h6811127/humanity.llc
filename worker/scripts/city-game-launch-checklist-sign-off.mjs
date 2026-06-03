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

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

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

  const assessment = assessLaunchChecklistReady({ launchChecklistDoc: content });
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
