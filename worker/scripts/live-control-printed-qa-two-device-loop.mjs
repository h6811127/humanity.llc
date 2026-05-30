/**
 * H-12 printed QR camera QA — step 3 two-device loop (operator).
 *
 * Runs Playwright loop proxy, then prints copy-paste URLs for real two-browser verification.
 *
 * Usage:
 *   npm run live-control:printed-qa:two-device-loop
 *   npm run live-control:printed-qa:two-device-loop -- --skip-e2e
 *
 * @see docs/M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md § Pre-flight step 3
 * @see docs/LIVE_CONTROL_USABILITY_HARDENING.md § H-12
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolvePrintedQaOperatorUrls } from "./hosted-rollout-scan-smoke.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

/**
 * @param {{ scanUrl: string; createdUrl: string }} urls
 * @returns {string[]}
 */
export function printedQaTwoDeviceLoopBrief({ scanUrl, createdUrl }) {
  return [
    "",
    "Two-browser quick test (~5 min):",
    `Browser A (scanner): ${scanUrl}`,
    `Browser B (owner keys): ${createdUrl}`,
    "",
    "On Browser A tap Ask for live proof.",
    "On Browser B open the owner link from the scanner pane → Prove control now.",
    "Scanner should show Control proven with does not prove legal identity.",
    "",
  ];
}

/** @returns {string[]} */
export function printedQaTwoDeviceVerifyChecklist() {
  return [
    "Verify manually (check each):",
    "  ☐ Owner panel or side-by-side Owner pane appears after Ask",
    "  ☐ Expires in M:SS countdown visible while waiting",
    "  ☐ Prove control now succeeds on /created/",
    "  ☐ Scanner shows Control proven + does not prove legal identity",
    "",
    "Next (pre-flight steps 4–5):",
    "  4. Print QR PNG from /created/ (≥2 cm module; HTTPS URL on print).",
    "  5. Phones ready — then § A–C on ≥3 phones (docs/M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md).",
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
 * @param {{ skipE2e?: boolean; apiOrigin?: string }} [opts]
 */
export function runPrintedQaTwoDeviceLoop(opts = {}) {
  const skipE2e = opts.skipE2e ?? false;
  const apiOrigin = (opts.apiOrigin || process.env.API_ORIGIN || "https://humanity.llc").replace(
    /\/$/,
    ""
  );
  const urls = resolvePrintedQaOperatorUrls(apiOrigin);

  console.log("H-12 printed QR camera QA — step 3 two-device loop");
  console.log("Docs: docs/M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md § Pre-flight\n");

  if (!skipE2e) {
    runNpm("Automated loop proxy (Playwright)", ["run", "e2e:live-control-loop"]);
  } else {
    console.log("\n⏭  Skipped e2e:live-control-loop (--skip-e2e)");
  }

  for (const line of printedQaTwoDeviceLoopBrief(urls)) {
    console.log(line);
  }
  for (const line of printedQaTwoDeviceVerifyChecklist()) {
    console.log(line);
  }

  console.log("✅ H-12 step 3 desk proxy OK — complete manual two-browser verification above.");
}

function main() {
  const skipE2e = process.argv.includes("--skip-e2e");
  runPrintedQaTwoDeviceLoop({ skipE2e });
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isCli) {
  main();
}
