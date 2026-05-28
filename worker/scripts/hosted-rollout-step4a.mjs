/**
 * Hosted steward production rollout — step 4a (enable hosted flag in wrangler.toml).
 *
 * Per HOSTED_TIER_IMPLEMENTATION_EPICS.md § Production rollout step 4 (first):
 *   Set HOSTED_STEWARD_ENABLED = "1" in worker/wrangler.toml, then commit and deploy (step 4b).
 *
 * Usage:
 *   npm run hosted:rollout:step4a
 *   npm run hosted:rollout:step4a -- --apply
 *
 * @see docs/HOSTED_TIER_G0_READINESS.md § Secrets and flags
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wranglerToml = path.join(__dirname, "../wrangler.toml");

const apply = process.argv.includes("--apply");

/**
 * @returns {boolean | null}
 */
export function readWranglerHostedFlag() {
  const toml = readFileSync(wranglerToml, "utf8");
  const match = toml.match(/^\s*HOSTED_STEWARD_ENABLED\s*=\s*"([^"]+)"/m);
  if (!match) return null;
  return match[1] === "1" || match[1].toLowerCase() === "true";
}

function printEnableFlagInstructions() {
  console.log("Step 4a — Enable HOSTED_STEWARD_ENABLED in worker/wrangler.toml\n");
  console.log("Prerequisites: steps 1–3a complete (migrations, deploy with flag off, OPERATOR_AUDIT_TOKEN).\n");
  console.log('1. Set in worker/wrangler.toml [vars]: HOSTED_STEWARD_ENABLED = "1"');
  console.log("   Or apply locally:");
  console.log("   npm run hosted:rollout:step4a -- --apply\n");
  console.log("2. Commit worker/wrangler.toml and deploy (step 4b):");
  console.log("   npm run hosted:rollout:step4 -- --deploy");
  console.log("   (or push worker/ to main — deploy-worker.yml)\n");
}

function applyHostedFlagOn() {
  const toml = readFileSync(wranglerToml, "utf8");
  if (!/^\s*HOSTED_STEWARD_ENABLED\s*=/m.test(toml)) {
    console.error("HOSTED_STEWARD_ENABLED not found in worker/wrangler.toml [vars].");
    process.exit(1);
  }
  const current = readWranglerHostedFlag();
  if (current === true) {
    console.log('✓ worker/wrangler.toml already has HOSTED_STEWARD_ENABLED = "1"');
    return;
  }
  const updated = toml.replace(
    /^(\s*HOSTED_STEWARD_ENABLED\s*=\s*)"[^"]*"/m,
    '$1"1"'
  );
  if (updated === toml) {
    console.error("Could not update HOSTED_STEWARD_ENABLED in worker/wrangler.toml.");
    process.exit(1);
  }
  writeFileSync(wranglerToml, updated, "utf8");
  console.log('✓ Set HOSTED_STEWARD_ENABLED = "1" in worker/wrangler.toml');
  console.log("  Commit this file, then: npm run hosted:rollout:step4 -- --deploy");
}

function main() {
  console.log("Hosted steward rollout — step 4a (enable hosted flag in wrangler.toml)");
  console.log("Docs: docs/HOSTED_TIER_IMPLEMENTATION_EPICS.md § Production rollout\n");

  const flag = readWranglerHostedFlag();
  if (flag === true) {
    console.log('ℹ️  worker/wrangler.toml already has HOSTED_STEWARD_ENABLED = "1".');
  } else if (flag === false) {
    console.log('ℹ️  worker/wrangler.toml still has HOSTED_STEWARD_ENABLED = "0".\n');
  }

  if (apply) {
    applyHostedFlagOn();
    console.log("\n✅ Step 4a complete. Next: npm run hosted:rollout:step4 -- --deploy");
    return;
  }

  printEnableFlagInstructions();
  if (flag === true) {
    console.log("⏭  Flag already on in wrangler.toml — continue with step 4 deploy:");
    console.log("   npm run hosted:rollout:step4 -- --deploy");
  } else {
    console.log("⏭  Run with --apply to update wrangler.toml locally, then commit and deploy.");
  }
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isCli) {
  main();
}
