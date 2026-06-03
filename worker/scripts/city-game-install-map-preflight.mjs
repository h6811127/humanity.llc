#!/usr/bin/env node
/**
 * O2 install map preflight — registry + node_14 contacts before C3 physical QA.
 *
 *   npm run city-game:install-map-preflight
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assessInstallMapReady,
  formatInstallMapPreflightReport,
  INSTALL_MAP_REL,
} from "./city-game-install-map-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const installMapPath = join(root, INSTALL_MAP_REL);
const localSeedPath = join(root, "worker/.local/city-game-seed.json");

function main() {
  const installMapDoc = existsSync(installMapPath) ? readFileSync(installMapPath, "utf8") : "";
  const localSeed = existsSync(localSeedPath)
    ? JSON.parse(readFileSync(localSeedPath, "utf8"))
    : null;

  const map = assessInstallMapReady({ installMapDoc, localSeed });
  console.log(formatInstallMapPreflightReport(map));

  if (map.issues.length) {
    process.exit(1);
  }
}

main();
