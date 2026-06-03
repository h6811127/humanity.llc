#!/usr/bin/env node
/**
 * C3 physical install QA — operator sign-off recorder.
 *
 *   npm run city-game:install-qa-sign-off -- --pass --apply --phones 3 --nodes 15
 *   npm run city-game:install-qa-sign-off -- --scenario-pass --apply
 *   npm run city-game:install-qa-sign-off -- --fail
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyInstallQaE2Pass,
  applyInstallQaPhysicalPass,
  applyLaunchChecklistP2Pass,
  INSTALL_QA_REL,
  installQaSignOffSummaryLines,
  LAUNCH_CHECKLIST_REL,
  parseInstallQaSignOffArgs,
  resolveInstallQaSignOffResult,
} from "./city-game-install-qa-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function main() {
  const parsed = parseInstallQaSignOffArgs(process.argv.slice(2));
  const result = resolveInstallQaSignOffResult(parsed);

  for (const line of installQaSignOffSummaryLines({ ...parsed, result })) {
    console.log(line);
  }

  if (!parsed.apply) {
    console.log("(Dry run — pass --apply to update docs.)");
    return;
  }

  if (result === "scenario-pass") {
    const installPath = join(root, INSTALL_QA_REL);
    let installDoc = readFileSync(installPath, "utf8");
    installDoc = applyInstallQaE2Pass(installDoc, parsed);
    writeFileSync(installPath, installDoc, "utf8");
    console.log("Updated:", INSTALL_QA_REL, "(E2 scenario spot-checks)");
    console.log("\n✅ C3 E2 scenario sign-off recorded.");
    return;
  }

  if (result === "pass") {
    const installPath = join(root, INSTALL_QA_REL);
    const launchPath = join(root, LAUNCH_CHECKLIST_REL);
    let installDoc = readFileSync(installPath, "utf8");
    installDoc = applyInstallQaPhysicalPass(installDoc, parsed);
    installDoc = applyInstallQaE2Pass(installDoc, parsed);
    writeFileSync(installPath, installDoc, "utf8");
    console.log("Updated:", INSTALL_QA_REL);

    let launchDoc = readFileSync(launchPath, "utf8");
    launchDoc = applyLaunchChecklistP2Pass(launchDoc, parsed);
    writeFileSync(launchPath, launchDoc, "utf8");
    console.log("Updated:", LAUNCH_CHECKLIST_REL);
    console.log("\n✅ C3 install QA sign-off recorded (pass).");
    return;
  }

  console.log("\n⚠️  C3 install QA sign-off recorded (fail). Re-run physical checklist before launch.");
}

main();
