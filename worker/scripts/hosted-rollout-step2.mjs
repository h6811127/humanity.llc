/**
 * Hosted steward production rollout — step 2 (deploy Worker, flag off).
 *
 * Per HOSTED_TIER_IMPLEMENTATION_EPICS.md § Production rollout (after G0):
 *   2. Deploy Worker with HOSTED_STEWARD_ENABLED=0; smoke public create/scan
 *
 * Usage:
 *   npm run hosted:rollout:step2              # verify wrangler flag + print deploy/smoke checklist
 *   npm run hosted:rollout:step2 -- --deploy  # run worker:build-meta, bundle-scan, wrangler deploy
 *   npm run hosted:rollout:step2 -- --smoke   # health + hosted routes gated (after deploy)
 *   npm run hosted:rollout:step2 -- --deploy --smoke
 *   API_ORIGIN=http://127.0.0.1:8787 npm run hosted:rollout:step2 -- --smoke  # local worker:dev
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
/**
 * @param {string} url
 * @param {RequestInit} [init]
 */
async function fetchJson(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    console.error(`Non-JSON response from ${url}: ${text.slice(0, 300)}`);
    process.exit(1);
  }
  return { res, body };
}

async function smokeProductionHealth() {
  const url = `${apiOrigin}/.well-known/hc/v1/health`;
  console.log(`\n▶ Smoke health (${url})`);
  const { res, body } = await fetchJson(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    console.error(`health failed (${res.status}): ${JSON.stringify(body).slice(0, 300)}`);
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

/** Step 2: public routes work; hosted steward extension stays off until step 4. */
async function smokeHostedStewardGated() {
  const capsUrl = `${apiOrigin}/.well-known/hc/v1/operator/capabilities`;
  console.log(`\n▶ Smoke operator capabilities (${capsUrl})`);
  const { res: capsRes, body: capsBody } = await fetchJson(capsUrl, {
    headers: { Accept: "application/json" },
  });
  if (!capsRes.ok) {
    console.error(`capabilities failed (${capsRes.status})`);
    process.exit(1);
  }
  const extensions = capsBody.extensions;
  if (
    extensions &&
    typeof extensions === "object" &&
    extensions.hosted_steward &&
    extensions.hosted_steward.status === "enabled"
  ) {
    console.error(
      "capabilities.extensions.hosted_steward is enabled — HOSTED_STEWARD_ENABLED must stay 0 for step 2."
    );
    process.exit(1);
  }
  console.log("capabilities OK (hosted_steward extension not enabled)");

  const entUrl = `${apiOrigin}/.well-known/hc/v1/steward/entitlements`;
  console.log(`\n▶ Smoke steward entitlements gated (${entUrl})`);
  const { res: entRes, body: entBody } = await fetchJson(entUrl, {
    headers: {
      Accept: "application/json",
      "X-HC-Device-Id": "rollout_step2_smoke_device",
    },
  });
  if (entRes.status !== 404 || entBody.error !== "hosted_steward_disabled") {
    console.error(
      `expected 404 hosted_steward_disabled, got ${entRes.status} ${JSON.stringify(entBody).slice(0, 200)}`
    );
    process.exit(1);
  }
  console.log("steward entitlements gated OK (404 hosted_steward_disabled)");
}

async function smokeProduction() {
  await smokeProductionHealth();
  await smokeHostedStewardGated();
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
    await smokeProduction();
  } else {
    printManualSmokeChecklist();
    console.log("\nAutomated smoke (health + hosted routes gated):");
    console.log("  npm run hosted:rollout:step2 -- --smoke");
  }

  if (deploy && smoke) {
    console.log(
      "\n✅ Step 2 complete (deploy + smoke). Next: step 3 — npm run hosted:rollout:step3"
    );
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
