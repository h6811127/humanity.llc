#!/usr/bin/env node
/** Patch worker/.dev.vars for city game local dev (no server start). */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { detectLanHostFromInterfaces } from "./city-game-lan-hub-core.mjs";
import { ensureCityGameDevVars } from "./city-game-local-env-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const devVarsPath = join(root, "worker/.dev.vars");
const lanMode = process.argv.includes("--lan");

const host = lanMode
  ? detectLanHostFromInterfaces(networkInterfaces())
  : "127.0.0.1";

if (!host) {
  console.error("Could not detect LAN IP");
  process.exit(1);
}

const prior = existsSync(devVarsPath) ? readFileSync(devVarsPath, "utf8") : "";
const patch = ensureCityGameDevVars(prior, { host, lan: lanMode });
writeFileSync(devVarsPath, patch.text, "utf8");
console.log("✓", devVarsPath);
console.log("  ", patch.resolverOrigin, patch.pagesOrigin);
