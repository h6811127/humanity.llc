/**
 * H-12 printed QR camera QA — step 1 operator preflight (desk).
 *
 * Runs automated desk gates before printing and ≥3-phone camera QA.
 *
 * Usage:
 *   npm run live-control:printed-qa:preflight
 *   npm run live-control:printed-qa:preflight -- --skip-e2e
 *   npm run live-control:printed-qa:preflight -- --production-smoke
 *
 * @see docs/M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md § Pre-flight
 * @see docs/LIVE_CONTROL_USABILITY_HARDENING.md § H-12
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runPrintedQaProductionSmoke } from "./live-control-printed-qa-production-smoke.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

/** @param {string[]} lines */
export function printPrintedQaChecklist(lines = printedQaManualChecklist()) {
  for (const line of lines) {
    console.log(line);
  }
}

/** @returns {string[]} */
export function printedQaManualChecklist() {
  return [
    "",
    "Manual next steps (pre-flight step 3):",
    "",
    "  npm run live-control:printed-qa:two-device-loop",
    "",
    "  Then steps 4–5: print QR → § A–C on ≥3 phones (docs/M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md).",
    "",
    "Manual QA entry: docs/DEVICE_OS_QA.md § P1-LCP",
    "",
  ];
}

/**
 * @param {string} label
 * @param {string[]} args
 */
function runNpm(label, args) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync("npm", args, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

/**
 * @param {{ skipE2e?: boolean; productionSmoke?: boolean; apiOrigin?: string }} [opts]
 */
export async function runPrintedQaPreflight(opts = {}) {
  const skipE2e = opts.skipE2e ?? false;
  const productionSmoke = opts.productionSmoke ?? false;
  const apiOrigin = (opts.apiOrigin || process.env.API_ORIGIN || "https://humanity.llc").replace(
    /\/$/,
    ""
  );

  console.log("H-12 printed QR camera QA — step 1 desk preflight");
  console.log("Docs: docs/M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md § Pre-flight\n");

  runNpm("Desk regression (Vitest)", ["run", "worker:test:live-control-printed-qa"]);

  if (!skipE2e) {
    runNpm("Full-loop E2E (Playwright)", ["run", "e2e:live-control-loop"]);
  } else {
    console.log("\n⏭  Skipped e2e:live-control-loop (--skip-e2e)");
  }

  if (productionSmoke) {
    await runPrintedQaProductionSmoke({ apiOrigin });
  } else {
    console.log(
      "\n⏭  Skipped production smoke (add --production-smoke before printing for live cards)"
    );
  }

  console.log("\n✅ H-12 desk preflight OK.");
  printPrintedQaChecklist();
}

async function main() {
  const skipE2e = process.argv.includes("--skip-e2e");
  const productionSmoke = process.argv.includes("--production-smoke");
  await runPrintedQaPreflight({ skipE2e, productionSmoke });
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
