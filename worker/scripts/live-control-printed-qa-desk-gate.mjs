/**
 * H-12 printed QR desk gate — engineering steps 1–4 (operator).
 *
 * Chains preflight, optional two-device loop, and print prep before § A–C on phones.
 *
 * Usage:
 *   npm run live-control:printed-qa:desk-gate
 *   npm run live-control:printed-qa:desk-gate -- --skip-e2e
 *   npm run live-control:printed-qa:desk-gate -- --skip-two-device
 *   npm run live-control:printed-qa:desk-gate -- --production-smoke --verify-live
 *
 * @see docs/M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md § Pre-flight
 * @see docs/DEVICE_OS_QA.md § P1-LCP
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runPrintedQaPreflight } from "./live-control-printed-qa-preflight.mjs";
import { runPrintedQaPrintPrep } from "./live-control-printed-qa-print-prep.mjs";
import { runPrintedQaTwoDeviceLoop } from "./live-control-printed-qa-two-device-loop.mjs";

/**
 * @returns {string[]}
 */
export function printedQaDeskGateHumanNextSteps() {
  return [
    "",
    "Human next (≥3 phones, printed QR, stock Camera app):",
    "",
    "  npm run live-control:printed-qa:camera-scorecard",
    "",
    "  Complete § A–C in docs/M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md",
    "",
    "  Sign-off when done:",
    "  npm run live-control:printed-qa:sign-off -- --pass --apply --date YYYY-MM-DD",
    "",
    "Manual QA: docs/DEVICE_OS_QA.md § P1-LCP",
    "",
  ];
}

/**
 * @param {{
 *   skipE2e?: boolean;
 *   skipTwoDevice?: boolean;
 *   productionSmoke?: boolean;
 *   verifyLive?: boolean;
 *   apiOrigin?: string;
 * }} [opts]
 */
export async function runPrintedQaDeskGate(opts = {}) {
  const skipE2e = opts.skipE2e ?? false;
  const skipTwoDevice = opts.skipTwoDevice ?? false;
  const productionSmoke = opts.productionSmoke ?? false;
  const verifyLive = opts.verifyLive ?? false;
  const apiOrigin = (opts.apiOrigin || process.env.API_ORIGIN || "https://humanity.llc").replace(
    /\/$/,
    ""
  );

  console.log("H-12 printed QR camera QA — desk gate (engineering steps 1–4)");
  console.log("Docs: docs/M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md § Pre-flight\n");

  await runPrintedQaPreflight({ skipE2e, productionSmoke, apiOrigin });

  if (!skipTwoDevice) {
    runPrintedQaTwoDeviceLoop({ skipE2e, apiOrigin });
  } else {
    console.log("\n⏭  Skipped step 3 two-device loop (--skip-two-device)");
  }

  await runPrintedQaPrintPrep({ apiOrigin, verifyLive });

  console.log("\n✅ H-12 desk gate OK (engineering pre-flight complete).");
  for (const line of printedQaDeskGateHumanNextSteps()) {
    console.log(line);
  }
}

async function main() {
  const skipE2e = process.argv.includes("--skip-e2e");
  const skipTwoDevice = process.argv.includes("--skip-two-device");
  const productionSmoke = process.argv.includes("--production-smoke");
  const verifyLive = process.argv.includes("--verify-live");
  await runPrintedQaDeskGate({ skipE2e, skipTwoDevice, productionSmoke, verifyLive });
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isCli) {
  void main();
}
