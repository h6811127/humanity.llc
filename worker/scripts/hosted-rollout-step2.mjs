/**
 * Hosted steward production rollout — step 2 (deploy Worker, flag off).
 *
 * Per HOSTED_TIER_IMPLEMENTATION_EPICS.md § Production rollout (after G0):
 *   2. Deploy Worker with HOSTED_STEWARD_ENABLED=0; smoke public create/scan
 *
 * Usage:
 *   npm run hosted:rollout:step2              # verify wrangler flag + print deploy/smoke checklist
 *   npm run hosted:rollout:step2 -- --deploy  # run worker:build-meta, bundle-scan, wrangler deploy
 *   npm run hosted:rollout:step2 -- --smoke   # GET production health (after deploy)
 *   npm run hosted:rollout:step2 -- --deploy --smoke
 *
 * @see docs/HOSTED_TIER_G0_READINESS.md
 * @see docs/HOSTED_TIER_IMPLEMENTATION_EPICS.md § Production rollout (after G0)
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const wranglerToml = path.join(repoRoot, "worker/wrangler.toml");

const apiOrigin = (process.env.API_ORIGIN || "https://humanity.llc").replace(/\/$/, "");
const deploy = process.argv.includes("--deploy");
const smoke = process.argv.includes("--smoke");

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

function assertHostedFlagOffInToml() {
  const toml = readFileSync(wranglerToml, "utf8");
  const match = toml.match(/^\s*HOSTED_STEWARD_ENABLED\s*=\s*"([^"]*)"/m);
  if (!match) {
    console.error("HOSTED_STEWARD_ENABLED not found in worker/wrangler.toml [vars].");
    process.exit(1);
  }
  const value = match[1];
  if (value !== "0") {
    console.error(
      `worker/wrangler.toml must have HOSTED_STEWARD_ENABLED = "0" for step 2 (found "${value}").`
    );
    console.error('Set "0", deploy, then enable in step 4.');
    process.exit(1);
  }
  console.log('✓ worker/wrangler.toml HOSTED_STEWARD_ENABLED = "0"');
}

function printManualSmokeChecklist() {
  console.log("\nManual smoke (production, free tier unchanged):");
  console.log("  • GET /.well-known/hc/v1/health — database ok");
  console.log("  • Public card create + scan on humanity.llc (no subscription required)");
  console.log("  • Steward routes return 404/disabled when flag is off (expected)");
}

/**
 * @returns {Promise<void>}
 */
async function smokeProductionHealth() {
  const url = `${apiOrigin}/.well-known/hc/v1/health`;
  console.log(`\n▶ Smoke health (${url})`);
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await res.text();
  if (!res.ok) {
    console.error(`health failed (${res.status}): ${text.slice(0, 300)}`);
    process.exit(1);
  }
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    console.error("health response was not JSON.");
    process.exit(1);
  }
  if (body.database === "schema_missing") {
    console.error("health.database is schema_missing — run: npm run hosted:rollout:step1 -- --remote");
    process.exit(1);
  }
  console.log(
    `health OK (status=${String(body.status)}, database=${String(body.database)})`
  );
  if (body.build?.gitSha) {
    console.log(`  build.gitSha=${body.build.gitSha}`);
  }
}

async function main() {
  console.log("Hosted steward rollout — step 2 (deploy Worker, flag off)");
  console.log("Docs: docs/HOSTED_TIER_IMPLEMENTATION_EPICS.md § Production rollout\n");

  assertHostedFlagOffInToml();

  if (deploy) {
    runNpm("Worker build meta", ["run", "worker:build-meta"]);
    runNpm("Bundle scan assets", ["run", "worker:bundle-scan"]);
    runNpm("Deploy Worker", ["run", "worker:deploy"]);
  } else {
    console.log("\nDeploy when ready:");
    console.log("  npm run hosted:rollout:step2 -- --deploy");
    console.log("  (runs worker:build-meta, worker:bundle-scan, worker:deploy)");
  }

  if (smoke) {
    await smokeProductionHealth();
  } else {
    printManualSmokeChecklist();
    console.log("\nAutomated health smoke:");
    console.log("  npm run hosted:rollout:step2 -- --smoke");
  }

  if (deploy && smoke) {
    console.log("\n✅ Step 2 complete (deploy + health smoke). Next: step 3 — npm run hosted:rollout:step3");
  } else if (deploy) {
    console.log("\n✅ Deploy finished. Run --smoke to verify health, then step 3.");
  } else {
    console.log("\n⏭  After deploy + smoke, continue with: npm run hosted:rollout:step3");
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
