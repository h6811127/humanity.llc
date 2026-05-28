/**
 * Hosted steward production rollout — step 1 (D1 migrations).
 *
 * Per HOSTED_TIER_IMPLEMENTATION_EPICS.md § Production rollout (after G0):
 *   1. verify:hosted-g0 (G0 readiness — before / during rollout)
 *   2. Apply 0012_steward_hosted.sql + 0013_steward_billing.sql
 *
 * Usage:
 *   npm run hosted:rollout:step1              # G0 tests + local D1 apply (dry-run prod SQL)
 *   npm run hosted:rollout:step1 -- --remote  # same + wrangler --remote (needs CF auth)
 *
 * @see docs/HOSTED_TIER_G0_READINESS.md
 * @see docs/HOSTED_TIER_IMPLEMENTATION_EPICS.md § Production rollout (after G0)
 */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const migrationsDir = path.join(repoRoot, "worker/migrations");

const HOSTED_MIGRATIONS = [
  "0012_steward_hosted.sql",
  "0013_steward_billing.sql",
];

const remote = process.argv.includes("--remote");

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

function assertMigrationFiles() {
  for (const name of HOSTED_MIGRATIONS) {
    const file = path.join(migrationsDir, name);
    if (!existsSync(file)) {
      console.error(`Missing migration: worker/migrations/${name}`);
      process.exit(1);
    }
  }
  console.log(`Hosted migration files present: ${HOSTED_MIGRATIONS.join(", ")}`);
}

function main() {
  console.log("Hosted steward rollout — step 1 (D1 migrations)");
  console.log("Docs: docs/HOSTED_TIER_IMPLEMENTATION_EPICS.md § Production rollout\n");

  assertMigrationFiles();

  runNpm("G0 verification (verify:hosted-g0)", ["run", "verify:hosted-g0"]);
  runNpm("D1 migrations (local)", ["run", "worker:migrate:local"]);

  if (remote) {
    if (!process.env.CLOUDFLARE_API_TOKEN?.trim()) {
      console.warn(
        "Warning: CLOUDFLARE_API_TOKEN is unset; wrangler may prompt or fail for --remote."
      );
    }
    runNpm("D1 migrations (remote — production)", ["run", "worker:migrate:remote"]);
    console.log("\n✅ Step 1 complete (remote). Next: npm run hosted:rollout:step2 -- --deploy --smoke");
  } else {
    console.log(
      "\n✅ Step 1 preflight complete (local). Apply production D1 with:\n" +
        "   npm run hosted:rollout:step1 -- --remote\n" +
        "   (requires Cloudflare auth; see worker/wrangler.toml)"
    );
  }
}

main();
