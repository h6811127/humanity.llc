#!/usr/bin/env node
/**
 * WS-SCALE SC-3 — production registry 40/40 + C3 walk kit (engineering gate).
 *
 *   npm run city-game:scale-sc3
 *
 * Ops mint (hosted): npm run city-game:seed-production-wave-open -- --confirm-production
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  installQaRegistryNodeIds,
  LOCAL_DEV_INSTALL_QA_WALK_REL,
  resolveInstallQaWalkNodes,
} from "./city-game-install-qa-walk-core.mjs";
import {
  SUMMER_WAVE_OPEN_NODE_COUNT,
  validateSummerWaveOpenFootprint,
} from "./city-game-summer-scale-core.mjs";
import { planProductionWaveOpenMint } from "./city-game-production-wave-open-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");
const localSeedPath = join(root, "worker/.local/city-game-seed.json");
const prodSeedPath = join(root, "worker/.local/city-game-production-seed.json");
const walkPath = join(root, LOCAL_DEV_INSTALL_QA_WALK_REL);

function countSeedUrls(nodes) {
  return (nodes ?? []).filter((n) => n.scan_url || n.local_scan_url).length;
}

function main() {
  const season = JSON.parse(readFileSync(seasonPath, "utf8"));
  const onDiskCount = Array.isArray(season.nodes) ? season.nodes.length : 0;
  if (onDiskCount !== SUMMER_WAVE_OPEN_NODE_COUNT) {
    console.error(
      `Season JSON has ${onDiskCount}/${SUMMER_WAVE_OPEN_NODE_COUNT} nodes — npm run city-game:merge-wave-open -- --write`
    );
    process.exit(1);
  }

  const scale = validateSummerWaveOpenFootprint(season);

  /** @type {string[]} */
  const issues = [...scale.issues];
  const warnings = [...scale.warnings];

  let localSeed = null;
  if (existsSync(localSeedPath)) {
    localSeed = JSON.parse(readFileSync(localSeedPath, "utf8"));
  }
  const localUrlCount = countSeedUrls(localSeed?.nodes);
  if (localUrlCount < SUMMER_WAVE_OPEN_NODE_COUNT) {
    issues.push(
      `Local seed ${localUrlCount}/${SUMMER_WAVE_OPEN_NODE_COUNT} — npm run city-game:seed-wave-open`
    );
  }

  let prodCount = 0;
  let prodUrlCount = 0;
  if (existsSync(prodSeedPath)) {
    const prod = JSON.parse(readFileSync(prodSeedPath, "utf8"));
    prodCount = (prod.nodes ?? []).filter((n) => n.node_id).length;
    prodUrlCount = countSeedUrls(prod.nodes);
  } else {
    warnings.push(
      "No production seed file — npm run city-game:seed-production-wave-open -- --confirm-production"
    );
  }

  let walkNodeCount = 0;
  if (localSeed?.profile_id) {
    walkNodeCount = resolveInstallQaWalkNodes(
      localSeed.nodes ?? [],
      localSeed.profile_id,
      "127.0.0.1",
      installQaRegistryNodeIds(season)
    ).length;
  }
  if (!existsSync(walkPath)) {
    warnings.push("Walk kit missing — npm run city-game:install-qa-walk");
  } else if (walkNodeCount < SUMMER_WAVE_OPEN_NODE_COUNT) {
    issues.push(
      `Walk kit resolver ${walkNodeCount}/${SUMMER_WAVE_OPEN_NODE_COUNT} — regenerate install-qa-walk`
    );
  }

  console.log("WS-SCALE SC-3 — production 40/40 + C3 walk");
  console.log("  Season nodes:", scale.summary.nodeCount);
  console.log("  Local seed URLs:", localUrlCount, `/${SUMMER_WAVE_OPEN_NODE_COUNT}`);
  console.log(
    "  Production seed:",
    existsSync(prodSeedPath)
      ? `${prodCount} nodes · ${prodUrlCount} URLs`
      : "not on disk"
  );
  console.log("  C3 walk kit nodes:", walkNodeCount, `/${SUMMER_WAVE_OPEN_NODE_COUNT}`);

  for (const w of warnings) console.warn("  warn:", w);
  for (const i of issues) console.error("  fail:", i);

  const localEngineeringReady =
    scale.ok &&
    localUrlCount >= SUMMER_WAVE_OPEN_NODE_COUNT &&
    walkNodeCount >= SUMMER_WAVE_OPEN_NODE_COUNT;
  const prodReady =
    prodUrlCount >= SUMMER_WAVE_OPEN_NODE_COUNT &&
    prodCount >= SUMMER_WAVE_OPEN_NODE_COUNT;

  if (!localEngineeringReady) {
    console.error("\n✗ SC-3 failed — local/C3 engineering not ready.");
    process.exit(1);
  }

  console.log("\n☑ SC-3 local engineering — season + seed + walk kit at 40 nodes.");
  if (prodReady) {
    console.log("☑ Production seed 40/40 on disk.");
    console.log("  Next: npm run city-game:smoke-production · npm run city-game:smoke-production -- --all");
    console.log("  Physical B7: npm run city-game:install-qa-sign-off -- --pass --apply --phones 3 --nodes 40");
  } else if (existsSync(prodSeedPath)) {
    const prod = JSON.parse(readFileSync(prodSeedPath, "utf8"));
    const plan = planProductionWaveOpenMint({ season, seed: prod });
    console.log("☐ Production seed incomplete (ops gate).");
    console.log(`  Pending wave mint: ${plan.pendingCount} nodes (${plan.pendingNodeIds.slice(0, 3).join(", ")}…)`);
    console.log("  npm run city-game:seed-production-wave-open -- --dry-run");
    console.log("  npm run city-game:seed-production-wave-open -- --confirm-production");
    process.exit(2);
  } else {
    console.log("☐ Production seed incomplete (ops gate).");
    console.log("  npm run city-game:seed-production-wave-open -- --dry-run");
    process.exit(2);
  }
}

main();
