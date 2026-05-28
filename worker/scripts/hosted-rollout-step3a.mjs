/**
 * Hosted steward production rollout — step 3a (OPERATOR_AUDIT_TOKEN).
 *
 * Per HOSTED_TIER_IMPLEMENTATION_EPICS.md § Production rollout step 3 (required):
 *   Set OPERATOR_AUDIT_TOKEN on Worker + GitHub for E6.2 CI; verify steward-ops.
 *
 * Step 3b (STRIPE_WEBHOOK_SECRET) is deferred until G8 — use hosted:rollout:step3b.
 *
 * Usage:
 *   npm run hosted:rollout:step3a
 *   npm run hosted:rollout:step3a -- --smoke
 *   OPERATOR_AUDIT_TOKEN=... API_ORIGIN=https://humanity.llc npm run hosted:rollout:step3a
 *   API_ORIGIN=http://127.0.0.1:8787 npm run hosted:rollout:step3a -- --smoke
 *
 * @see docs/HOSTED_TIER_G0_READINESS.md § Secrets and flags
 * @see docs/HOSTED_STEWARD_OPS_RUNBOOK.md
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeOperatorAuditToken } from "./hosted-rollout-token.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const apiOrigin = (process.env.API_ORIGIN || "https://humanity.llc").replace(/\/$/, "");
const smoke = process.argv.includes("--smoke");
let token;
try {
  token = normalizeOperatorAuditToken(process.env.OPERATOR_AUDIT_TOKEN);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

export function printOperatorSecretSetup() {
  console.log("Step 3a — OPERATOR_AUDIT_TOKEN (required before E6.2 CI)\n");
  console.log("1. Generate a long random ASCII token (do not commit it).");
  console.log("2. Set on the production Worker:");
  console.log(
    `   cd worker && npx wrangler secret put OPERATOR_AUDIT_TOKEN --config wrangler.toml`
  );
  console.log("3. Add the same value as a GitHub repo secret for E6.2 daily CI:");
  console.log("   gh secret set OPERATOR_AUDIT_TOKEN --repo OWNER/REPO");
  console.log("   (Settings → Secrets → Actions on github.com)\n");
  console.log("See worker/.dev.vars.example for local dev (never commit real tokens).\n");
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

/**
 * Pre-secret smoke: route exists and rejects unauthenticated callers.
 *
 * @param {string} [origin]
 * @returns {Promise<"configured" | "unconfigured">}
 */
export async function smokeStewardOpsAuthGate(origin = apiOrigin) {
  const url = `${origin}/.well-known/hc/v1/operator/steward-ops`;
  console.log(`\n▶ Smoke steward-ops auth gate (${url})`);
  const { res, body } = await fetchJson(url, {
    headers: { Accept: "application/json" },
  });
  if (res.status === 401 && body.error === "UNAUTHORIZED") {
    console.log("steward-ops auth gate OK (401 without Bearer — secret configured on worker)");
    return "configured";
  }
  if (res.status === 503 && body.error === "OPERATOR_AUDIT_UNCONFIGURED") {
    console.log(
      "steward-ops reachable (503 OPERATOR_AUDIT_UNCONFIGURED — set wrangler secret, then re-run with token)"
    );
    return "unconfigured";
  }
  console.error(
    `expected 401 UNAUTHORIZED or 503 OPERATOR_AUDIT_UNCONFIGURED, got ${res.status} ${JSON.stringify(body).slice(0, 200)}`
  );
  process.exit(1);
}

/**
 * @param {string} bearerToken
 * @param {string} [origin]
 */
export async function verifyStewardOpsReachable(bearerToken, origin = apiOrigin) {
  const url = `${origin}/.well-known/hc/v1/operator/steward-ops`;
  console.log(`\n▶ Verify steward-ops (${url})`);
  const { res, body } = await fetchJson(url, {
    headers: { Authorization: `Bearer ${bearerToken}`, Accept: "application/json" },
  });
  if (res.status === 401 || res.status === 403) {
    console.error(
      "steward-ops rejected the token. Ensure wrangler secret matches OPERATOR_AUDIT_TOKEN."
    );
    process.exit(1);
  }
  if (body.schema === "missing") {
    console.error("steward-ops schema missing — run: npm run hosted:rollout:step1 -- --remote");
    process.exit(1);
  }
  if (!res.ok) {
    console.error(`steward-ops failed (${res.status}): ${JSON.stringify(body).slice(0, 200)}`);
    process.exit(1);
  }
  console.log(
    `steward-ops OK (hosted_steward_enabled=${String(body.hosted_steward_enabled)})`
  );
}

async function main() {
  console.log("Hosted steward rollout — step 3a (OPERATOR_AUDIT_TOKEN)");
  console.log("Docs: docs/HOSTED_TIER_IMPLEMENTATION_EPICS.md § Production rollout\n");

  printOperatorSecretSetup();

  if (smoke) {
    await smokeStewardOpsAuthGate();
  }

  if (!token) {
    console.log(
      "ℹ️  After setting secrets, verify with:\n" +
        "   OPERATOR_AUDIT_TOKEN=... API_ORIGIN=https://humanity.llc npm run hosted:rollout:step3a\n"
    );
    if (smoke) {
      console.log(
        "\n✅ Step 3a smoke OK (steward-ops route reachable). Set OPERATOR_AUDIT_TOKEN and re-run to verify bearer access."
      );
      console.log("Next: npm run hosted:rollout:step4a when ready to enable HOSTED_STEWARD_ENABLED.");
      return;
    }
    console.log(
      "\n⏭  Step 3a setup printed. Re-run with OPERATOR_AUDIT_TOKEN to verify.\n" +
        "    Optional: npm run hosted:rollout:step3a -- --smoke (no token — auth gate only)\n" +
        "    Step 3b (Stripe) is deferred until G8 — not required for step 4.\n" +
        "    Optional parallel: npm run hosted:rollout:step5 (ops dashboard + CI checklist)"
    );
    return;
  }

  await verifyStewardOpsReachable(token);
  runNpm("E6.2 threshold check (worker:check-steward-ops)", ["run", "worker:check-steward-ops"], {
    OPERATOR_AUDIT_TOKEN: token,
    API_ORIGIN: apiOrigin,
  });

  console.log("\n✅ Step 3a complete (OPERATOR_AUDIT_TOKEN verified on production).");
  console.log("Next: npm run hosted:rollout:step4a — enable HOSTED_STEWARD_ENABLED when ready for stewards.");
  console.log(
    "ℹ️  Step 3b (STRIPE_WEBHOOK_SECRET) deferred until G8 — npm run hosted:rollout:step3b for notes only."
  );
  console.log("ℹ️  Optional parallel: npm run hosted:rollout:step5 (CF dashboard + E6.2 CI secret checklist)");
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
