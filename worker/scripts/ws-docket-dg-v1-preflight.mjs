#!/usr/bin/env node
/**
 *   npm run ws-docket:dg-v1-preflight
 *   npm run ws-docket:dg-v1-preflight -- --strict
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assessWsDocketDgV1Preflight,
  formatWsDocketDgV1Preflight,
} from "./ws-docket-dg-v1-preflight-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const strict = process.argv.includes("--strict");
const report = await assessWsDocketDgV1Preflight(root);
console.log(formatWsDocketDgV1Preflight(report));
if (strict && !report.engineeringMet) process.exit(1);
