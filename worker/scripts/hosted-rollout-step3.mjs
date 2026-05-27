/**
 * Hosted steward production rollout — step 3 (production secrets).
 *
 * Per HOSTED_TIER_IMPLEMENTATION_EPICS.md § Production rollout (after G0):
 *   3. Set OPERATOR_AUDIT_TOKEN (Worker wrangler secret + GitHub repo secret)
 *   3b. STRIPE_WEBHOOK_SECRET — only after G8 (instructions only unless --stripe-check)
 *
 * Usage:
 *   npm run hosted:rollout:step3
 *   OPERATOR_AUDIT_TOKEN=... API_ORIGIN=https://humanity.llc npm run hosted:rollout:step3
 *
 * @see docs/HOSTED_TIER_G0_READINESS.md § Secrets and flags
 * @see docs/HOSTED_STEWARD_OPS_RUNBOOK.md
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const apiOrigin = (process.env.API_ORIGIN || "https://humanity.llc").replace(/\/$/, "");
const token = process.env.OPERATOR_AUDIT_TOKEN?.trim();
const stripeCheck = process.argv.includes("--stripe-check");

function printOperatorSecretSetup() {
  console.log("Step 3a — OPERATOR_AUDIT_TOKEN (required before E6.2 CI)\n");
  console.log("1. Generate a long random token (do not commit it).");
  console.log("2. Set on the production Worker:");
  console.log(
    `   cd worker && npx wrangler secret put OPERATOR_AUDIT_TOKEN --config wrangler.toml`
  );
  console.log("3. Add the same value as a GitHub repo secret for E6.2 daily CI:");
  console.log("   gh secret set OPERATOR_AUDIT_TOKEN --repo OWNER/REPO");
  console.log("   (Settings → Secrets → Actions in github.com)\n");
}

function printStripeSecretNote() {
  console.log("Step 3b — STRIPE_WEBHOOK_SECRET (defer until G8 / Stripe production confirmed)\n");
  console.log("When ready:");
  console.log(
    `   cd worker && npx wrangler secret put STRIPE_WEBHOOK_SECRET --config wrangler.toml`
  );
  console.log("Register webhook → POST …/operator/billing/webhook per E5 docs.\n");
}

/**
 * @param {string} label
 * @param {string[]} args
 * @param {Record<string, string | undefined>} [env]
 */
function runNpm(label, args, env = process.env) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync("npm", args, {
    cwd: repoRoot,
    env: { ...process.env, ...env },
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

/**
 * @param {string} bearerToken
 */
async function verifyStewardOpsReachable(bearerToken) {
  const url = `${apiOrigin}/.well-known/hc/v1/operator/steward-ops`;
  console.log(`\n▶ Verify steward-ops (${url})`);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${bearerToken}`, Accept: "application/json" },
  });
  const text = await res.text();
  if (res.status === 401 || res.status === 403) {
    console.error(
      "steward-ops rejected the token. Ensure wrangler secret matches OPERATOR_AUDIT_TOKEN."
    );
    process.exit(1);
  }
  if (!res.ok) {
    console.error(`steward-ops failed (${res.status}): ${text.slice(0, 200)}`);
    process.exit(1);
  }
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    console.error("steward-ops response was not JSON.");
    process.exit(1);
  }
  if (body.schema === "missing") {
    console.error("steward-ops schema missing — run hosted:rollout:step1 -- --remote first.");
    process.exit(1);
  }
  console.log(
    `steward-ops OK (hosted_steward_enabled=${String(body.hosted_steward_enabled)})`
  );
}

async function main() {
  console.log("Hosted steward rollout — step 3 (production secrets)");
  console.log("Docs: docs/HOSTED_TIER_IMPLEMENTATION_EPICS.md § Production rollout\n");

  printOperatorSecretSetup();

  if (!token) {
    console.log(
      "ℹ️  Set OPERATOR_AUDIT_TOKEN in env and re-run to verify production steward-ops:\n" +
        "   OPERATOR_AUDIT_TOKEN=... API_ORIGIN=https://humanity.llc npm run hosted:rollout:step3\n"
    );
  } else {
    await verifyStewardOpsReachable(token);
    runNpm("E6.2 threshold check (worker:check-steward-ops)", ["run", "worker:check-steward-ops"], {
      OPERATOR_AUDIT_TOKEN: token,
      API_ORIGIN: apiOrigin,
    });
    console.log("\n✅ OPERATOR_AUDIT_TOKEN verified on production.");
  }

  if (stripeCheck) {
    printStripeSecretNote();
    console.log(
      "ℹ️  Stripe webhook cannot be auto-verified without a signed test event. Confirm in Stripe dashboard after secret is set."
    );
  } else {
    printStripeSecretNote();
    console.log("ℹ️  Re-run with --stripe-check after G8 to repeat Stripe setup notes.");
  }

  if (token) {
    console.log("\n✅ Step 3 complete (operator token). Next: step 4 — enable HOSTED_STEWARD_ENABLED=1 when ready.");
  } else {
    console.log("\n⏭  Complete wrangler + GitHub secrets above, then re-run with OPERATOR_AUDIT_TOKEN to verify.");
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
