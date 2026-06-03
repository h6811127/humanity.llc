#!/usr/bin/env node
/**
 * O2 install map — operator sign-off recorder.
 *
 *   npm run city-game:install-map-sign-off -- --mark-qr-issued --apply
 *   npm run city-game:install-map-sign-off -- --mark-installed --apply
 *   npm run city-game:install-map-sign-off -- --mark-o2 --apply
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyInstallMapInstalledPass,
  applyInstallMapQrIssuedPass,
  applyLaunchChecklistO2Pass,
  assessInstallMapReady,
  INSTALL_MAP_REL,
  LAUNCH_CHECKLIST_REL,
  parseInstallMapRegistry,
  parseInstallMapSignOffArgs,
  resolveInstallMapSignOffAction,
} from "./city-game-install-map-core.mjs";
import { INSTALL_QA_REQUIRED_NODE_COUNT } from "./city-game-smoke-local-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const localSeedPath = join(root, "worker/.local/city-game-seed.json");

function main() {
  const parsed = parseInstallMapSignOffArgs(process.argv.slice(2));
  const action = resolveInstallMapSignOffAction(parsed);

  console.log(`Install map sign-off — ${action}\n`);
  console.log(`  Date: ${parsed.dateIso}`);

  if (!parsed.apply) {
    console.log("\n(Dry run — pass --apply to update docs.)");
    return;
  }

  const installMapPath = join(root, INSTALL_MAP_REL);
  let installMapDoc = readFileSync(installMapPath, "utf8");
  const rows = parseInstallMapRegistry(installMapDoc);
  const nodeIds = rows.map((row) => row.node_id);

  if (action === "mark-qr-issued") {
    if (!existsSync(localSeedPath)) {
      console.error("Missing local seed — npm run city-game:seed-local");
      process.exit(1);
    }
    const seed = JSON.parse(readFileSync(localSeedPath, "utf8"));
    const count = (seed.nodes ?? []).filter(
      (node) => node.node_id && (node.scan_url || node.local_scan_url)
    ).length;
    if (count < INSTALL_QA_REQUIRED_NODE_COUNT) {
      console.error(`Local seed has ${count}/${INSTALL_QA_REQUIRED_NODE_COUNT} nodes`);
      process.exit(1);
    }
    installMapDoc = applyInstallMapQrIssuedPass(installMapDoc, nodeIds);
    writeFileSync(installMapPath, installMapDoc, "utf8");
    console.log(`\nUpdated: ${INSTALL_MAP_REL} (QR issued ×${nodeIds.length})`);
    return;
  }

  if (action === "mark-installed") {
    installMapDoc = applyInstallMapInstalledPass(installMapDoc, nodeIds);
    writeFileSync(installMapPath, installMapDoc, "utf8");
    console.log(`\nUpdated: ${INSTALL_MAP_REL} (Installed ×${nodeIds.length})`);
    return;
  }

  const assessment = assessInstallMapReady({ installMapDoc });
  if (!assessment.qrReady || !assessment.installedReady) {
    console.error("\nCannot mark O2 — install map QR issued + Installed must be ☑ for all 15 nodes.");
    process.exit(1);
  }
  if (!assessment.contactsReady) {
    console.error("\nCannot mark O2 — fill node_14 steward contacts (remove [fill] placeholders).");
    process.exit(1);
  }

  const launchPath = join(root, LAUNCH_CHECKLIST_REL);
  let launchDoc = readFileSync(launchPath, "utf8");
  launchDoc = applyLaunchChecklistO2Pass(launchDoc, parsed);
  writeFileSync(launchPath, launchDoc, "utf8");
  console.log(`\nUpdated: ${LAUNCH_CHECKLIST_REL} (O2)`);
}

main();
