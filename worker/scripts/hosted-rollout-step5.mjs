/**
 * Hosted steward production rollout — step 5b–d (E6.2 CI + verify).
 *
 * Step 5a (CF dashboard pin) — hosted:rollout:step5a
 *
 * Usage:
 *   npm run hosted:rollout:step5
 *   npm run hosted:rollout:step5 -- --verify
 *   OPERATOR_AUDIT_TOKEN=... API_ORIGIN=https://humanity.llc npm run hosted:rollout:step5 -- --verify
 *
 * @see docs/HOSTED_STEWARD_OPS_RUNBOOK.md
 * @see docs/HOSTED_TIER_G0_READINESS.md § Ops checklist
 */
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeOperatorAuditToken } from "./hosted-rollout-token.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const opsRunbookDoc = "docs/HOSTED_STEWARD_OPS_RUNBOOK.md";
const e62Workflow = ".github/workflows/steward-ops-daily.yml";

const apiOrigin = (process.env.API_ORIGIN || "https://humanity.llc").replace(/\/$/, "");
const verify = process.argv.includes("--verify");
let token;
try {
  token = normalizeOperatorAuditToken(process.env.OPERATOR_AUDIT_TOKEN);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

function printGithubSecretSetup() {
  const repo = resolveGithubRepo();
  console.log("Step 5b — GitHub secret for E6.2 daily CI\n");
  console.log("The same OPERATOR_AUDIT_TOKEN from step 3a must exist as a repo Actions secret.");
  console.log(`   gh secret set OPERATOR_AUDIT_TOKEN --repo ${repo}`);
  console.log("   (GitHub → Settings → Secrets and variables → Actions)\n");
}

function printRunbookReview() {
  console.log("Step 5c — Review ops runbook\n");
  console.log(`Read ${opsRunbookDoc} § Daily check and Incident responses.\n`);
}

function printE62WorkflowNote() {
  console.log("Step 5d — Confirm E6.2 workflow");
  console.log(`   Workflow: ${e62Workflow} (daily 14:00 UTC + workflow_dispatch)`);
  console.log("   After secret is set: Actions → Steward ops daily → Run workflow\n");
}

/**
 * @returns {string}
 */
function resolveGithubRepo() {
  const fromEnv = process.env.GITHUB_REPOSITORY?.trim();
  if (fromEnv) return fromEnv;
  const result = spawnSync("git", ["remote", "get-url", "origin"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const url = result.stdout?.trim() ?? "";
  const match = url.match(/github\.com[:/](.+?)(?:\.git)?$/);
  return match?.[1] ?? "OWNER/REPO";
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

function assertE62WorkflowPresent() {
  const workflowPath = path.join(repoRoot, e62Workflow);
  if (!existsSync(workflowPath)) {
    console.error(`Missing E6.2 workflow: ${e62Workflow}`);
    process.exit(1);
  }
  const workflow = readFileSync(workflowPath, "utf8");
  if (!workflow.includes("OPERATOR_AUDIT_TOKEN")) {
    console.error(`${e62Workflow} must pass secrets.OPERATOR_AUDIT_TOKEN to worker:check-steward-ops.`);
    process.exit(1);
  }
  console.log(`✓ ${e62Workflow} references OPERATOR_AUDIT_TOKEN`);
}

/**
 * @returns {boolean | null} true = secret listed, false = missing, null = could not check
 */
function checkGithubSecretListed() {
  const repo = resolveGithubRepo();
  console.log(`\n▶ GitHub secret check (${repo})`);
  const result = spawnSync("gh", ["secret", "list", "--repo", repo], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    console.log(
      "ℹ️  Could not list GitHub secrets (install/auth gh CLI). Confirm OPERATOR_AUDIT_TOKEN in repo Settings."
    );
    return null;
  }
  const listed = result.stdout.split("\n").some((line) => line.startsWith("OPERATOR_AUDIT_TOKEN"));
  if (listed) {
    console.log("✓ OPERATOR_AUDIT_TOKEN is listed in GitHub Actions secrets");
  } else {
    console.error("OPERATOR_AUDIT_TOKEN not found in GitHub Actions secrets.");
  }
  return listed;
}

async function main() {
  console.log("Hosted steward rollout — step 5 (E6.2 CI + verify)");
  console.log("Docs: docs/HOSTED_TIER_IMPLEMENTATION_EPICS.md § Production rollout\n");

  console.log("ℹ️  Step 5a (CF dashboard) is manual — run first if not done:");
  console.log("   npm run hosted:rollout:step5a\n");

  printGithubSecretSetup();
  printRunbookReview();
  printE62WorkflowNote();

  if (!verify) {
    console.log("⏭  After step 5a + GitHub secret are set:");
    console.log("   npm run hosted:rollout:step5 -- --verify");
    console.log(
      "   OPERATOR_AUDIT_TOKEN=... API_ORIGIN=https://humanity.llc npm run hosted:rollout:step5 -- --verify"
    );
    return;
  }

  assertE62WorkflowPresent();
  const secretListed = checkGithubSecretListed();
  if (secretListed === false) {
    process.exit(1);
  }

  if (!token) {
    console.log(
      "\nℹ️  Set OPERATOR_AUDIT_TOKEN to run the same threshold check as E6.2 CI:\n" +
        "   OPERATOR_AUDIT_TOKEN=... API_ORIGIN=https://humanity.llc npm run hosted:rollout:step5 -- --verify"
    );
    console.log("\n⏭  Complete step 5a (CF dashboard pin) manually, then re-run with token.");
    return;
  }

  runNpm("E6.2 threshold check (worker:check-steward-ops)", ["run", "worker:check-steward-ops"], {
    OPERATOR_AUDIT_TOKEN: token,
    API_ORIGIN: apiOrigin,
  });

  console.log("\n✅ Step 5 verified (E6.2 path). Next: npm run hosted:rollout:step6 -- --verify");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
