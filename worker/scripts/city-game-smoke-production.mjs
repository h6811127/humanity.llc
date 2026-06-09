#!/usr/bin/env node
/**
 * C4 — HTTP smoke for production Cedar Rapids game_node scans.
 *
 * Prerequisites:
 *   worker/.local/city-game-production-seed.json
 *   CITY_GAME_ENABLED=1 on production worker
 *
 * Usage:
 *   npm run city-game:smoke-production
 *   npm run city-game:smoke-production -- --all
 *   API_ORIGIN=https://humanity.llc npm run city-game:smoke-production
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assessGameScanHtml } from "./city-game-smoke-local-core.mjs";
import {
  selectProductionSmokeNodes,
  productionSmokeExpectationsForNode,
  isSeasonPlayOpenForSmoke,
  resolveProductionSmokeSeed,
} from "./city-game-smoke-production-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const prodSeedPath = join(root, "worker/.local/city-game-production-seed.json");
const seasonJsonPath = join(root, "site/data/city-game-cr-season-01.json");
const apiOrigin = (process.env.API_ORIGIN || "https://humanity.llc").replace(/\/$/, "");
const checkAll = process.argv.includes("--all");

async function main() {
  console.log("Cedar Rapids city game — production scan smoke (C4)\n");

  const health = await fetch(`${apiOrigin}/.well-known/hc/v1/health`).catch(() => null);
  if (!health?.ok) {
    console.error("Resolver not reachable at", apiOrigin);
    process.exit(1);
  }

  if (!existsSync(prodSeedPath)) {
    console.warn("Missing production seed:", prodSeedPath);
    console.warn("Falling back to season JSON scan_urls when aligned to season_root_profile_id.\n");
  }

  const rawSeed = existsSync(prodSeedPath) ? JSON.parse(readFileSync(prodSeedPath, "utf8")) : null;
  const season = existsSync(seasonJsonPath)
    ? JSON.parse(readFileSync(seasonJsonPath, "utf8"))
    : null;
  const seed = resolveProductionSmokeSeed(rawSeed, season);
  if (!seed) {
    console.error("No production scan URLs — add production seed or align season JSON.");
    process.exit(1);
  }
  const preLaunch = !isSeasonPlayOpenForSmoke(season);
  const targets = selectProductionSmokeNodes({ productionSeed: seed, checkAll });
  if (!targets.length) {
    console.error("No nodes to smoke-test in production seed");
    process.exit(1);
  }

  console.log("Profile:", seed.profile_id);
  if (preLaunch) {
    console.log("Season window not open yet — expecting dormant game scan template.\n");
  }
  console.log("Checking", targets.length, "node(s) at", apiOrigin, "\n");

  let failed = 0;
  for (const node of targets) {
    const url = String(node.scan_url ?? "");
    if (!url) {
      console.error("  ✗", node.node_id, "— no scan_url");
      failed++;
      continue;
    }

    const res = await fetch(url, { headers: { Accept: "text/html" } }).catch(() => null);
    if (!res?.ok) {
      console.error("  ✗", node.node_id, "— HTTP", res?.status ?? "fetch failed", url);
      failed++;
      continue;
    }

    const html = await res.text();
    const expect = productionSmokeExpectationsForNode(season, node.node_id);
    const result = assessGameScanHtml(html, {
      nodeId: node.node_id,
      label: preLaunch ? undefined : node.public_label,
      requireOnboarding: expect.requireOnboarding ?? false,
      requireContributeBlock: expect.requireContributeBlock ?? false,
      expectDormant: expect.expectDormant ?? false,
    });

    if (!result.ok) {
      console.error("  ✗", result.reason);
      failed++;
      continue;
    }

    console.log("  ✓", node.node_id, "·", node.public_label ?? node.node_id);
  }

  if (failed) {
    console.error("\n", failed, "check(s) failed.");
    console.error("Confirm CITY_GAME_ENABLED=1 on production and stickers match production seed QRs.");
    process.exit(1);
  }

  console.log("\n✅ Production scan smoke passed.");
  console.log("\nRecord E5 on launch checklist:");
  console.log("  npm run city-game:smoke-production-sign-off -- --pass --apply");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
