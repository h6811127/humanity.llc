/**
 * Hosted steward production rollout — step 5a (pin Cloudflare Workers metrics, E6.1).
 *
 * Per HOSTED_TIER_IMPLEMENTATION_EPICS.md § Production rollout step 5 (first):
 *   Pin CF dashboard views for humanity-llc-resolver (manual, external).
 *
 * Usage:
 *   npm run hosted:rollout:step5a
 *   npm run hosted:rollout:step5a -- --preflight   # wrangler name + doc + Vitest (no CF UI)
 *
 * @see docs/HOSTED_STEWARD_CF_DASHBOARD.md
 * @see docs/HOSTED_STEWARD_OPS_RUNBOOK.md
 */
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const cfDashboardDoc = "docs/HOSTED_STEWARD_CF_DASHBOARD.md";
const wranglerToml = path.join(repoRoot, "worker/wrangler.toml");

/** Must match HOSTED_STEWARD_CF_DASHBOARD.md and worker/wrangler.toml `name`. */
export const HOSTED_RESOLVER_WORKER_NAME = "humanity-llc-resolver";

const preflight = process.argv.includes("--preflight");

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

export function assertCfDashboardDocPresent() {
  const docPath = path.join(repoRoot, cfDashboardDoc);
  if (!existsSync(docPath)) {
    console.error(`Missing CF dashboard doc: ${cfDashboardDoc}`);
    process.exit(1);
  }
  console.log(`✓ ${cfDashboardDoc} present`);
}

export function assertResolverWorkerNameInWrangler() {
  if (!existsSync(wranglerToml)) {
    console.error("Missing worker/wrangler.toml");
    process.exit(1);
  }
  const toml = readFileSync(wranglerToml, "utf8");
  const match = toml.match(/^name\s*=\s*"([^"]+)"/m);
  const name = match?.[1];
  if (name !== HOSTED_RESOLVER_WORKER_NAME) {
    console.error(
      `worker/wrangler.toml name must be "${HOSTED_RESOLVER_WORKER_NAME}" (got ${name ?? "unset"})`
    );
    process.exit(1);
  }
  console.log(`✓ worker/wrangler.toml name = ${HOSTED_RESOLVER_WORKER_NAME}`);
}

export function runStep5aPreflightVitest() {
  runNpm("Step 5a rollout unit tests (preflight)", [
    "run",
    "worker:test",
    "--",
    "worker/tests/hosted-rollout-step5a.test.ts",
  ]);
}

export function printCfDashboardSetup() {
  console.log("Step 5a — Pin Cloudflare Workers metrics (E6.1, manual)\n");
  console.log(`See ${cfDashboardDoc} for full detail.\n`);
  console.log(
    `1. Open Cloudflare dashboard → Workers & Pages → ${HOSTED_RESOLVER_WORKER_NAME} → Metrics.`
  );
  console.log("2. Pin 7-day and 24-hour views for on-call review.");
  console.log("3. Note these hosted-tier paths for 429/5xx spikes:");
  for (const row of [
    "/.well-known/hc/v1/steward/entitlements",
    "/.well-known/hc/v1/steward/push",
    "/.well-known/hc/v1/cards/*/live-control/challenges",
    "/.well-known/hc/v1/operator/steward-ops",
    "/.well-known/hc/v1/operator/billing/webhook",
  ]) {
    console.log(`   • ${row}`);
  }
  console.log("4. Compare daily CF metrics with steward-ops snapshot + E6.2 CI.\n");
}

function runPreflight() {
  console.log("Step 5a preflight — local gate before CF dashboard pin (manual UI)\n");
  assertCfDashboardDocPresent();
  assertResolverWorkerNameInWrangler();
  runStep5aPreflightVitest();
  console.log("\n✅ Step 5a preflight OK.");
  console.log("Complete CF dashboard pin manually:");
  console.log("  npm run hosted:rollout:step5a");
  console.log("Then continue:");
  console.log("  npm run hosted:rollout:step5b -- --preflight");
  console.log(
    "  OPERATOR_AUDIT_TOKEN=... API_ORIGIN=https://humanity.llc npm run hosted:rollout:step5b -- --verify"
  );
}

function main() {
  console.log("Hosted steward rollout — step 5a (Cloudflare dashboard)");
  console.log("Docs: docs/HOSTED_TIER_IMPLEMENTATION_EPICS.md § Production rollout\n");

  if (preflight) {
    runPreflight();
    return;
  }

  printCfDashboardSetup();

  console.log("Engineering preflight (local, before CF UI):");
  console.log("   npm run hosted:rollout:step5a -- --preflight\n");
  console.log("⏭  Complete the dashboard steps above manually, then continue:");
  console.log("   npm run hosted:rollout:step5        # GitHub secret + runbook checklist");
  console.log(
    "   OPERATOR_AUDIT_TOKEN=... npm run hosted:rollout:step5 -- --verify   # E6.2 path"
  );
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isCli) {
  main();
}
