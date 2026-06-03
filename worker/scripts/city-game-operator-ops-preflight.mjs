#!/usr/bin/env node
/**
 * Operator ops preflight — O1 custody, O2 install map, O3 roster, O4 support.
 *
 *   npm run city-game:operator-ops-preflight
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { INSTALL_MAP_REL } from "./city-game-install-map-core.mjs";
import {
  assessOperatorOpsReady,
  CUSTODY_REL,
  formatOperatorOpsPreflightReport,
  LAUNCH_CHECKLIST_REL,
  SUPPORT_MACROS_REL,
  WEEKEND_SCHEDULE_REL,
} from "./city-game-operator-ops-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const localSeedPath = join(root, "worker/.local/city-game-seed.json");

function readOptional(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function main() {
  const ops = assessOperatorOpsReady({
    custodyDoc: readOptional(join(root, CUSTODY_REL)),
    weekendScheduleDoc: readOptional(join(root, WEEKEND_SCHEDULE_REL)),
    supportMacrosDoc: readOptional(join(root, SUPPORT_MACROS_REL)),
    installMapDoc: readOptional(join(root, INSTALL_MAP_REL)),
    launchChecklistDoc: readOptional(join(root, LAUNCH_CHECKLIST_REL)),
    localSeed: existsSync(localSeedPath) ? JSON.parse(readFileSync(localSeedPath, "utf8")) : null,
  });

  console.log(formatOperatorOpsPreflightReport(ops));
}

main();
