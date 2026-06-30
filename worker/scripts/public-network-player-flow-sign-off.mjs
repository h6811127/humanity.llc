#!/usr/bin/env node
/**
 * Agent D player flow — operator sign-off recorder (PD-1–PD-5).
 *
 *   npm run player-flow:sign-off -- --pass --apply --strangers 3 --pass-count 3
 *   npm run player-flow:sign-off -- --fail
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assessPlayerFlowFieldKitReady } from "./public-network-player-flow-field-kit-core.mjs";
import {
  applyInstallQaPlayerFlowPass,
  INSTALL_QA_REL,
  parsePlayerFlowSignOffArgs,
  playerFlowSignOffSummaryLines,
  resolvePlayerFlowSignOffResult,
} from "./public-network-player-flow-sign-off-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function main() {
  const parsed = parsePlayerFlowSignOffArgs(process.argv.slice(2));
  const result = resolvePlayerFlowSignOffResult(parsed);

  for (const line of playerFlowSignOffSummaryLines({ ...parsed, result })) {
    console.log(line);
  }

  if (!parsed.apply) {
    console.log("(Dry run — add --apply to update docs.)");
    return;
  }

  if (result === "pass") {
    const kit = assessPlayerFlowFieldKitReady(root, { requireProduction: true });
    if (!kit.ready) {
      console.error("\n✗ Field walk kit not ready — fix before sign-off:");
      for (const issue of kit.issues) console.error(`  · ${issue}`);
      console.error("\nRun: npm run player-flow:field-kit:production && npm run player-flow:field-kit:check");
      process.exit(1);
    }

    const installPath = join(root, INSTALL_QA_REL);
    writeFileSync(
      installPath,
      applyInstallQaPlayerFlowPass(readFileSync(installPath, "utf8"), parsed),
      "utf8"
    );
    console.log("Updated:", INSTALL_QA_REL);
    console.log("\n✅ Player flow shell sign-off recorded (pass).");
    return;
  }

  console.log("\n⚠️  Player flow sign-off recorded (fail). Fix shell copy before launch.");
}

main();
