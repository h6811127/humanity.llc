/**
 * Merch funnel close-out — step 4 (Worker env + route checklist).
 *
 * Reads worker/wrangler.toml for Tier 1 Printify mappings and route patterns.
 *
 * Usage:
 *   npm run merch-funnel:rollout:step4
 *   npm run merch-funnel:rollout:step4 -- --strict   # fail if required env keys are commented out
 *
 * @see docs/MERCH_HEADLESS_COMMERCE.md § Configuration surfaces · Worker
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const wranglerToml = path.join(repoRoot, "worker/wrangler.toml");

const strict = process.argv.includes("--strict");

const STICKER_ENV_KEYS = [
  "PERSONALIZE_STICKER_PRINTIFY_PRODUCT_ID",
  "PERSONALIZE_STICKER_PRINTIFY_VARIANT_ID",
  "PERSONALIZE_STICKER_PRINTIFY_BLUEPRINT_ID",
  "PERSONALIZE_STICKER_PRINTIFY_PRINT_PROVIDER_ID",
];

const HOODIE_ENV_KEYS = [
  "PERSONALIZE_HOODIE_PRINTIFY_PRODUCT_ID",
  "PERSONALIZE_HOODIE_PRINTIFY_VARIANT_ID",
  "PERSONALIZE_HOODIE_PRINTIFY_BLUEPRINT_ID",
  "PERSONALIZE_HOODIE_PRINTIFY_PRINT_PROVIDER_ID",
];

const SHARED_ENV_KEYS = [
  "PRINTIFY_SUBMIT_ENABLED",
  "PRINTIFY_SHOP_ID",
];

/**
 * @param {string} toml
 * @param {string} key
 */
function envKeyPresent(toml, key) {
  const active = new RegExp(`^\\s*${key}\\s*=`, "m").test(toml);
  const commented = new RegExp(`^\\s*#\\s*${key}\\s*=`, "m").test(toml);
  return { active, commented, present: active || commented };
}

function main() {
  console.log("Merch funnel rollout — step 4 (Worker env checklist)");
  console.log("Docs: docs/MERCH_HEADLESS_COMMERCE.md § Worker — wrangler.toml + secrets\n");

  const toml = readFileSync(wranglerToml, "utf8");

  if (!toml.includes('pattern = "humanity.llc/v1/*"')) {
    console.error("✗ Missing route pattern humanity.llc/v1/* in worker/wrangler.toml");
    if (strict) process.exit(1);
  } else {
    console.log("✓ Route pattern humanity.llc/v1/* present");
  }

  /** @type {string[]} */
  const missingActive = [];

  for (const key of [...SHARED_ENV_KEYS, ...STICKER_ENV_KEYS, ...HOODIE_ENV_KEYS]) {
    const { active, commented } = envKeyPresent(toml, key);
    if (active) {
      console.log(`✓ ${key} set in [vars]`);
    } else if (commented) {
      console.log(`⚠ ${key} commented out (set before live Printify submit)`);
      if (strict) missingActive.push(key);
    } else {
      console.log(`⚠ ${key} not found in wrangler.toml`);
      if (strict) missingActive.push(key);
    }
  }

  console.log("\nHoodie blank: Champion S700 — blueprint 528");
  console.log("  npm run printify:lookup-blueprint -- 528");
  console.log("  https://printify.com/app/products/528/champion/champion-hoodie\n");
  console.log("  • PRINTIFY_API_TOKEN");
  console.log("  • SHOPIFY_WEBHOOK_SECRET");
  console.log("  • PRINTIFY_WEBHOOK_SECRET (O-003 status sync)");

  console.log("\nShopify webhook:");
  console.log("  POST https://humanity.llc/v1/webhooks/shopify/orders (orders/paid)");

  console.log("\nPost-payment ops (until fully automated):");
  console.log("  1. Mint:  POST /v1/print/orders/{id}/mint");
  console.log("  2. Submit: POST /v1/print/orders { commerce_order_id, submit_to_printify: true, shipping_address }");
  console.log("     (paste shipping from Shopify admin — not stored in D1)");

  if (strict && missingActive.length) {
    console.error(`\n✗ --strict: activate env keys in worker/wrangler.toml: ${missingActive.join(", ")}`);
    process.exit(1);
  }

  console.log(
    "\n✅ Step 4 checklist printed. Next:\n" +
      "   npm run merch-funnel:rollout:step5   # launch gates + physical QA\n" +
      "   npm run worker:deploy                # after env changes"
  );
}

main();
