/**
 * Apply child-object QR full schema rebuild (scope CHECK + object_id) in one D1 batch.
 *
 * Usage:
 *   npm run worker:apply-child-object-qr-schema -- --remote
 *   npm run worker:apply-child-object-qr-schema
 *
 * @see docs/SCAN_WORKER_1101_POSTMORTEM.md
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const sqlFile = path.join(__dirname, "child-object-qr-schema-rebuild.sql");
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

console.log("\n✅ Schema rebuild applied.");
