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
import {
  installQaRegistryNodeIds,
  LOCAL_DEV_INSTALL_QA_WALK_REL,
  resolveInstallQaWalkNodes,
} from "./city-game-install-qa-walk-core.mjs";
import { INSTALL_QA_REQUIRED_NODE_COUNT } from "./city-game-smoke-local-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const installQaPath = join(root, INSTALL_QA_REL);
const installMapPath = join(root, INSTALL_MAP_REL);
const seasonPath = join(root, "site/data/city-game-cr-season-01.json");
const walkKitPath = join(root, LOCAL_DEV_INSTALL_QA_WALK_REL);
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

  let walkKit = { ready: false, linked: 0, registry: 0 };
  if (localSeed?.profile_id) {
    const season = readJsonOptional(seasonPath);
    const registryNodeIds = installQaRegistryNodeIds(season);
    const nodes = resolveInstallQaWalkNodes(
      localSeed.nodes ?? [],
      localSeed.profile_id,
      "127.0.0.1",
      registryNodeIds
    );
    walkKit = {
      registry: nodes.length,
      linked: nodes.filter((n) => n.href).length,
      ready: false,
    };
    walkKit.ready =
      existsSync(walkKitPath) &&
      walkKit.registry >= INSTALL_QA_REQUIRED_NODE_COUNT &&
      walkKit.linked >= INSTALL_QA_REQUIRED_NODE_COUNT;
    if (!walkKit.ready && walkKit.linked >= INSTALL_QA_REQUIRED_NODE_COUNT) {
      c3.warnings.push("LAN walk HTML missing or stale — npm run city-game:install-qa-walk -- --lan");
    } else if (walkKit.linked < INSTALL_QA_REQUIRED_NODE_COUNT) {
      c3.warnings.push(
        `LAN walk resolver ${walkKit.linked}/${INSTALL_QA_REQUIRED_NODE_COUNT} linked — npm run city-game:seed-local`
      );
    }
  }

  console.log(
    formatInstallQaPreflightReport({
      ...c3,
      humanSignedOff: humanSignedOff(installQaDoc),
      walkKit,
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
