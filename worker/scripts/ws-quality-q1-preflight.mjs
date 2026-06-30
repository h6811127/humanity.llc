#!/usr/bin/env node
/**
 * WS-QUALITY Q1 preflight — L1–L8 loop inventory wired to tests + DEVICE_OS_QA.
 *
 *   npm run ws-quality:q1-preflight
 *
 * @see docs/CORE_PRODUCT_LOOP.md § Q1
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assessQualityLoopInventory,
  formatQualityLoopPreflightReport,
} from "./ws-quality-loop-inventory-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const report = assessQualityLoopInventory(
  packageJson.scripts ?? {},
  (rel) => existsSync(join(root, rel)),
  (rel) => readFileSync(join(root, rel), "utf8")
);

console.log(formatQualityLoopPreflightReport(report));
if (!report.engineeringReady) process.exit(1);
