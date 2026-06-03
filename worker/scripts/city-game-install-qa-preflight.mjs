#!/usr/bin/env node
/**
 * C3 engineering preflight — install QA ready for physical gate.
 *
 *   npm run city-game:install-qa-preflight
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assessInstallQaEngineeringReady,
  formatInstallQaPreflightReport,
  INSTALL_QA_REL,
} from "./city-game-install-qa-core.mjs";
import { assessInstallMapReady, INSTALL_MAP_REL } from "./city-game-install-map-core.mjs";
import { installQaDocHasE2Pass } from "./city-game-install-qa-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const installQaPath = join(root, INSTALL_QA_REL);
const installMapPath = join(root, INSTALL_MAP_REL);
const localSeedPath = join(root, "worker/.local/city-game-seed.json");
const prodSeedPath = join(root, "worker/.local/city-game-production-seed.json");

function readJsonOptional(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

function humanSignedOff(content) {
  return content.includes("Physical install (≥3 phones × 15 nodes) | ☑");
}

function main() {
  const installQaDoc = existsSync(installQaPath) ? readFileSync(installQaPath, "utf8") : "";
  const installMapDoc = existsSync(installMapPath) ? readFileSync(installMapPath, "utf8") : "";
  const localSeed = readJsonOptional(localSeedPath);
  const c3 = assessInstallQaEngineeringReady({
    installQaDoc,
    localSeed,
    productionSeed: readJsonOptional(prodSeedPath),
  });
  const installMap = assessInstallMapReady({ installMapDoc, localSeed });

  console.log(
    formatInstallQaPreflightReport({
      ...c3,
      humanSignedOff: humanSignedOff(installQaDoc),
      installMap: {
        qrReady: installMap.qrReady,
        installedReady: installMap.installedReady,
        contactsReady: installMap.contactsReady,
        readyForPhysicalQa: installMap.readyForPhysicalQa,
      },
      e2SignedOff: installQaDocHasE2Pass(installQaDoc),
    })
  );

  if (!c3.ready) {
    process.exit(1);
  }
}

main();
