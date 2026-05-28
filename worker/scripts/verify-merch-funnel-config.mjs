#!/usr/bin/env node
/**
 * Verify site/data/shop-config.json is ready for Tier 1 personalize checkout.
 * @see docs/MERCH_FUNNEL_MVP.md § Operator setup
 *
 * Usage:
 *   npm run merch-funnel:verify-config
 *   npm run merch-funnel:verify-config -- --require-checkout   # exit 1 when not ready
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { personalizeCatalogReadiness } from "../../site/js/shop-config-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const configPath = join(root, "site/data/shop-config.json");
const requireCheckout = process.argv.includes("--require-checkout");

let config;
try {
  config = JSON.parse(readFileSync(configPath, "utf8"));
} catch (err) {
  console.error(`Could not read ${configPath}:`, err instanceof Error ? err.message : err);
  process.exit(1);
}

const { ready, issues } = personalizeCatalogReadiness(config);

console.log(`Merch funnel config: ${configPath}\n`);

if (ready) {
  console.log("✅ Tier 1 personalize catalog is ready for checkout.");
  console.log("   Next: deploy Pages + Worker, then one test order → Printify submit.");
} else {
  console.log("☐ Tier 1 personalize catalog is not checkout-ready:\n");
  for (const issue of issues) {
    console.log(`  - ${issue}`);
  }
  console.log("\nSee docs/MERCH_FUNNEL_MVP.md § Operator setup and site/data/shop-config.example.json");
}

const tier0Open = config?.tier0?.checkout_open === true;
console.log(`\nTier 0 checkout_open: ${tier0Open ? "true" : "false"}`);

if (requireCheckout && !ready) {
  process.exit(1);
}
