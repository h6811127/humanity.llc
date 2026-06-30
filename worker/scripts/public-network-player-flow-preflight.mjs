#!/usr/bin/env node
/**
 * Agent D player flow preflight — engineering kit + human sign-off status.
 *
 *   npm run player-flow:preflight
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assessPlayerFlowFieldKitReady } from "./public-network-player-flow-field-kit-core.mjs";
import {
  formatPlayerFlowPreflightReport,
  INSTALL_QA_REL,
  playerFlowHumanSignedOff,
} from "./public-network-player-flow-sign-off-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function main() {
  const kit = assessPlayerFlowFieldKitReady(root, { requireProduction: true });
  const installPath = join(root, INSTALL_QA_REL);
  const installQa = existsSync(installPath) ? readFileSync(installPath, "utf8") : "";
  const humanSignedOff = playerFlowHumanSignedOff(installQa);

  console.log(
    formatPlayerFlowPreflightReport({
      fieldKitReady: kit.ready,
      humanSignedOff,
    })
  );

  if (kit.issues.length) {
    console.log("\nKit issues:");
    for (const issue of kit.issues) console.log(`  · ${issue}`);
  }

  process.exit(kit.ready ? 0 : 1);
}

main();
