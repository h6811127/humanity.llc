/**
 * H-12 printed QR camera QA — step 2 production smoke (before print).
 *
 * Verifies live scan HTML + challenge POST on production (H-01–H-03 hardening).
 *
 * Usage:
 *   npm run live-control:printed-qa:production-smoke
 *
 * @see docs/M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md § Pre-flight step 2
 * @see docs/LIVE_CONTROL_USABILITY_HARDENING.md § H-12 · H-15
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  smokeProductionLiveControlChallenge,
  smokeProductionScanPage,
} from "./hosted-rollout-scan-smoke.mjs";

/** @returns {string[]} */
export function printedQaPostSmokeChecklist() {
  return [
    "",
    "Manual next steps (pre-flight step 3):",
    "",
    "  npm run live-control:printed-qa:two-device-loop",
    "",
  ];
}

/** @param {string[]} lines */
export function printPrintedQaPostSmokeChecklist(lines = printedQaPostSmokeChecklist()) {
  for (const line of lines) {
    console.log(line);
  }
}

/**
 * @param {{ apiOrigin?: string }} [opts]
 */
export async function runPrintedQaProductionSmoke(opts = {}) {
  const apiOrigin = (opts.apiOrigin || process.env.API_ORIGIN || "https://humanity.llc").replace(
    /\/$/,
    ""
  );

  console.log("H-12 printed QR camera QA — step 2 production smoke");
  console.log("Docs: docs/M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md § Pre-flight\n");

  await smokeProductionScanPage(apiOrigin, { verifyHardening: true });
  await smokeProductionLiveControlChallenge(apiOrigin, { verifyJson: true });

  console.log("\n✅ H-12 production smoke OK (H-01–H-03 on live scan + challenge POST).");
  printPrintedQaPostSmokeChecklist();
}

async function main() {
  await runPrintedQaProductionSmoke();
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isCli) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
