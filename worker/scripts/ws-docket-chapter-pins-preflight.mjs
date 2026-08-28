#!/usr/bin/env node
/**
 *   npm run ws-docket:chapter-pins-preflight [--strict]
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assessWsDocketChapterPinsPreflight,
  formatWsDocketChapterPinsPreflightReport,
} from "./ws-docket-chapter-pins-preflight-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const strict = process.argv.includes("--strict");
const report = assessWsDocketChapterPinsPreflight(root);
console.log(formatWsDocketChapterPinsPreflightReport(report));
if (strict && !report.engineeringMet) process.exit(1);
