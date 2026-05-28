/**
 * Merch funnel close-out — step 2 (deployed Pages shop-config smoke).
 *
 * Fetches /data/shop-config.json from SITE_ORIGIN and validates launch readiness.
 *
 * Usage:
 *   npm run merch-funnel:rollout:step2
 *   npm run merch-funnel:rollout:step2 -- --preflight   # local shop-config only (no fetch)
 *   SITE_ORIGIN=https://humanity.llc npm run merch-funnel:rollout:step2 -- --verify
 *   npm run merch-funnel:rollout:step2 -- --verify --strict
 *
 * @see docs/MERCH_HEADLESS_COMMERCE.md § 3. humanity.llc config
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  compareShopConfigDrift,
  validateShopConfig,
} from "../../site/js/shop-config-rollout-core.mjs";
import { runMerchRolloutPreflightVitest } from "./merch-funnel-rollout-preflight.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const shopConfigPath = path.join(repoRoot, "site/data/shop-config.json");

const siteOrigin = (process.env.SITE_ORIGIN || "https://humanity.llc").replace(/\/$/, "");
const preflight = process.argv.includes("--preflight");
const verify = process.argv.includes("--verify");
const strict = process.argv.includes("--strict");

/**
 * @param {string[]} items
 */
function printWarnings(items) {
  for (const item of items) {
    console.log(`  ⚠ ${item}`);
  }
}

function printChecklist() {
  console.log("Step 2 — deployed Pages config smoke\n");
  console.log("  0. Local preflight: npm run merch-funnel:rollout:step2 -- --preflight");
  console.log("  1. Edit site/data/shop-config.json (launch SKU checkout_url + shopify_variant_id)");
  console.log("  2. npm run pages:deploy");
  console.log("  3. Verify deployed config:");
  console.log(`     SITE_ORIGIN=${siteOrigin} npm run merch-funnel:rollout:step2 -- --verify`);
  console.log("\nDrift check compares repo file vs deployed /data/shop-config.json.");
}

function runPreflight() {
  console.log("Step 2 preflight — local shop-config gate (no SITE_ORIGIN fetch)\n");
  let config;
  try {
    config = JSON.parse(readFileSync(shopConfigPath, "utf8"));
  } catch (err) {
    console.error(`Failed to read ${shopConfigPath}:`, err instanceof Error ? err.message : err);
    process.exit(1);
  }
  const result = validateShopConfig(config, { strictLaunch: strict, label: "repo shop-config" });
  if (result.errors.length) {
    for (const err of result.errors) console.log(`  ✗ ${err}`);
    process.exit(1);
  }
  if (result.warnings.length) {
    for (const warn of result.warnings) console.log(`  ⚠ ${warn}`);
  } else {
    console.log("✓ repo shop-config.json validation passed");
  }
  runMerchRolloutPreflightVitest();
  console.log("\n✅ Step 2 preflight OK.");
  console.log("Next: npm run pages:deploy");
  console.log(`  SITE_ORIGIN=${siteOrigin} npm run merch-funnel:rollout:step2 -- --verify`);
}

async function fetchDeployedConfig() {
  const url = `${siteOrigin}/data/shop-config.json`;
  console.log(`\n▶ Fetch deployed config (${url})`);
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await res.text();
  if (!res.ok) {
    console.error(`shop-config fetch failed (${res.status}): ${text.slice(0, 300)}`);
    process.exit(1);
  }
  try {
    return JSON.parse(text);
  } catch {
    console.error("Deployed shop-config.json is not valid JSON.");
    process.exit(1);
  }
}

async function main() {
  console.log("Merch funnel rollout — step 2 (deployed Pages config)");
  console.log("Docs: docs/MERCH_HEADLESS_COMMERCE.md § 3\n");

  if (preflight) {
    runPreflight();
    return;
  }

  if (!verify) {
    printChecklist();
    console.log("\n⏭  Run with --verify after Pages deploy.");
    return;
  }

  let localConfig = null;
  try {
    localConfig = JSON.parse(readFileSync(shopConfigPath, "utf8"));
  } catch {
    console.warn("Could not read repo shop-config.json for drift comparison.");
  }

  const remoteConfig = await fetchDeployedConfig();
  const result = validateShopConfig(remoteConfig, {
    strictLaunch: strict,
    label: "deployed shop-config",
  });

  if (result.errors.length) {
    console.log("\nDeployed config errors:");
    for (const err of result.errors) console.log(`  ✗ ${err}`);
  }
  if (result.warnings.length) {
    console.log("\nDeployed config warnings:");
    printWarnings(result.warnings);
  }
  if (!result.errors.length && !result.warnings.length) {
    console.log("✓ deployed shop-config.json validation passed");
  }

  if (localConfig) {
    const drift = compareShopConfigDrift(localConfig, remoteConfig);
    if (drift.length) {
      console.log("\nRepo vs deployed drift:");
      printWarnings(drift);
      console.log("\nIf repo is ahead, run: npm run pages:deploy");
    } else {
      console.log("\n✓ No checkout gate drift between repo and deployed config");
    }
  }

  console.log("\nLaunch SKU status (deployed):");
  console.log(`  checkout_product_id: ${result.launchProductId ?? "(unset)"}`);
  console.log(`  launch SKU checkout-ready: ${result.launchSkuReady ? "yes" : "no"}`);

  if (!result.ok) {
    process.exit(1);
  }

  console.log("\n✅ Step 2 complete. Next: npm run merch-funnel:rollout:step3 -- --verify");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
