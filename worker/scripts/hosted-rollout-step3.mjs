/**
 * Hosted steward production rollout — step 3 (alias for step 3a).
 *
 * @see worker/scripts/hosted-rollout-step3a.mjs
 * @see worker/scripts/hosted-rollout-step3b.mjs (Stripe — deferred until G8)
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(__dirname, "hosted-rollout-step3a.mjs");
const result = spawnSync(process.execPath, [script, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 1);
