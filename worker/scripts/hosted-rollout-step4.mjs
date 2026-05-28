/**
 * Hosted steward production rollout — step 4b (deploy + verify hosted flag on production).
 *
 * Step 4a (wrangler.toml HOSTED_STEWARD_ENABLED=1) — hosted:rollout:step4a
 *
 * Usage:
 *   npm run hosted:rollout:step4
 *   npm run hosted:rollout:step4 -- --deploy
 *   npm run hosted:rollout:step4 -- --verify
 *   npm run hosted:rollout:step4 -- --deploy --verify
 *   OPERATOR_AUDIT_TOKEN=... API_ORIGIN=https://humanity.llc npm run hosted:rollout:step4 -- --verify
 *
 * @see docs/HOSTED_TIER_G0_READINESS.md § Secrets and flags
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeOperatorAuditToken } from "./hosted-rollout-token.mjs";
import { readWranglerHostedFlag } from "./hosted-rollout-step4a.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const apiOrigin = (process.env.API_ORIGIN || "https://humanity.llc").replace(/\/$/, "");
const deploy = process.argv.includes("--deploy");
const verify = process.argv.includes("--verify");
let token;
try {
  token = normalizeOperatorAuditToken(process.env.OPERATOR_AUDIT_TOKEN);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

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

function assertHostedFlagOnInToml() {
  const flag = readWranglerHostedFlag();
  if (flag !== true) {
    console.error(
      'worker/wrangler.toml must have HOSTED_STEWARD_ENABLED = "1" before deploy (step 4a).'
    );
    console.error("  npm run hosted:rollout:step4a -- --apply");
    process.exit(1);
  }
  console.log('✓ worker/wrangler.toml HOSTED_STEWARD_ENABLED = "1"');
}

function printDeployAndVerifyChecklist() {
  console.log("Step 4b — Deploy Worker with hosted flag on\n");
  console.log("Prerequisites: step 4a (wrangler.toml flag = 1) committed or applied.\n");
  console.log("1. Deploy:");
  console.log("   npm run hosted:rollout:step4 -- --deploy\n");
  console.log("2. Verify production:");
  console.log("   npm run hosted:rollout:step4 -- --verify");
  console.log(
    "   OPERATOR_AUDIT_TOKEN=... API_ORIGIN=https://humanity.llc npm run hosted:rollout:step4 -- --verify\n"
  );
  console.log("3. Before steward announcement, run step 6 regression:");
  console.log("   npm run hosted:rollout:step6 -- --verify\n");
}

async function verifyHealth() {
  const url = `${apiOrigin}/.well-known/hc/v1/health`;
  console.log(`\n▶ Public health (${url})`);
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.status !== "ok" || body.database !== "ok") {
    console.error(`Health check failed (${res.status}):`, JSON.stringify(body).slice(0, 200));
    process.exit(1);
  }
  console.log(`health OK (build.gitSha=${body.build?.gitSha ?? "unknown"})`);
}

async function verifyHostedPlansEnabled() {
  const url = `${apiOrigin}/.well-known/hc/v1/operator/plans`;
  console.log(`\n▶ Hosted plans (${url})`);
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    console.error("operator/plans response was not JSON.");
    process.exit(1);
  }
  if (res.status === 404 && body.error === "hosted_steward_disabled") {
    console.error(
      "Hosted steward is still disabled on production. Complete step 4a + deploy (--deploy)."
    );
    process.exit(1);
  }
  if (!res.ok) {
    console.error(`operator/plans failed (${res.status}): ${text.slice(0, 200)}`);
    process.exit(1);
  }
  const planIds = (body.plans ?? []).map((p) => p.plan_id);
  if (!planIds.includes("hosted_steward_v1")) {
    console.error(`hosted_steward_v1 plan missing from operator/plans: ${planIds.join(", ")}`);
    process.exit(1);
  }
  console.log("operator/plans OK (includes hosted_steward_v1)");
}

/**
 * @param {string} bearerToken
 */
async function verifyStewardOpsEnabled(bearerToken) {
  const url = `${apiOrigin}/.well-known/hc/v1/operator/steward-ops`;
  console.log(`\n▶ steward-ops hosted flag (${url})`);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${bearerToken}`, Accept: "application/json" },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`steward-ops failed (${res.status})`);
    process.exit(1);
  }
  if (body.hosted_steward_enabled !== true) {
    console.error(
      `steward-ops reports hosted_steward_enabled=${String(body.hosted_steward_enabled)} — expected true after step 4 deploy.`
    );
    process.exit(1);
  }
  console.log("steward-ops OK (hosted_steward_enabled=true)");
}

async function main() {
  console.log("Hosted steward rollout — step 4 (deploy + verify)");
  console.log("Docs: docs/HOSTED_TIER_IMPLEMENTATION_EPICS.md § Production rollout\n");

  if (!deploy && !verify) {
    const flag = readWranglerHostedFlag();
    if (flag === true) {
      console.log('ℹ️  worker/wrangler.toml has HOSTED_STEWARD_ENABLED = "1".\n');
    } else {
      console.log('ℹ️  Start with step 4a: npm run hosted:rollout:step4a -- --apply\n');
    }
    printDeployAndVerifyChecklist();
    return;
  }

  if (deploy) {
    assertHostedFlagOnInToml();
    runNpm("Worker build meta", ["run", "worker:build-meta"]);
    runNpm("Bundle scan assets", ["run", "worker:bundle-scan"]);
    runNpm("Deploy Worker", ["run", "worker:deploy"]);
    console.log("\n✅ Deploy finished. Verify production:");
    console.log("   npm run hosted:rollout:step4 -- --verify");
  }

  if (verify) {
    await verifyHealth();
    await verifyHostedPlansEnabled();
    if (token) {
      await verifyStewardOpsEnabled(token);
    } else {
      console.log("\nℹ️  Set OPERATOR_AUDIT_TOKEN to also verify steward-ops hosted_steward_enabled.");
    }
    console.log("\n✅ Step 4 verified on production. Next: npm run hosted:rollout:step5");
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
