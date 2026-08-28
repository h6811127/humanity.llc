#!/usr/bin/env node
/**
 *   npm run ws-docket:qr-preflight
 *   npm run ws-docket:qr-preflight -- --strict
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assessWsDocketQrPreflight,
  formatWsDocketQrPreflight,
} from "./ws-docket-qr-preflight-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const strict = process.argv.includes("--strict");
const report = assessWsDocketQrPreflight(root);
console.log(formatWsDocketQrPreflight(report));
if (strict && !report.engineeringMet) process.exit(1);
