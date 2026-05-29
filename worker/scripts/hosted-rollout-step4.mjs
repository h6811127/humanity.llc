/**
 * Hosted steward production rollout — step 4b (deploy + verify hosted flag on production).
 *
 * Step 4a (wrangler.toml HOSTED_STEWARD_ENABLED=1) — hosted:rollout:step4a
 *
 * Usage:
 *   npm run hosted:rollout:step4
 *   npm run hosted:rollout:step4 -- --deploy
 *   npm run hosted:rollout:step4 -- --verify
 *   npm run hosted:rollout:step4 -- --smoke
 *   npm run hosted:rollout:step4 -- --smoke --local
 *   npm run hosted:rollout:step4 -- --smoke --local --preflight
 *   npm run hosted:rollout:step4 -- --deploy --smoke
 *   OPERATOR_AUDIT_TOKEN=... API_ORIGIN=https://humanity.llc npm run hosted:rollout:step4 -- --verify
 *   API_ORIGIN=http://127.0.0.1:8787 npm run hosted:rollout:step4 -- --smoke
 *
 * @see docs/HOSTED_TIER_G0_READINESS.md § Secrets and flags
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  normalizeOperatorAuditToken,
  operatorAuditTokenShellHint,
} from "./hosted-rollout-token.mjs";
import { readWranglerHostedFlag } from "./hosted-rollout-step4a.mjs";
import { smokeProductionLiveControlChallenge, smokeProductionScanPage } from "./hosted-rollout-scan-smoke.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const LOCAL_DEV_ORIGIN = "http://127.0.0.1:8787";
const deploy = process.argv.includes("--deploy");
const verify = process.argv.includes("--verify");
const smoke = process.argv.includes("--smoke");
const useLocal = process.argv.includes("--local");
const preflight = process.argv.includes("--preflight");

/** @returns {string} */
export function getApiOrigin() {
  return (process.env.API_ORIGIN || "https://humanity.llc").replace(/\/$/, "");
}

/**
 * @param {boolean} [forceLocal] When true, default API_ORIGIN to local worker:dev.
 */
export function applyLocalApiOriginDefault(forceLocal = useLocal) {
  if (!forceLocal || process.env.API_ORIGIN) return getApiOrigin();
  process.env.API_ORIGIN = LOCAL_DEV_ORIGIN;
  return getApiOrigin();
}
let token;
try {
  token = normalizeOperatorAuditToken(process.env.OPERATOR_AUDIT_TOKEN);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  console.error(`\n${operatorAuditTokenShellHint()}`);
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

export function assertHostedFlagOnInToml() {
  const flag = readWranglerHostedFlag();
  if (flag !== true) {
    console.error(
      'worker/wrangler.toml must have HOSTED_STEWARD_ENABLED = "1" for step 4 (step 4a).'
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
  console.log("2. Smoke (health + hosted routes on):");
  console.log("   npm run hosted:rollout:step4 -- --smoke");
  console.log("   npm run hosted:rollout:step4 -- --smoke --local --preflight");
  console.log("   (after worker:migrate:local + worker:dev) API_ORIGIN=http://127.0.0.1:8787\n");
  console.log("3. Verify production:");
  console.log("   npm run hosted:rollout:step4 -- --verify");
  console.log("   export OPERATOR_AUDIT_TOKEN='your-token-from-wrangler'");
  console.log("   npm run hosted:rollout:step4 -- --verify\n");
  console.log("4. Before steward announcement, run step 6 regression:");
  console.log("   npm run hosted:rollout:step6 -- --verify\n");
}

/**
 * @param {string} url
 * @param {RequestInit} [init]
 */
export async function fetchJson(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Non-JSON response from ${url}: ${text.slice(0, 300)}`);
  }
  return { res, body };
}

/**
 * @param {string} [origin]
 */
export async function smokeProductionHealth(origin = getApiOrigin()) {
  const url = `${origin}/.well-known/hc/v1/health`;
  console.log(`\n▶ Smoke health (${url})`);
  const { res, body } = await fetchJson(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok || body.status !== "ok") {
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

/**
 * @param {string} [origin]
 */
export async function smokeHostedPlansEnabled(origin = getApiOrigin()) {
  const url = `${origin}/.well-known/hc/v1/operator/plans`;
  console.log(`\n▶ Smoke hosted plans (${url})`);
  const { res, body } = await fetchJson(url, {
    headers: { Accept: "application/json" },
  });
  if (res.status === 404 && body.error === "hosted_steward_disabled") {
    console.error(
      "Hosted steward is still disabled on this origin. Complete step 4a + deploy (--deploy), or restart worker:dev after --apply."
    );
    process.exit(1);
  }
  if (!res.ok) {
    console.error(`operator/plans failed (${res.status}): ${JSON.stringify(body).slice(0, 200)}`);
    process.exit(1);
  }
  const planIds = (body.plans ?? []).map((p) => p.plan_id);
  if (!planIds.includes("hosted_steward_v1")) {
    console.error(`hosted_steward_v1 plan missing from operator/plans: ${planIds.join(", ")}`);
    process.exit(1);
  }
  console.log("operator/plans OK (includes hosted_steward_v1)");
}

/** Step 4: hosted extension on; entitlements route live (auth required, not disabled). */
export async function smokeHostedStewardRoutesEnabled(origin = getApiOrigin()) {
  const capsUrl = `${origin}/.well-known/hc/v1/operator/capabilities`;
  console.log(`\n▶ Smoke operator capabilities (${capsUrl})`);
  const { res: capsRes, body: capsBody } = await fetchJson(capsUrl, {
    headers: { Accept: "application/json" },
  });
  if (!capsRes.ok) {
    console.error(`capabilities failed (${capsRes.status})`);
    process.exit(1);
  }
  const hosted = capsBody.extensions?.hosted_steward;
  if (!hosted || hosted.status !== "enabled") {
    console.error(
      "capabilities.extensions.hosted_steward is not enabled — HOSTED_STEWARD_ENABLED must be 1 on this origin."
    );
    process.exit(1);
  }
  console.log("capabilities OK (hosted_steward extension enabled)");

  const entUrl = `${origin}/.well-known/hc/v1/steward/entitlements`;
  console.log(`\n▶ Smoke steward entitlements route (${entUrl})`);
  const { res: entRes, body: entBody } = await fetchJson(entUrl, {
    headers: { Accept: "application/json" },
  });
  if (entRes.status === 404 && entBody.error === "hosted_steward_disabled") {
    console.error(
      "steward/entitlements still returns hosted_steward_disabled — flag is off on this origin."
    );
    process.exit(1);
  }
  if (entRes.status !== 401 || entBody.error !== "UNAUTHORIZED") {
    console.error(
      `expected 401 UNAUTHORIZED without session, got ${entRes.status} ${JSON.stringify(entBody).slice(0, 200)}`
    );
    process.exit(1);
  }
  console.log("steward entitlements route OK (401 without bearer — extension enabled)");
}

/**
 * @param {string} bearerToken
 * @param {string} [origin]
 */
export async function smokeStewardOpsHostedEnabled(bearerToken, origin = getApiOrigin()) {
  const url = `${origin}/.well-known/hc/v1/operator/steward-ops`;
  console.log(`\n▶ Smoke steward-ops hosted flag (${url})`);
  const { res, body } = await fetchJson(url, {
    headers: { Authorization: `Bearer ${bearerToken}`, Accept: "application/json" },
  });
  if (!res.ok) {
    console.error(`steward-ops failed (${res.status}): ${JSON.stringify(body).slice(0, 200)}`);
    process.exit(1);
  }
  if (body.hosted_steward_enabled !== true) {
    console.error(
      `steward-ops reports hosted_steward_enabled=${String(body.hosted_steward_enabled)} — expected true after step 4.`
    );
    process.exit(1);
  }
  console.log("steward-ops OK (hosted_steward_enabled=true)");
}

export async function smokeProduction(origin = getApiOrigin()) {
  await smokeProductionHealth(origin);
  await smokeProductionScanPage(origin);
  await smokeProductionLiveControlChallenge(origin);
  await smokeHostedPlansEnabled(origin);
  await smokeHostedStewardRoutesEnabled(origin);
  if (token) {
    await smokeStewardOpsHostedEnabled(token, origin);
  } else {
    console.log(
      "\nℹ️  Set OPERATOR_AUDIT_TOKEN to also smoke steward-ops hosted_steward_enabled=true."
    );
  }
}

async function verifyProduction() {
  await smokeProductionHealth();
  await smokeProductionScanPage();
  await smokeProductionLiveControlChallenge();
  await smokeHostedPlansEnabled();
  await smokeHostedStewardRoutesEnabled();
  if (token) {
    await smokeStewardOpsHostedEnabled(token);
  } else {
    console.log("\nℹ️  Set OPERATOR_AUDIT_TOKEN to also verify steward-ops hosted_steward_enabled.");
  }
}

export function runStep4PreflightVitest() {
  runNpm("Step 4 rollout unit tests (preflight)", [
    "run",
    "worker:test",
    "--",
    "worker/tests/hosted-rollout-step4-smoke.test.ts",
    "worker/tests/hosted-rollout-step4.test.ts",
    "worker/tests/hosted-rollout-step4a.test.ts",
    "worker/tests/hosted-rollout-scan-smoke.test.ts",
    "worker/tests/schema-ready.test.ts",
  ]);
}

async function main() {
  console.log("Hosted steward rollout — step 4 (deploy + verify)");
  console.log("Docs: docs/HOSTED_TIER_IMPLEMENTATION_EPICS.md § Production rollout\n");

  const origin = applyLocalApiOriginDefault();
  if (useLocal) {
    console.log(`ℹ️  Using API_ORIGIN=${origin} (--local)\n`);
  }

  if (!deploy && !verify && !smoke) {
    const flag = readWranglerHostedFlag();
    if (flag === true) {
      console.log('ℹ️  worker/wrangler.toml has HOSTED_STEWARD_ENABLED = "1".\n');
    } else {
      console.log('ℹ️  Start with step 4a: npm run hosted:rollout:step4a -- --apply\n');
    }
    printDeployAndVerifyChecklist();
    return;
  }

  if (deploy || smoke) {
    assertHostedFlagOnInToml();
  }

  if (deploy) {
    runNpm("Worker build meta", ["run", "worker:build-meta"]);
    runNpm("Bundle scan assets", ["run", "worker:bundle-scan"]);
    runNpm("Deploy Worker", ["run", "worker:deploy"]);
    console.log("\n✅ Deploy finished. Smoke or verify:");
    console.log("   npm run hosted:rollout:step4 -- --smoke");
    console.log("   npm run hosted:rollout:step4 -- --verify");
  }

  if (smoke) {
    if (preflight) {
      runStep4PreflightVitest();
    }
    await smokeProduction();
    console.log(`\n✅ Step 4 smoke OK (hosted routes enabled on ${origin}).`);
    if (!deploy && !verify) {
      console.log("Next: npm run hosted:rollout:step4 -- --deploy  (production)");
    }
  }

  if (verify) {
    await verifyProduction();
    console.log("\n✅ Step 4 verified on production. Next: npm run hosted:rollout:step5");
  }
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isCli) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
