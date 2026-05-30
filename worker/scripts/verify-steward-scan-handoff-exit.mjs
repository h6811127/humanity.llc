#!/usr/bin/env node
/**
 * Engineering exit gate — steward scan handoff S1–S7 + dual-QR investigation close-out.
 *
 * Usage:
 *   npm run steward-scan-handoff:verify
 *   npm run steward-scan-handoff:verify:fast   # Vitest only (--skip-e2e)
 *
 * @see docs/STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md § Tests / CI gate
 * @see docs/STEWARD_HANDOFF_QR_NOT_DISPLAYING_INVESTIGATION.md
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const skipE2e = process.argv.includes("--skip-e2e");

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

const gates = [
  ["run", "worker:test:steward-scan-handoff"],
  ["run", "worker:test:qr-branding"],
];

console.log("Steward scan handoff — engineering exit gate\n");
console.log("Docs: docs/STEWARD_SCAN_HANDOFF_AND_PWA_VOUCH.md\n");

for (const args of gates) {
  run(args);
}

if (!skipE2e) {
  run(["run", "e2e:steward-scan-handoff"]);
}

console.log("\n✅ Steward scan handoff gate passed (S1–S7 + dual-QR investigation).");
