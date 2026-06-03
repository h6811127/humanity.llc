#!/usr/bin/env node
/**
 * C3 physical install QA — LAN walk kit for 3 phones × 15 nodes.
 *
 *   npm run city-game:install-qa-walk
 *   npm run city-game:install-qa-walk -- --lan
 *
 * Open: http://<host>:8788/dev/city-game-install-qa-walk.html
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { detectLanHostFromInterfaces } from "./city-game-lan-hub-core.mjs";
import {
  buildInstallQaWalkKitHtml,
  formatInstallQaWalkKitReport,
  LOCAL_DEV_INSTALL_QA_WALK_REL,
  resolveInstallQaWalkNodes,
} from "./city-game-install-qa-walk-core.mjs";
import { INSTALL_QA_REQUIRED_NODE_COUNT } from "./city-game-smoke-local-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seedPath = join(root, "worker/.local/city-game-seed.json");
const outPath = join(root, LOCAL_DEV_INSTALL_QA_WALK_REL);
const lanMode = process.argv.includes("--lan");

function main() {
  if (!existsSync(seedPath)) {
    console.error("Missing seed — npm run city-game:seed-local -- --write-season");
    process.exit(1);
  }

  const host = lanMode
    ? detectLanHostFromInterfaces(networkInterfaces()) ?? "127.0.0.1"
    : "127.0.0.1";
  if (lanMode && host === "127.0.0.1") {
    console.warn("⚠ Could not detect LAN IP — using 127.0.0.1");
  }

  const seed = JSON.parse(readFileSync(seedPath, "utf8"));
  const nodes = resolveInstallQaWalkNodes(seed.nodes ?? [], seed.profile_id, host);
  if (nodes.length < INSTALL_QA_REQUIRED_NODE_COUNT) {
    console.error(`Seed has ${nodes.length}/${INSTALL_QA_REQUIRED_NODE_COUNT} nodes`);
    process.exit(1);
  }

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, buildInstallQaWalkKitHtml(nodes, { host }), "utf8");

  const walkUrl = `http://${host}:8788/dev/city-game-install-qa-walk.html`;
  console.log(formatInstallQaWalkKitReport({ nodeCount: nodes.length, walkUrl, host }));
  console.log("\nStart servers: npm run city-game:dev -- --lan");
}

main();
