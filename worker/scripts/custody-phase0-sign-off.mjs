#!/usr/bin/env node
/**
 * WS-CUSTODY C0 comprehension — operator sign-off recorder.
 *
 *   npm run custody:phase0-sign-off -- --pass --apply --testers 5 --pass-count 5
 *   npm run custody:phase0-sign-off -- --pass --apply --drops "4:Safari,5:comprehension" --decision proceed-c1
 *   npm run custody:phase0-sign-off -- --fail
 *
 * @see docs/CUSTODY_PHASE0_RUNBOOK.md § Sign-off
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyCustodyEasyModePhase0Pass,
  applyCustodyPhase0RunbookPass,
  applyProductWorkstreamCustodyPhase0Pass,
  CUSTODY_EASY_MODE_REL,
  CUSTODY_PHASE0_RUNBOOK_REL,
  custodyPhase0SignOffSummaryLines,
  parseCustodyPhase0SignOffArgs,
  PRODUCT_WORKSTREAM_REL,
  resolveCustodyPhase0SignOffResult,
} from "./custody-phase0-sign-off-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function main() {
  const parsed = parseCustodyPhase0SignOffArgs(process.argv.slice(2));
  const result = resolveCustodyPhase0SignOffResult(parsed);

  for (const line of custodyPhase0SignOffSummaryLines({ ...parsed, result })) {
    console.log(line);
  }

  if (!parsed.apply) {
    console.log("(Dry run — add --apply to update docs.)");
    return;
  }

  if (result === "pass") {
    const runbookPath = join(root, CUSTODY_PHASE0_RUNBOOK_REL);
    writeFileSync(
      runbookPath,
      applyCustodyPhase0RunbookPass(readFileSync(runbookPath, "utf8"), parsed),
      "utf8"
    );
    console.log("Updated:", CUSTODY_PHASE0_RUNBOOK_REL);

    const easyPath = join(root, CUSTODY_EASY_MODE_REL);
    writeFileSync(
      easyPath,
      applyCustodyEasyModePhase0Pass(readFileSync(easyPath, "utf8"), parsed),
      "utf8"
    );
    console.log("Updated:", CUSTODY_EASY_MODE_REL);

    const workstreamPath = join(root, PRODUCT_WORKSTREAM_REL);
    writeFileSync(
      workstreamPath,
      applyProductWorkstreamCustodyPhase0Pass(readFileSync(workstreamPath, "utf8"), parsed),
      "utf8"
    );
    console.log("Updated:", PRODUCT_WORKSTREAM_REL);

    console.log("\n✅ WS-CUSTODY C0 sign-off recorded (pass). Next: C1 device_unlock MVP.");
    return;
  }

  console.log("\n⚠️  WS-CUSTODY C0 sign-off recorded (fail). Extend C0 copy/UX before C1.");
}

main();
