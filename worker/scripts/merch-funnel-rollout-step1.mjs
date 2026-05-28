/**
 * Merch funnel close-out — step 1 (local shop-config preflight).
 *
 * Validates site/data/shop-config.json and runs merch funnel Vitest bundle.
 *
 * Usage:
 *   npm run merch-funnel:rollout:step1
 *   npm run merch-funnel:rollout:step1 -- --strict   # fail if launch SKU not checkout-ready
 *
 * @see docs/MERCH_HEADLESS_COMMERCE.md § Operator setup checklist
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateShopConfig } from "../../site/js/shop-config-rollout-core.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const shopConfigPath = path.join(repoRoot, "site/data/shop-config.json");

const strict = process.argv.includes("--strict");

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

/**
 * @param {string[]} items
 * @param {"error" | "warn"} kind
 */
function printList(items, kind) {
  const prefix = kind === "error" ? "✗" : "⚠";
  for (const item of items) {
    console.log(`  ${prefix} ${item}`);
  }
}

function main() {
  console.log("Merch funnel rollout — step 1 (local shop-config preflight)");
  console.log("Docs: docs/MERCH_HEADLESS_COMMERCE.md § Operator setup checklist\n");

  let config;
  try {
    config = JSON.parse(readFileSync(shopConfigPath, "utf8"));
  } catch (err) {
    console.error(`Failed to read ${shopConfigPath}:`, err instanceof Error ? err.message : err);
    process.exit(1);
  }

  const result = validateShopConfig(config, { strictLaunch: strict, label: "repo shop-config" });
  if (result.errors.length) {
    console.log("Config errors:");
    printList(result.errors, "error");
  }
  if (result.warnings.length) {
    console.log("\nConfig warnings:");
    printList(result.warnings, "warn");
  }
  if (!result.errors.length && !result.warnings.length) {
    console.log("✓ shop-config.json validation passed");
  }

  console.log("\nLaunch SKU status:");
  console.log(`  checkout_product_id: ${result.launchProductId ?? "(unset)"}`);
  console.log(`  launch SKU checkout-ready: ${result.launchSkuReady ? "yes" : "no"}`);
  console.log(`  tier0 checkout open: ${result.tier0CheckoutOpen ? "yes" : "no"}`);

  if (!result.ok) {
    console.error("\nFix shop-config.json before deploy. See docs/MERCH_HEADLESS_COMMERCE.md § 3.");
    process.exit(1);
  }

  runNpm("Merch funnel Vitest bundle", ["run", "worker:test:merch-funnel"]);
  runNpm("Shop config rollout tests", [
    "run",
    "worker:test",
    "--",
    "worker/tests/shop-config-rollout.test.ts",
  ]);

  console.log(
    "\n✅ Step 1 complete (local preflight). Next:\n" +
      "   npm run merch-funnel:rollout:step2 -- --verify   # after Pages deploy\n" +
      "   npm run merch-funnel:rollout:step3 -- --verify   # Worker API smoke"
  );
}

main();
