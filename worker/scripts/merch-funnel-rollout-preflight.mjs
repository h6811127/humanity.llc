/**
 * Shared local preflight helpers for merch-funnel:rollout:step* scripts.
 *
 * @see docs/MERCH_HEADLESS_COMMERCE.md § Production rollout commands
 */
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const wranglerToml = path.join(repoRoot, "worker/wrangler.toml");

/**
 * @param {string} label
 * @param {string[]} args
 */
export function runNpm(label, args) {
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

export function assertMerchV1RouteInWrangler() {
  if (!existsSync(wranglerToml)) {
    console.error("Missing worker/wrangler.toml");
    process.exit(1);
  }
  const toml = readFileSync(wranglerToml, "utf8");
  if (!toml.includes('pattern = "humanity.llc/v1/*"')) {
    console.error('✗ Missing route pattern humanity.llc/v1/* in worker/wrangler.toml');
    process.exit(1);
  }
  console.log("✓ worker/wrangler.toml routes humanity.llc/v1/*");
}

export function runMerchRolloutPreflightVitest() {
  runNpm("Merch rollout unit tests (preflight)", [
    "run",
    "worker:test",
    "--",
    "worker/tests/merch-funnel-rollout.test.ts",
    "worker/tests/merch-funnel-rollout-post-deploy.test.ts",
    "worker/tests/shop-config-rollout.test.ts",
    "worker/tests/wrangler-merch-routes.test.ts",
    "worker/tests/store-routes-dispatch.test.ts",
    "worker/tests/store-rows-handler.test.ts",
  ]);
}
