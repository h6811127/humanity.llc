/**
 * Re-seed status plate + live object showcase cards (object_streams pilots).
 *
 * Step 1 of docs/MANIFESTO_STATUS_UPDATE.md exit checklist (production re-seed):
 *   API_ORIGIN=https://humanity.llc npm run site:refresh-showcase
 * Then commit site/data/showcase-status-plate.json + showcase-live-object.json,
 * deploy Pages, and run npm run site:verify-showcase.
 *
 * @see docs/M5_STRANGER_TEST_RUNBOOK.md § Live object scan
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const apiOrigin = (process.env.API_ORIGIN || "https://humanity.llc").replace(/\/$/, "");

/**
 * @param {string} label
 * @param {string} scriptRel
 */
function runSeed(label, scriptRel) {
  console.log(`\n→ ${label}`);
  const result = spawnSync("node", [scriptRel], {
    cwd: repoRoot,
    env: process.env,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

runSeed("Status plate showcase", "worker/scripts/seed-showcase-status-plate.mjs");
runSeed("Live object showcase", "worker/scripts/seed-showcase-live-object.mjs");

console.log("\nShowcase streams re-seeded.");
console.log("Next:");
console.log("  1. Commit site/data/showcase-status-plate.json and showcase-live-object.json");
console.log("  2. Deploy Pages");
console.log(`  3. API_ORIGIN=${apiOrigin} npm run site:verify-showcase`);
