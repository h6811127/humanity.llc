#!/usr/bin/env node
/**
 *   npm run ws-docket:license-pack-preflight [--strict]
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assessWsDocketLicensePackPreflight,
  formatWsDocketLicensePackPreflightReport,
} from "./ws-docket-license-pack-preflight-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const strict = process.argv.includes("--strict");
const report = assessWsDocketLicensePackPreflight(root);
console.log(formatWsDocketLicensePackPreflightReport(report));
if (strict && !report.engineeringMet) process.exit(1);
