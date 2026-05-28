#!/usr/bin/env node
/**
 * Engineering exit gate for merch funnel (Priority 1 code path).
 * Operator checkout readiness is separate: npm run merch-funnel:verify-config
 *
 * @see docs/MERCH_FUNNEL_MVP.md § Tests
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function run(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: false });
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

console.log("Merch funnel engineering exit gate\n");

run("npm", ["run", "worker:test:merch-funnel"]);
run("npm", ["run", "worker:test:merch-print-qa"]);
run("npm", ["run", "worker:test", "--", "worker/tests/scan.test.ts", "-t", "print_artifact"]);

const skipE2e = process.argv.includes("--skip-e2e");
if (!skipE2e) {
  run("npm", ["run", "e2e:merch-funnel"]);
} else {
  console.log("\n(skipped e2e — pass --skip-e2e only for fast CI subsets)\n");
}

run("npm", ["run", "merch-funnel:verify-config"]);

console.log("\n✅ Merch funnel engineering gate passed.");
console.log("   Operator: paste Shopify variant URLs, then merch-funnel:verify-config -- --require-checkout");
console.log("   Next: operator Tier 1 close-out (shop-config + live checkout) — docs/MERCH_FUNNEL_MVP.md Priority 1 operator");
