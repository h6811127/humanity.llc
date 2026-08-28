/**
 *   npm run ws-docket:chapter-mint-preflight [--strict]
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assessWsDocketChapterMintPreflight,
  formatWsDocketChapterMintPreflightReport,
} from "./ws-docket-chapter-mint-preflight-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const strict = process.argv.includes("--strict");
const report = assessWsDocketChapterMintPreflight(root);
console.log(formatWsDocketChapterMintPreflightReport(report));
if (strict && !report.engineeringMet) process.exit(1);
