#!/usr/bin/env node
/**
 * WS-OBJECT-GRAPH dual-gate field walk kit (manual D0–D3).
 *
 *   npm run ws-object-graph:dual-gate-walk
 *   npm run ws-object-graph:dual-gate-walk -- --production
 *
 * @see docs/WS_OBJECT_GRAPH_DUAL_GATE_WALK_V1.md
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  resolveLocalCabinetSmokeUrls,
  resolveProdCabinetSmokeUrls,
} from "./ws-object-graph-prod-smoke-core.mjs";
import {
  LOCAL_DUAL_GATE_WALK_REL,
  buildDualGateWalkKitHtml,
  formatDualGateWalkKitReport,
  validateDualGateWalkKitHtml,
} from "./ws-object-graph-dual-gate-walk-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seedPath = join(root, "worker/.local/city-game-seed.json");
const productionMode = process.argv.includes("--production");

function main() {
  const urls = productionMode
    ? {
        ...resolveProdCabinetSmokeUrls("https://humanity.llc"),
        siteCodes: { witness: "CR-WITNS-4P", quorum: "CR-LANTERN-7K" },
        labels: {
          cabinet: "Czech Village cabinet",
          library: "Library witness seal",
          river: "Riverwalk River Lantern",
        },
      }
    : resolveLocalCabinetSmokeUrls(
        JSON.parse(readFileSync(seedPath, "utf8")),
        process.env.API_ORIGIN || "http://127.0.0.1:8787"
      );

  const html = buildDualGateWalkKitHtml({
    cabinetScan: urls.cabinetScan,
    libraryScan: urls.libraryScan,
    riverScan: urls.riverScan,
    siteCodes: urls.siteCodes,
    labels: urls.labels,
    production: productionMode,
  });

  const outPath = productionMode
    ? join(root, "site/play/cedar-rapids/comprehension/dual-gate-walk.html")
    : join(root, LOCAL_DUAL_GATE_WALK_REL);

  if (!productionMode && !existsSync(seedPath)) {
    console.error("Missing city-game-seed.json — run npm run city-game:seed-local");
    process.exit(1);
  }

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, html, "utf8");

  const validation = validateDualGateWalkKitHtml(html, outPath.replace(`${root}/`, ""));
  if (!validation.ok) {
    console.error("Dual-gate walk kit validation failed:");
    for (const issue of validation.issues) console.error(`  ✗ ${issue}`);
    process.exit(1);
  }

  const walkUrl = productionMode
    ? "https://humanity.llc/play/cedar-rapids/comprehension/dual-gate-walk.html"
    : `http://127.0.0.1:8788/dev/ws-object-graph-v1/dual-gate-walk.html`;

  console.log(
    formatDualGateWalkKitReport({
      walkUrl,
      cabinetScan: urls.cabinetScan,
      production: productionMode,
    })
  );
  console.log(`\nWrote ${outPath.replace(`${root}/`, "")}`);
}

main();
