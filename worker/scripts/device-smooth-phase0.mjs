/**
 * Smooth mode Phase 0 — automated preflight bundle.
 *
 * Usage:
 *   npm run device-smooth:phase0
 *   npm run device-smooth:phase0 -- --e2e
 *
 * @see docs/DEVICE_SMOOTH_MODE_PHASE0_GATE.md
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

function main() {
  const withE2e = process.argv.includes("--e2e");

  console.log("Smooth mode Phase 0 — automated preflight");
  console.log("Docs: docs/DEVICE_SMOOTH_MODE_PHASE0_GATE.md\n");

  console.log("▶ Shell transfer baseline");
  run(["run", "device-shell:baseline"]);

  console.log("\n▶ Vitest baseline");
  run(["run", "worker:test:device-shell-baseline"]);

  if (withE2e) {
    console.log("\n▶ Playwright boot/jank proxy");
    run(["run", "e2e:device-shell-baseline"]);
  } else {
    console.log("\n⏭  Skipped E2E (pass --e2e for Playwright proxy)");
  }

  console.log("\n✅ Phase 0 automated preflight OK.");
  console.log("Human next: docs/DEVICE_OS_QA.md § P0-SMOOTH · sign docs/DEVICE_SMOOTH_MODE_PHASE0_GATE.md");
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isCli) {
  main();
}
