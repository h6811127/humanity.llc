#!/usr/bin/env node
/**
 * Engineering exit gate for merch funnel (Priority 1 code path).
 * Delegates Vitest/E2E to merch-funnel:rollout:step6; keeps wrangler route guard + scan merch test.
 *
 * Operator checkout readiness is separate: npm run merch-funnel:verify-config
 *
 * Usage:
 *   npm run merch-funnel:verify-exit
 *   npm run merch-funnel:verify-exit:fast   # --skip-e2e → step6 --preflight only
 *
 * @see docs/MERCH_FUNNEL_MVP.md § Tests
 * @see docs/MERCH_HEADLESS_COMMERCE.md
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * @param {string[]} args
 */
function run(args) {
  const result = spawnSync("npm", args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const toml = readFileSync(join(root, "worker/wrangler.toml"), "utf8");
if (!/pattern\s*=\s*"humanity\.llc\/v1\/\*"/.test(toml)) {
  console.error(
    "worker/wrangler.toml is missing humanity.llc/v1/* route (artifact intents + Shopify webhooks)."
  );
  console.error("See docs/MERCH_FUNNEL_MVP.md § Worker route (required)");
  process.exit(1);
}

const skipE2e = process.argv.includes("--skip-e2e");

console.log("Merch funnel engineering exit gate\n");
console.log("Docs: docs/MERCH_FUNNEL_MVP.md § Tests · rollout step 6\n");

if (skipE2e) {
  run(["run", "merch-funnel:rollout:step6", "--", "--preflight"]);
} else {
  run(["run", "merch-funnel:rollout:step6", "--", "--verify", "--skip-production-smoke"]);
}

run(["run", "worker:test", "--", "worker/tests/scan.test.ts", "-t", "merch"]);

console.log("\n✅ Merch funnel engineering gate passed.");
console.log("   Full close-out: npm run merch-funnel:rollout:complete -- --verify");
console.log("   Production smoke: npm run merch-funnel:rollout:post-deploy -- --all");
console.log("   Operator: merch-funnel:verify-config -- --require-checkout");
console.log("   Glitch checkout: merch-funnel:verify-config -- --require-tier0=tier0_glitch_hoodie_v1");
