#!/usr/bin/env node
/**
 * WS-CUSTODY C0 preflight — engineering gate before human comprehension study.
 *
 *   npm run custody:phase0-preflight
 *
 * @see docs/CUSTODY_PHASE0_RUNBOOK.md
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  custodyPhase0PreflightPassed,
  runCustodyPhase0PreflightChecks,
} from "./custody-phase0-preflight-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

const checks = runCustodyPhase0PreflightChecks(root);

for (const check of checks) {
  const mark = check.ok ? "☑" : "☐";
  console.log(`${mark} ${check.id}: ${check.detail}`);
}

if (!custodyPhase0PreflightPassed(checks)) {
  console.error("\ncustody:phase0-preflight failed — see docs/CUSTODY_PHASE0_RUNBOOK.md");
  process.exit(1);
}

console.log("\ncustody:phase0-preflight passed — ready for human C0 comprehension (≥5 testers).");
