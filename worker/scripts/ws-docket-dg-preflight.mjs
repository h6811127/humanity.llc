#!/usr/bin/env node
/**
 *   npm run ws-docket:dg-preflight
 *   npm run ws-docket:dg-preflight -- --strict
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assessWsDocketDgPreflight,
  formatWsDocketDgPreflightReport,
} from "./ws-docket-dg-preflight-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const strict = process.argv.includes("--strict");
const report = assessWsDocketDgPreflight(root);
console.log(formatWsDocketDgPreflightReport(report));
if (strict && !report.engineeringMet) process.exit(1);
