#!/usr/bin/env node
/**
 * WS-SCALE SC-2 — mint wave 1 + install map QR readiness (engineering gate before field).
 *
 *   npm run city-game:scale-sc2
 *
 * Human/ops still required: season root custody, `city-game:mint-node`, physical install.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assessInstallMapReady, INSTALL_MAP_REL } from "./city-game-install-map-core.mjs";
import { cityGameSeasonReadiness } from "./city-game-season-readiness.mjs";
import { validateSummerOpenFootprint } from "./city-game-summer-scale-core.mjs";
import { INSTALL_QA_REQUIRED_NODE_COUNT } from "./city-game-smoke-local-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");
const installMapPath = join(root, INSTALL_MAP_REL);
const localSeedPath = join(root, "worker/.local/city-game-seed.json");

function main() {
  const season = JSON.parse(readFileSync(seasonPath, "utf8"));
  const scale = validateSummerOpenFootprint(season);
  const readiness = cityGameSeasonReadiness(season, { requireLaunch: false });
  const installMapDoc = readFileSync(installMapPath, "utf8");
  /** @type {{ nodes?: Array<{ node_id?: string; scan_url?: string; local_scan_url?: string }> } | null} */
  let localSeed = null;
  if (existsSync(localSeedPath)) {
    localSeed = JSON.parse(readFileSync(localSeedPath, "utf8"));
  }
  const map = assessInstallMapReady({ installMapDoc, localSeed });

  console.log("WS-SCALE SC-2 — mint wave 1 + install map");
  console.log("  Season nodes:", scale.summary.nodeCount);
  console.log("  Install map rows:", map.rowCount, `/${INSTALL_QA_REQUIRED_NODE_COUNT}`);
  console.log("  QR issued (map):", map.qrReady ? "☑" : `☐ (${map.qrPending.length} pending)`);
  console.log(
    "  Local seed URLs:",
    localSeed
      ? `${(localSeed.nodes ?? []).filter((n) => n.scan_url || n.local_scan_url).length}/${INSTALL_QA_REQUIRED_NODE_COUNT}`
      : "none — npm run city-game:seed-local"
  );

  /** @type {string[]} */
  const issues = [...scale.issues, ...readiness.issues, ...map.issues];
  if (!scale.ok) issues.push("SC-1 footprint validation failed — run npm run city-game:scale-sc1");
  if (!readiness.ready) issues.push("Season readiness failed");
  if (scale.summary.nodeCount < INSTALL_QA_REQUIRED_NODE_COUNT) {
    issues.push(`Season has ${scale.summary.nodeCount}/${INSTALL_QA_REQUIRED_NODE_COUNT} nodes`);
  }

  for (const w of [...scale.warnings, ...readiness.warnings, ...map.warnings]) {
    console.warn("  warn:", w);
  }
  for (const i of issues) console.error("  fail:", i);

  const engineeringReady =
    scale.ok && readiness.ready && map.rowCount >= INSTALL_QA_REQUIRED_NODE_COUNT;
  const mintReady = engineeringReady && map.qrReady;

  if (engineeringReady) {
    console.log("\n☑ SC-2 engineering gate — season JSON + install map registry at 40 nodes.");
    if (!mintReady) {
      console.log("  Next (ops):");
      console.log("    npm run city-game:seed-wave-open   # append node_16–40 to existing local seed");
      console.log("    # or full re-mint: npm run city-game:seed-local -- --force --write-season");
      console.log("    npm run city-game:install-map-sign-off -- --mark-qr-issued --apply");
      console.log("    npm run city-game:install-qa-preflight");
    } else {
      console.log("  QR column complete — npm run city-game:scale-sc2b (40-node scan smoke)");
      console.log("  Then: npm run city-game:install-qa-walk -- --lan · physical B7");
    }
  } else {
    console.error("\n✗ SC-2 preflight failed.");
    process.exit(1);
  }

  if (!mintReady) process.exit(2);
}

main();
