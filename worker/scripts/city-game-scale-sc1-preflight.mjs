#!/usr/bin/env node
/**
 * WS-SCALE SC-1 — registry + JSON ~40 nodes preflight.
 *
 *   npm run city-game:scale-sc1
 *   node worker/scripts/merge-city-game-wave-open.mjs   # dry-run merge check
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { cityGameSeasonReadiness } from "./city-game-season-readiness.mjs";
import { validateSeasonFootprintFromRegistry } from "./city-game-summer-scale-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");
const mergeScript = join(root, "worker/scripts/merge-city-game-wave-open.mjs");

function main() {
  let season = JSON.parse(readFileSync(seasonPath, "utf8"));
  const onDiskCount = Array.isArray(season.nodes) ? season.nodes.length : 0;

  const merge = spawnSync(process.execPath, [mergeScript], {
    cwd: root,
    encoding: "utf8",
  });
  if (merge.status !== 0) {
    console.error(merge.stderr || merge.stdout);
    process.exit(merge.status ?? 1);
  }
  console.log(merge.stdout.trim());

  if (onDiskCount !== 40) {
    console.error(
      `\n✗ Season JSON on disk has ${onDiskCount} nodes (need 40 for summer open).`
    );
    console.error("  Run: npm run city-game:merge-wave-open");
    console.error("  Then: npm run city-game:build-registry && npm run city-game:scale-sc1");
    process.exit(1);
  }

  season = JSON.parse(readFileSync(seasonPath, "utf8"));
  const scale = validateSeasonFootprintFromRegistry(season);
  const readiness = cityGameSeasonReadiness(season, { requireLaunch: false });

  console.log("\nWS-SCALE SC-1 — summer-open footprint");
  console.log("  Nodes:", scale.summary.nodeCount);
  console.log("  Classes:", JSON.stringify(scale.summary.classCounts));
  console.log("  Districts:", JSON.stringify(scale.summary.districtCounts));
  console.log("  Relay capture:", scale.summary.relayCaptureCount);

  for (const w of scale.warnings) console.warn("  warn:", w);
  for (const i of scale.issues) console.error("  fail:", i);
  for (const w of readiness.warnings) console.warn("  readiness warn:", w);
  for (const i of readiness.issues) console.error("  readiness fail:", i);

  const ok = scale.ok && readiness.ready;
  if (ok) {
    console.log("\n☑ SC-1 engineering preflight pass — next: SC-2 mint wave 1 + install map QR.");
  } else {
    console.error("\n✗ SC-1 preflight failed.");
    process.exit(1);
  }
}

main();
