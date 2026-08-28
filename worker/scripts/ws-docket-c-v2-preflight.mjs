#!/usr/bin/env node
/**
 * WS-DOCKET-C-v2 engineering preflight.
 *
 *   npm run ws-docket:c-v2-preflight
 *   npm run ws-docket:c-v2-preflight -- --strict
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assessDocketCv2Preflight,
  docketCv2EngineeringReady,
  formatDocketCv2PreflightReport,
} from "./ws-docket-c-v2-preflight-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const strict = process.argv.includes("--strict");

const report = assessDocketCv2Preflight(root);
console.log(formatDocketCv2PreflightReport(report));

if (strict && !docketCv2EngineeringReady(report)) {
  process.exit(1);
}
