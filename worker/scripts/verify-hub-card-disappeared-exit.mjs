#!/usr/bin/env node
/**
 * Engineering exit gate — hub card disappeared Safari RC backlog (RC-1–RC-16).
 *
 * Usage:
 *   npm run hub-card-disappeared:verify
 *   npm run hub-card-disappeared:verify:fast   # Vitest only (--skip-e2e)
 *
 * @see docs/HUB_CARD_DISAPPEARED_SAFARI_INVESTIGATION.md § Monitoring only
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
  ["run", "worker:test", "--", "worker/tests/device-wallet-save-core.test.ts"],
  ["run", "worker:test:safari-persist-denied-notice"],
  ["run", "worker:test:setup-protect"],
  ["run", "worker:test:setup-ios-custody"],
  ["run", "worker:test:private-browsing"],
  ["run", "worker:test:canonical-origin"],
  ["run", "worker:test:hub-search-rc14"],
  ["run", "worker:test:wallet-summary-integrity"],
  ["run", "worker:test:wallet-cache-rc16"],
  ["run", "worker:test", "--", "worker/tests/device-hub-wallet-debug-core.test.ts"],
];

console.log("Hub card disappeared Safari — engineering exit gate\n");
console.log("Docs: docs/HUB_CARD_DISAPPEARED_SAFARI_INVESTIGATION.md\n");

for (const args of gates) {
  run(args);
}

if (!skipE2e) {
  run(["run", "e2e:hub-wallet-debug-monitor"]);
}

console.log("\n✅ Hub card disappeared RC gate passed (RC-1–RC-16).");
console.log("   Steward diagnostic: hub debug with ?hc_debug=1 or Web Inspector snippet in doc.");
