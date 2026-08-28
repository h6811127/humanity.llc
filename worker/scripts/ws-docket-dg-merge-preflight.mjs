#!/usr/bin/env node
/**
 *   npm run ws-docket:dg-merge-preflight [--strict]
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assessWsDocketDgMergePreflight,
  formatWsDocketDgMergePreflightReport,
} from "./ws-docket-dg-merge-preflight-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const strict = process.argv.includes("--strict");
const report = assessWsDocketDgMergePreflight(root);
console.log(formatWsDocketDgMergePreflightReport(report));
if (strict && !report.engineeringMet) process.exit(1);
