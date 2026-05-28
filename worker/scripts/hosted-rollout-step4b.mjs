/**
 * Hosted steward production rollout — step 4b (deploy + smoke on production).
 *
 * Step 4a (wrangler.toml HOSTED_STEWARD_ENABLED=1) — `hosted:rollout:step4a`
 *
 * Usage:
 *   npm run hosted:rollout:step4b
 *   npm run hosted:rollout:step4b -- --preflight     # local migrations + Vitest before deploy
 *   npm run hosted:rollout:step4b -- --local-smoke   # smoke against worker:dev (127.0.0.1:8787)
 *   npm run hosted:rollout:step4b -- --deploy
 *   npm run hosted:rollout:step4b -- --smoke
 *   npm run hosted:rollout:step4b -- --verify
 *   npm run hosted:rollout:step4b -- --deploy --smoke
 *
 * @see docs/HOSTED_TIER_IMPLEMENTATION_EPICS.md § Production rollout
 * @see docs/STEWARD_DEVICE_ROADMAP.md § Current engineering steps #2
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertHostedFlagOnInToml,
  smokeProduction,
} from "./hosted-rollout-step4.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const preflight = process.argv.includes("--preflight");
const localSmoke = process.argv.includes("--local-smoke");
const forwardArgs = process.argv.slice(2).filter(
  (arg) => arg !== "--preflight" && arg !== "--local-smoke"
);

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

function printStep4bChecklist() {
  console.log("Step 4b — Deploy Worker with hosted flag on, then smoke production\n");
  console.log("Prerequisites: step 4a committed (HOSTED_STEWARD_ENABLED=1).\n");
  console.log("Engineering preflight (local):");
  console.log("   npm run hosted:rollout:step4b -- --preflight");
  console.log("   npm run worker:dev");
  console.log(
    "   API_ORIGIN=http://127.0.0.1:8787 npm run hosted:rollout:step4b -- --local-smoke\n"
  );
  console.log("Production:");
  console.log("   npm run hosted:rollout:step4b -- --deploy");
  console.log("   npm run hosted:rollout:step4b -- --smoke");
  console.log(
    "   OPERATOR_AUDIT_TOKEN=... API_ORIGIN=https://humanity.llc npm run hosted:rollout:step4b -- --verify\n"
  );
  console.log("Next after 4b: step 5a CF dashboard · step 5b CI · step 6 regression.");
}

function runPreflight() {
  console.log("Step 4b preflight — local gate before production deploy\n");
  assertHostedFlagOnInToml();
  runNpm("D1 migrations (local)", ["run", "worker:migrate:local"]);
  runNpm("Rollout step 4 smoke (Vitest)", [
    "run",
    "worker:test",
    "--",
    "worker/tests/hosted-rollout-step4-smoke.test.ts",
    "worker/tests/hosted-rollout-step4.test.ts",
  ]);
  runNpm("Hosted verify path (Vitest)", ["run", "hosted:rollout:verify-path"]);
  console.log("\n✅ Step 4b preflight OK.");
  console.log("Start worker:dev, then:");
  console.log("  API_ORIGIN=http://127.0.0.1:8787 npm run hosted:rollout:step4b -- --local-smoke");
  console.log("When ready for production:");
  console.log("  npm run hosted:rollout:step4b -- --deploy");
  console.log("  npm run hosted:rollout:step4b -- --smoke");
}

async function runLocalSmoke() {
  const origin = (process.env.API_ORIGIN || "http://127.0.0.1:8787").replace(/\/$/, "");
  console.log(`Step 4b local smoke (${origin})\n`);
  assertHostedFlagOnInToml();
  process.env.API_ORIGIN = origin;
  await smokeProduction();
  console.log("\n✅ Step 4b local smoke OK.");
}

function forwardToStep4() {
  const result = spawnSync(
    process.execPath,
    [path.join(__dirname, "hosted-rollout-step4.mjs"), ...forwardArgs],
    { cwd: repoRoot, stdio: "inherit", env: process.env }
  );
  process.exit(result.status ?? 1);
}

async function main() {
  console.log("Hosted steward rollout — step 4b");
  console.log("Docs: docs/HOSTED_TIER_IMPLEMENTATION_EPICS.md § Production rollout\n");

  if (preflight) {
    runPreflight();
    return;
  }

  if (localSmoke) {
    await runLocalSmoke();
    return;
  }

  if (forwardArgs.length === 0) {
    printStep4bChecklist();
    return;
  }

  forwardToStep4();
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
