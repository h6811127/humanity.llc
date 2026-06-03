/**
 * WS-REV R3 — production smoke (hosted revenue + paid entitlements).
 *
 * Usage:
 *   npm run hosted:rev:prod-smoke -- --preflight
 *   npm run hosted:rev:prod-smoke -- --api
 *   API_ORIGIN=https://humanity.llc npm run hosted:rev:prod-smoke -- --api
 *   STEWARD_SESSION_TOKEN=… EXPECT_PLAN_ID=hosted_steward_v1 npm run hosted:rev:prod-smoke -- --paid
 *   npm run hosted:rev:prod-smoke -- --preflight --api --paid
 *
 * @see docs/HOSTED_TIER_ENTITLEMENTS_AND_METERING.md
 * @see docs/PRODUCT_WORKSTREAM_COORDINATION.md § WS-REV
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fetchJson, smokeProductionHealth } from "./hosted-rollout-step4.mjs";
import {
  assertBillingCheckoutRequiresSession,
  assertHostedExtensionEnabled,
  assertPaidStewardEntitlements,
  assertRevenuePlansCatalog,
  classifyBillingCheckoutConfigured,
  hostedRevApiPaths,
} from "./hosted-rev-prod-smoke-core.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const apiOrigin = (process.env.API_ORIGIN || "https://humanity.llc").replace(/\/$/, "");

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

export function runRevProdSmokePreflight() {
  runNpm("WS-REV Vitest (checkout + created panel)", [
    "run",
    "worker:test:steward-checkout",
  ]);
  runNpm("WS-REV Vitest (created hosted entitlements)", [
    "run",
    "worker:test:created-hosted-entitlements",
  ]);
  runNpm("WS-REV Vitest (season entitlements API)", [
    "run",
    "worker:test",
    "--",
    "worker/tests/city-game-season-entitlements-api.test.ts",
    "worker/tests/billing-lifecycle.test.ts",
  ]);
  runNpm("Hosted migration files (0012 + 0013 + 0031)", [
    "run",
    "worker:test",
    "--",
    "worker/tests/hosted-rollout-step1.test.ts",
  ]);
}

/**
 * @param {string} [origin]
 */
export async function smokeRevHostedApi(origin = apiOrigin) {
  const paths = hostedRevApiPaths(origin);

  await smokeProductionHealth(origin);

  console.log(`\n▶ Smoke operator capabilities (${paths.capabilities})`);
  const { res: capsRes, body: capsBody } = await fetchJson(paths.capabilities, {
    headers: { Accept: "application/json" },
  });
  if (!capsRes.ok) {
    throw new Error(`capabilities failed (${capsRes.status})`);
  }
  const capsCheck = assertHostedExtensionEnabled(capsBody);
  if (!capsCheck.ok) throw new Error(capsCheck.message);
  console.log("capabilities OK (hosted_steward + billing_checkout endpoint)");

  console.log(`\n▶ Smoke operator plans (${paths.plans})`);
  const { res: plansRes, body: plansBody } = await fetchJson(paths.plans, {
    headers: { Accept: "application/json" },
  });
  if (plansRes.status === 404 && plansBody.error === "hosted_steward_disabled") {
    throw new Error(
      "Hosted steward disabled on this origin — deploy HOSTED_STEWARD_ENABLED=1"
    );
  }
  if (!plansRes.ok) {
    throw new Error(`operator/plans failed (${plansRes.status})`);
  }
  const plansCheck = assertRevenuePlansCatalog(plansBody);
  if (!plansCheck.ok) throw new Error(plansCheck.message);
  console.log("operator/plans OK (hosted_steward_v1 + hosted_game_season_v1)");

  console.log(`\n▶ Smoke billing/checkout route (${paths.billingCheckout})`);
  const { res: checkoutRes, body: checkoutBody } = await fetchJson(paths.billingCheckout, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ plan_id: "hosted_steward_v1" }),
  });
  const sessionCheck = assertBillingCheckoutRequiresSession(checkoutRes.status, checkoutBody);
  if (!sessionCheck.ok) throw new Error(sessionCheck.message);
  console.log("billing/checkout OK (401 without session)");

  const fakeToken = "test_session_token_for_checkout_probe_only";
  const { res: probeRes, body: probeBody } = await fetchJson(paths.billingCheckout, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${fakeToken}`,
    },
    body: JSON.stringify({ plan_id: "hosted_steward_v1", site_origin: origin }),
  });
  const stripeCheck = classifyBillingCheckoutConfigured(probeRes.status, probeBody);
  if (!stripeCheck.ok) throw new Error(stripeCheck.message);
  if (stripeCheck.configured) {
    console.log("billing/checkout OK (Stripe configured — invalid session rejected)");
  } else {
    console.log(
      "billing/checkout OK (503 billing_not_configured — set STRIPE_SECRET_KEY + prices before live checkout)"
    );
  }
}

/**
 * @param {string} [origin]
 */
export async function smokeRevPaidAccount(origin = apiOrigin) {
  const token = process.env.STEWARD_SESSION_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "STEWARD_SESSION_TOKEN is required for --paid (mint via npm run hosted:steward-session-local against production seed, or post-checkout session)"
    );
  }

  const expectPlan = process.env.EXPECT_PLAN_ID?.trim() || "";
  const deviceId = process.env.STEWARD_DEVICE_ID?.trim() || "devRevProdSmoke01";
  const seasonId = process.env.EXPECT_SEASON_ID?.trim() || "";
  const paths = hostedRevApiPaths(origin);
  const url = seasonId
    ? `${paths.entitlements}?season_id=${encodeURIComponent(seasonId)}`
    : paths.entitlements;

  console.log(`\n▶ Smoke paid entitlements (${url})`);
  const { res, body } = await fetchJson(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "X-HC-Device-Id": deviceId,
    },
  });

  if (!res.ok) {
    throw new Error(
      `entitlements failed (${res.status}): ${JSON.stringify(body).slice(0, 300)}`
    );
  }

  const paid = assertPaidStewardEntitlements(body, expectPlan || undefined);
  if (!paid.ok) throw new Error(paid.message);

  console.log(
    `entitlements OK (plan_id=${paid.planId}, status=${paid.status}, usage=${paid.hasUsage}, game_season=${paid.hasGameSeason})`
  );

  if (seasonId && !paid.hasGameSeason) {
    console.warn(
      `Warning: EXPECT_SEASON_ID=${seasonId} but response has no game_season block — check season link on account`
    );
  }
}

function printManualCheckoutReminder() {
  console.log("\nManual R3 close (human):");
  console.log("  1. Stripe test mode: complete checkout from /created/ upgrade CTA");
  console.log("  2. Confirm webhook updates steward_accounts.plan_id");
  console.log("  3. Re-run with session token:");
  console.log(
    "     STEWARD_SESSION_TOKEN=… EXPECT_PLAN_ID=hosted_steward_v1 npm run hosted:rev:prod-smoke -- --paid"
  );
}

async function main() {
  const preflight = process.argv.includes("--preflight");
  const api = process.argv.includes("--api");
  const paid = process.argv.includes("--paid");

  console.log("WS-REV R3 — hosted revenue production smoke");
  console.log(`API_ORIGIN=${apiOrigin}\n`);

  if (!preflight && !api && !paid) {
    console.log("Usage:");
    console.log("  npm run hosted:rev:prod-smoke -- --preflight");
    console.log("  npm run hosted:rev:prod-smoke -- --api");
    console.log(
      "  STEWARD_SESSION_TOKEN=… npm run hosted:rev:prod-smoke -- --paid"
    );
    console.log("  npm run hosted:rev:prod-smoke -- --preflight --api --paid");
    printManualCheckoutReminder();
    return;
  }

  if (preflight) runRevProdSmokePreflight();
  if (api) await smokeRevHostedApi(apiOrigin);
  if (paid) await smokeRevPaidAccount(apiOrigin);

  console.log("\n✅ WS-REV R3 smoke complete for requested modes.");
  if (!paid) printManualCheckoutReminder();
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
