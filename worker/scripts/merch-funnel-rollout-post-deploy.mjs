/**
 * Post-deploy verify for merch funnel rollout (CI gates after Pages / Worker deploy).
 *
 * Usage:
 *   npm run merch-funnel:rollout:post-deploy -- --pages
 *   npm run merch-funnel:rollout:post-deploy -- --worker
 *   SITE_ORIGIN=https://humanity.llc npm run merch-funnel:rollout:post-deploy -- --pages
 *   API_ORIGIN=https://humanity.llc npm run merch-funnel:rollout:post-deploy -- --worker
 *
 * @see docs/MERCH_HEADLESS_COMMERCE.md § Production rollout commands
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const siteOrigin = (process.env.SITE_ORIGIN || "https://humanity.llc").replace(/\/$/, "");
const apiOrigin = (process.env.API_ORIGIN || "https://humanity.llc").replace(/\/$/, "");

/**
 * @param {string[]} argv
 * @returns {"pages" | "worker" | null}
 */
export function postDeployMerchTarget(argv = process.argv) {
  if (argv.includes("--pages")) return "pages";
  if (argv.includes("--worker")) return "worker";
  return null;
}

/**
 * @param {"pages" | "worker"} target
 * @returns {string}
 */
export function postDeployMerchScript(target) {
  return target === "pages" ? "merch-funnel:rollout:step2" : "merch-funnel:rollout:step3";
}

/**
 * @param {{ target?: "pages" | "worker"; extraEnv?: Record<string, string | undefined> }} [opts]
 */
export function runPostDeployMerchVerify(opts = {}) {
  const target = opts.target ?? postDeployMerchTarget();
  if (!target) {
    throw new Error("Specify --pages (step 2) or --worker (step 3)");
  }
  const script = postDeployMerchScript(target);
  const origin = target === "pages" ? siteOrigin : apiOrigin;
  const envKey = target === "pages" ? "SITE_ORIGIN" : "API_ORIGIN";
  console.log(`Post-deploy merch verify (${target}, ${script}) → ${origin}`);
  const result = spawnSync("npm", ["run", script, "--", "--verify"], {
    cwd: repoRoot,
    stdio: "inherit",
    shell: false,
    env: { ...process.env, ...opts.extraEnv, [envKey]: origin },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function main() {
  const target = postDeployMerchTarget();
  console.log("Merch funnel rollout — post-deploy verify");
  console.log("Docs: docs/MERCH_HEADLESS_COMMERCE.md § Production rollout commands\n");
  if (!target) {
    console.error("Usage:");
    console.error("  npm run merch-funnel:rollout:post-deploy -- --pages");
    console.error("  npm run merch-funnel:rollout:post-deploy -- --worker");
    process.exit(1);
  }
  runPostDeployMerchVerify({ target });
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isCli) {
  main();
}
