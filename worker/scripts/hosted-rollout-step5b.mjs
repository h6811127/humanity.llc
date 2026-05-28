/**
 * Hosted steward production rollout — step 5b (E6.2 CI preflight + verify).
 *
 * Step 5a (CF dashboard pin) — `hosted:rollout:step5a` (manual, run first)
 *
 * Usage:
 *   npm run hosted:rollout:step5b
 *   npm run hosted:rollout:step5b -- --preflight
 *   npm run hosted:rollout:step5b -- --verify
 *   OPERATOR_AUDIT_TOKEN=... API_ORIGIN=https://humanity.llc npm run hosted:rollout:step5b -- --verify
 *
 * @see docs/HOSTED_STEWARD_OPS_RUNBOOK.md
 * @see docs/HOSTED_TIER_IMPLEMENTATION_EPICS.md § Production rollout step 5b
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertDeployWorkerUsesOperatorToken,
  assertE62WorkflowPresent,
  runStep5PreflightVitest,
} from "./hosted-rollout-step5.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const preflight = process.argv.includes("--preflight");
const forwardArgs = process.argv.slice(2).filter((arg) => arg !== "--preflight");

function printStep5bChecklist() {
  console.log("Step 5b — E6.2 daily CI secret + production verify\n");
  console.log("Prerequisites: step 4b production verify passed.\n");
  console.log("Manual first (after step 5a preflight):");
  console.log("   npm run hosted:rollout:step5a -- --preflight");
  console.log("   npm run hosted:rollout:step5a\n");
  console.log("Engineering preflight (local):");
  console.log("   npm run hosted:rollout:step5b -- --preflight\n");
  console.log("Production verify:");
  console.log("   npm run hosted:rollout:step5b -- --verify");
  console.log(
    "   OPERATOR_AUDIT_TOKEN=... API_ORIGIN=https://humanity.llc npm run hosted:rollout:step5b -- --verify\n"
  );
  console.log("Next after 5b: npm run hosted:rollout:step6 -- --verify");
}

function runPreflight() {
  console.log("Step 5b preflight — local gate before E6.2 production verify\n");
  assertE62WorkflowPresent();
  assertDeployWorkerUsesOperatorToken();
  runStep5PreflightVitest();
  console.log("\n✅ Step 5b preflight OK.");
  console.log("Complete step 5a (CF dashboard pin) manually if not done, then:");
  console.log("  npm run hosted:rollout:step5b -- --verify");
  console.log(
    "  OPERATOR_AUDIT_TOKEN=... API_ORIGIN=https://humanity.llc npm run hosted:rollout:step5b -- --verify"
  );
}

function forwardToStep5() {
  const result = spawnSync(
    process.execPath,
    [path.join(__dirname, "hosted-rollout-step5.mjs"), ...forwardArgs],
    { cwd: repoRoot, stdio: "inherit", env: process.env }
  );
  process.exit(result.status ?? 1);
}

function main() {
  console.log("Hosted steward rollout — step 5b (E6.2 CI)");
  console.log("Docs: docs/HOSTED_TIER_IMPLEMENTATION_EPICS.md § Production rollout\n");

  if (preflight) {
    runPreflight();
    return;
  }

  if (forwardArgs.length === 0) {
    printStep5bChecklist();
    return;
  }

  forwardToStep5();
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isCli) {
  main();
}
