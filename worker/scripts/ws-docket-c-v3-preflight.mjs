#!/usr/bin/env node
/**
 *   npm run ws-docket:c-v3-preflight
 *   npm run ws-docket:c-v3-preflight -- --strict
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assessWsDocketCv3Preflight,
  formatWsDocketCv3Preflight,
} from "./ws-docket-c-v3-preflight-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const strict = process.argv.includes("--strict");
const report = assessWsDocketCv3Preflight(root);
console.log(formatWsDocketCv3Preflight(report));
if (strict && !report.engineeringMet) process.exit(1);
