#!/usr/bin/env node
/**
 *   npm run ws-docket:photo-preflight [--strict]
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assessWsDocketPhotoPreflight,
  formatWsDocketPhotoPreflightReport,
} from "./ws-docket-photo-preflight-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const strict = process.argv.includes("--strict");
const report = assessWsDocketPhotoPreflight(root);
console.log(formatWsDocketPhotoPreflightReport(report));
if (strict && !report.engineeringMet) process.exit(1);
