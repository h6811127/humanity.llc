/**
 * Hosted steward production rollout — step 4 (enable hosted flag).
 *
 * Per HOSTED_TIER_IMPLEMENTATION_EPICS.md § Production rollout (after G0):
 *   4. Set HOSTED_STEWARD_ENABLED=1 and deploy Worker when ready for stewards.
 *
 * Usage:
 *   npm run hosted:rollout:step4
 *   npm run hosted:rollout:step4 -- --verify
 *   OPERATOR_AUDIT_TOKEN=... API_ORIGIN=https://humanity.llc npm run hosted:rollout:step4 -- --verify
 *
 * @see docs/HOSTED_TIER_G0_READINESS.md § Secrets and flags
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeOperatorAuditToken } from "./hosted-rollout-token.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const wranglerToml = path.join(repoRoot, "worker/wrangler.toml");

const apiOrigin = (process.env.API_ORIGIN || "https://humanity.llc").replace(/\/$/, "");
let token;
try {
  token = normalizeOperatorAuditToken(process.env.OPERATOR_AUDIT_TOKEN);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
const verify = process.argv.includes("--verify");

function printEnableInstructions() {
  console.log("Step 4 — Enable HOSTED_STEWARD_ENABLED on production\n");
  console.log("Prerequisites: steps 1–3 complete (migrations, deploy with flag off, OPERATOR_AUDIT_TOKEN set).\n");
  console.log("1. In worker/wrangler.toml [vars], set:");
  console.log('   HOSTED_STEWARD_ENABLED = "1"');
  console.log("2. Deploy the Worker:");
  console.log("   npm run worker:deploy");
  console.log("   (or push worker/ changes to main — deploy-worker.yml runs on worker/** pushes)\n");
  console.log("3. Verify hosted routes are live:");
  console.log("   npm run hosted:rollout:step4 -- --verify");
  console.log(
    "   OPERATOR_AUDIT_TOKEN=... API_ORIGIN=https://humanity.llc npm run hosted:rollout:step4 -- --verify\n"
  );
  console.log("4. Regression before announcing to stewards (step 6):");
  console.log("   npm run verify:hosted-g0");
  console.log("   npm run e2e:steward-hosted\n");
}

/**
 * @returns {boolean | null}
 */
function readWranglerHostedFlag() {
  const toml = readFileSync(wranglerToml, "utf8");
  const match = toml.match(/HOSTED_STEWARD_ENABLED\s*=\s*"([^"]+)"/);
  if (!match) return null;
  return match[1] === "1" || match[1].toLowerCase() === "true";
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
      "Hosted steward is still disabled on production. Set HOSTED_STEWARD_ENABLED=1 and redeploy."
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
  console.log(`operator/plans OK (includes hosted_steward_v1)`);
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

/**
 * @param {string} label
 * @param {string[]} args
 */
function runNpm(label, args) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync("npm", args, {
    cwd: repoRoot,
    env: process.env,
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function main() {
  console.log("Hosted steward rollout — step 4 (enable hosted flag)");
  console.log("Docs: docs/HOSTED_TIER_IMPLEMENTATION_EPICS.md § Production rollout\n");

  const localFlag = readWranglerHostedFlag();
  if (localFlag === true) {
    console.log('ℹ️  worker/wrangler.toml already has HOSTED_STEWARD_ENABLED = "1" (commit + deploy when ready).');
  } else if (localFlag === false) {
    console.log('ℹ️  worker/wrangler.toml still has HOSTED_STEWARD_ENABLED = "0" — update before deploy.\n');
  }

  if (!verify) {
    printEnableInstructions();
    console.log("⏭  Run with --verify after deploy to confirm production hosted routes.");
    return;
  }

  await verifyHealth();
  await verifyHostedPlansEnabled();
  if (token) {
    await verifyStewardOpsEnabled(token);
  } else {
    console.log("\nℹ️  Set OPERATOR_AUDIT_TOKEN to also verify steward-ops hosted_steward_enabled.");
  }

  runNpm("Free-tier + hosted regression (verify:hosted-g0)", ["run", "verify:hosted-g0"]);

  console.log("\n✅ Step 4 verified on production. Next: step 5 — ops dashboard + E6.2 CI secret check.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
