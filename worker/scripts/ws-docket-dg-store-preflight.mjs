/**
 *   npm run ws-docket:dg-store-preflight [--strict]
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assessWsDocketDgStorePreflight,
  formatWsDocketDgStorePreflightReport,
} from "./ws-docket-dg-store-preflight-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const strict = process.argv.includes("--strict");
const report = assessWsDocketDgStorePreflight(root);
console.log(formatWsDocketDgStorePreflightReport(report));
if (strict && !report.engineeringMet) process.exit(1);
