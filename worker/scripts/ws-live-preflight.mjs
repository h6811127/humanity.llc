#!/usr/bin/env node
/**
 * WS-LIVE engineering preflight — five-layer stack + LO-1–LO-5 status.
 *
 *   npm run ws-live:preflight
 *   npm run ws-live:preflight -- --strict   # exit 1 if engineering gates fail
 *
 * @see docs/PRODUCT_WORKSTREAM_COORDINATION.md § WS-LIVE
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assessWsLivePreflight,
  formatWsLivePreflightReport,
  wsLiveEngineeringReady,
} from "./ws-live-preflight-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const strict = process.argv.includes("--strict");

const report = assessWsLivePreflight(root);
console.log(formatWsLivePreflightReport(report));

if (strict && !wsLiveEngineeringReady(report)) {
  process.exit(1);
}
