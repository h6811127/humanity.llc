#!/usr/bin/env node
/**
 * WS-REV R5 — production rollout orchestration (after R4).
 *
 *   npm run hosted:rev:rollout              # playbook
 *   npm run hosted:rev:rollout -- --preflight
 *   npm run hosted:rev:rollout -- --api
 *   npm run hosted:rev:rollout -- --post-deploy
 *   npm run hosted:rev:rollout -- --preflight --api
 *   npm run hosted:rev:rollout -- --step1-remote
 *   npm run hosted:rev:rollout -- --deploy
 *   npm run hosted:rev:rollout -- --pages
 *
 * @see docs/HOSTED_TIER_G0_READINESS.md
 * @see docs/HOSTED_TIER_IMPLEMENTATION_EPICS.md § Production rollout #1
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runPostDeploySmoke } from "./hosted-rollout-post-deploy-smoke.mjs";
import { readWranglerHostedFlag } from "./hosted-rollout-step4a.mjs";
import {
  assertCreatedHostedPanelPageHtml,
  governanceR4Recorded,
  revRolloutPlaybookLines,
} from "./hosted-rev-rollout-core.mjs";
import {
  runRevProdSmokePreflight,
  smokeRevHostedApi,
  smokeRevPaidAccount,
} from "./hosted-rev-prod-smoke.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const pricingDoc = path.join(repoRoot, "docs/HOSTED_TIER_PRICING_AND_SLA.md");

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

function warnGovernance() {
  if (!existsSync(pricingDoc)) {
    console.warn("⚠  Missing HOSTED_TIER_PRICING_AND_SLA.md — confirm R4 sign-off manually.");
    return;
  }
  const content = readFileSync(pricingDoc, "utf8");
  if (!governanceR4Recorded(content)) {
    console.warn(
      "⚠  R4 governance sign-off not detected — run: npm run hosted:rev:m4-sign-off -- --pass --apply"
    );
  }
}

function printHostedFlagHint() {
  const flag = readWranglerHostedFlag();
  if (flag === true) {
    console.log("wrangler.toml: HOSTED_STEWARD_ENABLED=1");
  } else if (flag === false) {
    console.log("wrangler.toml: HOSTED_STEWARD_ENABLED=0 (enable via hosted:rollout:step4a --apply)");
  }
}

async function main() {
  const preflight = process.argv.includes("--preflight");
  const api = process.argv.includes("--api");
  const paid = process.argv.includes("--paid");
  const postDeploy = process.argv.includes("--post-deploy");
  const step1Remote = process.argv.includes("--step1-remote");
  const deploy = process.argv.includes("--deploy");
  const pages = process.argv.includes("--pages");

  if (!preflight && !api && !paid && !postDeploy && !step1Remote && !deploy && !pages) {
    warnGovernance();
    printHostedFlagHint();
    for (const line of revRolloutPlaybookLines({ apiOrigin })) {
      console.log(line);
    }
    return;
  }

  console.log("WS-REV R5 — production rollout");
  console.log(`API_ORIGIN=${apiOrigin}\n`);
  warnGovernance();
  printHostedFlagHint();

  if (preflight) {
    runNpm("WS-REV R4 desk preflight", ["run", "hosted:rev:m4:preflight"]);
    runRevProdSmokePreflight();
  }
  if (step1Remote) {
    runNpm("Hosted rollout step 1 (D1 remote — 0012/0013/0031)", [
      "run",
      "hosted:rollout:step1",
      "--",
      "--remote",
    ]);
    console.log("\n▶ WS-REV verify production plans after 0031");
    await smokeRevHostedApi(apiOrigin);
  }
  if (deploy) {
    runNpm("Worker deploy (checkout auth-before-Stripe + R1–R3)", ["run", "worker:deploy"]);
    console.log("\n▶ WS-REV API smoke after deploy");
    await smokeRevHostedApi(apiOrigin);
  }
  if (pages) {
    runNpm("Static site build", ["run", "build"]);
    runNpm("Cloudflare Pages deploy (site/)", ["run", "pages:deploy"]);
    const createdUrl = `${apiOrigin}/created/`;
    console.log(`\n▶ WS-REV R5 Pages smoke (${createdUrl})`);
    const res = await fetch(createdUrl, { headers: { Accept: "text/html" } });
    if (!res.ok) {
      throw new Error(`/created/ HTTP ${res.status}`);
    }
    const html = await res.text();
    const panel = assertCreatedHostedPanelPageHtml(html);
    if (!panel.ok) {
      throw new Error(`/created/ panel check failed: ${panel.issues.join("; ")}`);
    }
    console.log("/created/ OK (Usage & limits panel on Manage + created-hub.mjs?v=5)");
  }
  if (api) await smokeRevHostedApi(apiOrigin);
  if (paid) await smokeRevPaidAccount(apiOrigin);
  if (postDeploy) {
    runPostDeploySmoke({ verify: true, extraEnv: { API_ORIGIN: apiOrigin } });
    if (readWranglerHostedFlag() === true) {
      await smokeRevHostedApi(apiOrigin);
    } else {
      console.log("\nSkipping WS-REV API smoke (HOSTED_STEWARD_ENABLED≠1 in wrangler.toml).");
    }
  }

  console.log("\n✅ WS-REV R5 step complete.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
