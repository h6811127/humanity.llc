/**
 * Post-deploy smoke/verify for hosted steward rollout (step 4b CI gate).
 *
 * Reads HOSTED_STEWARD_ENABLED from worker/wrangler.toml and runs the
 * matching check against API_ORIGIN (default production).
 *
 * Usage:
 *   npm run hosted:rollout:post-deploy-smoke
 *   npm run hosted:rollout:post-deploy-smoke -- --verify
 *   API_ORIGIN=http://127.0.0.1:8787 npm run hosted:rollout:post-deploy-smoke
 *
 * @see docs/HOSTED_TIER_IMPLEMENTATION_EPICS.md § Production rollout step 4b
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readWranglerHostedFlag } from "./hosted-rollout-step4a.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const apiOrigin = (process.env.API_ORIGIN || "https://humanity.llc").replace(/\/$/, "");

/**
 * @returns {"step4" | "step2" | null}
 */
export function postDeploySmokeTarget() {
  const flag = readWranglerHostedFlag();
  if (flag === true) return "step4";
  if (flag === false) return "step2";
  return null;
}

/**
 * @param {boolean} [verify]
 * @returns {"--verify" | "--smoke"}
 */
export function postDeployCheckFlag(verify = false) {
  return verify ? "--verify" : "--smoke";
}

/**
 * @param {{ verify?: boolean, extraEnv?: Record<string, string | undefined> }} [opts]
 */
export function runPostDeploySmoke(opts = {}) {
  const verify = opts.verify ?? process.argv.includes("--verify");
  const target = postDeploySmokeTarget();
  if (!target) {
    throw new Error("HOSTED_STEWARD_ENABLED missing from worker/wrangler.toml");
  }
  const script = target === "step4" ? "hosted:rollout:step4" : "hosted:rollout:step2";
  const checkFlag = postDeployCheckFlag(verify && target === "step4");
  const mode = checkFlag === "--verify" ? "verify" : "smoke";
  console.log(
    `Post-deploy ${mode} (${target}, HOSTED_STEWARD_ENABLED=${target === "step4" ? "1" : "0"}) → ${apiOrigin}`
  );
  const result = spawnSync("npm", ["run", script, "--", checkFlag], {
    cwd: repoRoot,
    stdio: "inherit",
    shell: false,
    env: { ...process.env, ...opts.extraEnv, API_ORIGIN: apiOrigin },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function main() {
  const verify = process.argv.includes("--verify");
  console.log(
    verify
      ? "Hosted steward rollout — post-deploy verify (step 4b)"
      : "Hosted steward rollout — post-deploy smoke (step 4b)"
  );
  console.log("Docs: docs/HOSTED_TIER_IMPLEMENTATION_EPICS.md § step 4b\n");
  runPostDeploySmoke({ verify });
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isCli) {
  main();
}
