#!/usr/bin/env node
/**
 * Smoke-test local Cedar Rapids game_node scans after city-game:seed-local.
 *
 * Prerequisites:
 *   worker:dev running with CITY_GAME_ENABLED=1 in worker/.dev.vars
 *   worker/.local/city-game-seed.json from npm run city-game:seed-local
 *
 * Usage:
 *   API_ORIGIN=http://127.0.0.1:8787 npm run city-game:smoke-local
 *   npm run city-game:smoke-local -- --all   # all 15 nodes (slower)
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assessGameScanHtml,
  INSTALL_QA_SPOT_EXPECTATIONS,
  INSTALL_QA_SPOT_NODE_IDS,
  resolveSmokeScanUrl,
} from "./city-game-smoke-local-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seedPath = join(root, "worker/.local/city-game-seed.json");
const apiOrigin = (process.env.API_ORIGIN || "http://127.0.0.1:8787").replace(/\/$/, "");
const checkAll = process.argv.includes("--all");
const SPOT_NODES = new Set(INSTALL_QA_SPOT_NODE_IDS);

async function main() {
  console.log("Cedar Rapids city game — local scan smoke\n");

  const health = await fetch(`${apiOrigin}/.well-known/hc/v1/health`).catch(() => null);
  if (!health?.ok) {
    console.error("Resolver not reachable at", apiOrigin);
    console.error("Start: npm run worker:dev");
    process.exit(1);
  }

  if (!existsSync(seedPath)) {
    console.error("Missing seed file:", seedPath);
    console.error("Run: API_ORIGIN=%s npm run city-game:seed-local -- --write-season", apiOrigin);
    process.exit(1);
  }

  const seed = JSON.parse(readFileSync(seedPath, "utf8"));
  const nodes = Array.isArray(seed.nodes) ? seed.nodes : [];
  if (!nodes.length) {
    console.error("Seed file has no nodes[]");
    process.exit(1);
  }

  const targets = checkAll
    ? nodes
    : nodes.filter((n) => SPOT_NODES.has(n.node_id));

  if (!targets.length) {
    console.error("No nodes to smoke-test (need node_01, node_04, node_07 in seed)");
    process.exit(1);
  }

  console.log("Profile:", seed.profile_id);
  console.log("Checking", targets.length, "node(s) at", apiOrigin, "\n");

  let failed = 0;
  for (const node of targets) {
    const url = resolveSmokeScanUrl(apiOrigin, node.local_scan_url, node.scan_url);
    if (!url) {
      console.error("  ✗", node.node_id, "— no scan URL");
      failed++;
      continue;
    }

    const res = await fetch(url, { headers: { Accept: "text/html" } }).catch(() => null);
    if (!res?.ok) {
      console.error("  ✗", node.node_id, "— HTTP", res?.status ?? "fetch failed", url);
      if (res?.status === 404) {
        console.error("     Profile or QR not in local D1 — seed file is stale or DB was reset.");
        console.error("     Re-run: API_ORIGIN=%s npm run city-game:seed-local -- --write-season", apiOrigin);
      }
      failed++;
      continue;
    }

    const html = await res.text();
    const expect = INSTALL_QA_SPOT_EXPECTATIONS[node.node_id] ?? {};
    const result = assessGameScanHtml(html, {
      nodeId: node.node_id,
      label: node.public_label,
      requireCoopHint: expect.requireCoopHint ?? false,
      requireContributeBlock: expect.requireContributeBlock ?? false,
    });

    if (!result.ok) {
      console.error("  ✗", result.reason);
      failed++;
      continue;
    }

    console.log("  ✓", node.node_id, "·", node.public_label);
  }

  if (failed) {
    console.error("\n", failed, "check(s) failed.");
    console.error("If you saw HTTP 404: local D1 has no matching card/QR — re-seed (see above).");
    console.error("Otherwise confirm CITY_GAME_ENABLED=1 in worker/.dev.vars and restart worker:dev.");
    process.exit(1);
  }

  console.log("\n✅ Local scan smoke passed.");
  console.log("\nNext:");
  console.log("  • npm run city-game:install-qa-scenario — E2 scenario HTTP baseline");
  console.log("  • npm run city-game:smoke-contribute-local — autonomous quorum → cabinet");
  console.log("  • npm run city-game:smoke-contribute-local -- --spine — full fragment → finale");
  console.log("  • npm run city-game:install-qa-preflight — C3 before physical install");
  console.log("  • docs/CITY_GAME_COMPREHENSION_RUNBOOK.md — ≥5 testers before launch");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
