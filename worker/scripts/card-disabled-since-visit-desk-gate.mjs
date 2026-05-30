/**
 * P0b-1 step 2 desk gate — Vitest + WebKit desk proxy before prod sign-off.
 *
 * Usage:
 *   npm run card-disabled-since-visit:desk-gate
 *   npm run card-disabled-since-visit:desk-gate:fast   # --skip-e2e
 *
 * @see docs/SAFARI_KEYS_WIPE_INVESTIGATION.md P0b-1
 * @see docs/DEVICE_OS_QA.md § P1-P0b-1
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { cardDisabledSinceVisitDeskGateHumanNextSteps } from "./card-disabled-since-visit-desk-gate-core.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** @param {string[]} args */
function run(args) {
  const result = spawnSync("npm", args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

/**
 * @param {{ skipE2e?: boolean }} [opts]
 */
export function runCardDisabledSinceVisitDeskGate(opts = {}) {
  const skipE2e = opts.skipE2e ?? false;

  console.log("P0b-1 card disabled since visit — desk gate (R10)");
  console.log("Docs: docs/SAFARI_KEYS_WIPE_INVESTIGATION.md P0b-1\n");

  console.log("▶ Vitest regression bundle");
  run(["run", "worker:test:card-disabled-since-visit"]);

  if (!skipE2e) {
    console.log("\n▶ WebKit desk proxy E2E");
    run(["run", "e2e:card-disabled-since-visit:webkit"]);
  } else {
    console.log("\n⏭  Skipped WebKit E2E (--skip-e2e)");
  }

  console.log("\n✅ P0b-1 desk gate OK (engineering pre-flight complete).");
  for (const line of cardDisabledSinceVisitDeskGateHumanNextSteps()) {
    console.log(line);
  }
}

function main() {
  runCardDisabledSinceVisitDeskGate({ skipE2e: process.argv.includes("--skip-e2e") });
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isCli) {
  main();
}
