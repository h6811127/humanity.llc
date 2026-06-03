#!/usr/bin/env node
/**
 * C5 launch checklist preflight — P1–P5 + O1–O4 gate status.
 *
 *   npm run city-game:launch-checklist-preflight
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assessLaunchChecklistReady,
  formatLaunchChecklistPreflightReport,
  LAUNCH_CHECKLIST_REL,
} from "./city-game-launch-checklist-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function main() {
  const checklistPath = join(root, LAUNCH_CHECKLIST_REL);
  const launchChecklistDoc = existsSync(checklistPath) ? readFileSync(checklistPath, "utf8") : "";

  const c5 = assessLaunchChecklistReady({
    launchChecklistDoc,
    scanAnalyticsGateOk: true,
  });

  console.log(formatLaunchChecklistPreflightReport(c5));

  if (!c5.allRequiredSigned) {
    process.exit(1);
  }
}

main();
