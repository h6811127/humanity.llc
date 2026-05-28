#!/usr/bin/env node
/**
 * Verify site/data/shop-config.json is ready for Tier 1 personalize checkout.
 * @see docs/MERCH_FUNNEL_MVP.md § Operator setup
 *
 * Usage:
 *   npm run merch-funnel:verify-config
 *   npm run merch-funnel:verify-config -- --require-checkout   # exit 1 when Tier 1 not ready
 *   npm run merch-funnel:verify-config -- --require-tier0=tier0_glitch_hoodie_v1
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { personalizeCatalogReadiness } from "../../site/js/shop-config-core.mjs";
import { tier0CatalogReadiness, tier0Products } from "../../site/js/shop-tier0-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const configPath = join(root, "site/data/shop-config.json");
const requireCheckout = process.argv.includes("--require-checkout");
const requireTier0Arg = process.argv.find((arg) => arg.startsWith("--require-tier0="));
const requireTier0ProductId = requireTier0Arg
  ? requireTier0Arg.slice("--require-tier0=".length).trim()
  : "";

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

const tier0Listed = tier0Products(config);
console.log(`\nTier 0 products (${tier0Listed.length} in shop-config):`);
for (const product of tier0Listed) {
  const open = product.checkout_open === true;
  console.log(
    `  - ${product.product_id}: checkout_open=${open ? "true" : "false"} · fulfillment=${product.fulfillment}`
  );
}

const tier0Check = tier0CatalogReadiness(config, {
  product_id: requireTier0ProductId || undefined,
});
if (tier0Check.products.length > 0) {
  console.log("\nTier 0 checkout-ready products:");
  for (const row of tier0Check.products) {
    const mark = row.ready ? "✅" : "☐";
    console.log(`  ${mark} ${row.product_id} → Worker ${row.worker_env} + TIER0_CAMPAIGN_PROFILE_ID`);
  }
  if (!tier0Check.ready) {
    console.log("\nTier 0 config gaps:\n");
    for (const issue of tier0Check.issues) {
      console.log(`  - ${issue}`);
    }
    console.log(
      "\nSee docs/COMPANY_MERCH_AND_COMMUNITY_CAMPAIGN.md · docs/SHOP_TIER0_IMPLEMENTATION.md"
    );
  }
} else {
  console.log("\nTier 0: no checkout_open products to validate (interest-only OK).");
}

if (requireCheckout && !ready) {
  process.exit(1);
}

if (requireTier0ProductId && !tier0Check.ready) {
  process.exit(1);
}
