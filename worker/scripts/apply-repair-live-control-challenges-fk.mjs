/**
 * Repair live_control_challenges FK after qr_credentials table rebuild.
 *
 * Usage:
 *   npm run worker:repair-live-control-challenges-fk -- --remote
 *   npm run worker:repair-live-control-challenges-fk
 *
 * @see docs/LIVE_PROOF_FAILURE_INVESTIGATION.md
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const sqlFile = path.join(__dirname, "repair-live-control-challenges-fk.sql");
const remote = process.argv.includes("--remote");

const result = spawnSync(
  "npx",
  [
    "wrangler",
    "d1",
    "execute",
    "humanity-resolver",
    remote ? "--remote" : "--local",
    "--config",
    "worker/wrangler.toml",
    "--file",
    sqlFile,
  ],
  { cwd: repoRoot, stdio: "inherit", shell: false }
);
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log("\n✅ live_control_challenges FK repair applied.");
