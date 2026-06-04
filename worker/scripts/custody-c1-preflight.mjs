#!/usr/bin/env node
/**
 * WS-CUSTODY C1/C2 engineering preflight.
 *
 *   npm run custody:c1-preflight
 *
 * @see docs/CUSTODY_EASY_MODE.md
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  custodyC1PreflightPassed,
  runCustodyC1PreflightChecks,
} from "./custody-c1-preflight-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

const checks = runCustodyC1PreflightChecks(root);

for (const check of checks) {
  const mark = check.ok ? "☑" : "☐";
  console.log(`${mark} ${check.id}: ${check.detail}`);
}

if (!custodyC1PreflightPassed(checks)) {
  console.error("\ncustody:c1-preflight failed — see docs/CUSTODY_EASY_MODE.md");
  process.exit(1);
}

console.log("\ncustody:c1-preflight passed — device_unlock MVP surfaces wired.");
