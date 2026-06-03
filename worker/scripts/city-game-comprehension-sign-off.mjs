#!/usr/bin/env node
/**
 * C2 GT comprehension — operator sign-off recorder.
 *
 *   npm run city-game:comprehension-sign-off -- --pass --apply --testers 5 --pass-count 5
 *   npm run city-game:comprehension-sign-off -- --fail
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyComprehensionRunbookPass,
  applyInstallQaComprehensionPass,
  applyLaunchChecklistP1Pass,
  COMPREHENSION_RUNBOOK_REL,
  comprehensionSignOffSummaryLines,
  INSTALL_QA_REL,
  LAUNCH_CHECKLIST_REL,
  parseComprehensionSignOffArgs,
  resolveComprehensionSignOffResult,
} from "./city-game-comprehension-sign-off-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function main() {
  const parsed = parseComprehensionSignOffArgs(process.argv.slice(2));
  const result = resolveComprehensionSignOffResult(parsed);

  for (const line of comprehensionSignOffSummaryLines({ ...parsed, result })) {
    console.log(line);
  }

  if (!parsed.apply) {
    console.log("(Dry run — add --apply to update docs.)");
    return;
  }

  if (result === "pass") {
    const runbookPath = join(root, COMPREHENSION_RUNBOOK_REL);
    writeFileSync(
      runbookPath,
      applyComprehensionRunbookPass(readFileSync(runbookPath, "utf8"), parsed),
      "utf8"
    );
    console.log("Updated:", COMPREHENSION_RUNBOOK_REL);

    const installPath = join(root, INSTALL_QA_REL);
    writeFileSync(
      installPath,
      applyInstallQaComprehensionPass(readFileSync(installPath, "utf8"), parsed),
      "utf8"
    );
    console.log("Updated:", INSTALL_QA_REL);

    const launchPath = join(root, LAUNCH_CHECKLIST_REL);
    writeFileSync(
      launchPath,
      applyLaunchChecklistP1Pass(readFileSync(launchPath, "utf8"), parsed),
      "utf8"
    );
    console.log("Updated:", LAUNCH_CHECKLIST_REL);

    console.log("\n✅ C2 comprehension sign-off recorded (pass).");
    return;
  }

  console.log("\n⚠️  C2 comprehension sign-off recorded (fail). Fix copy before launch.");
}

main();
