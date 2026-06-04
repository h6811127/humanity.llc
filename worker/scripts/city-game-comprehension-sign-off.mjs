#!/usr/bin/env node
/**
 * C2 GT comprehension — operator sign-off recorder.
 *
 *   npm run city-game:comprehension-sign-off -- --pass --apply --testers 5 --pass-count 5
 *   npm run city-game:comprehension-sign-off -- --fail
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyComprehensionRunbookPass,
  applyInstallQaComprehensionPass,
  applyLaunchChecklistP1Pass,
  COMPREHENSION_RUNBOOK_REL,
  comprehensionSignOffSummaryLines,
  INSTALL_QA_REL,
  LAUNCH_CHECKLIST_REL,
  parseComprehensionSignOffArgs,
  resolveComprehensionSignOffResult,
  validateComprehensionSignOffPass,
} from "./city-game-comprehension-sign-off-core.mjs";
import { surfacesMarketLiveCityBoard } from "./city-game-map-board-b13-core.mjs";
import { RESEARCH_LAUNCH_PAGE_RELS } from "./city-game-launch-surfaces-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const rulesPath = join(root, "site/play/cedar-rapids/index.html");

function main() {
  const parsed = parseComprehensionSignOffArgs(process.argv.slice(2));
  const result = resolveComprehensionSignOffResult(parsed);

  for (const line of comprehensionSignOffSummaryLines({ ...parsed, result })) {
    console.log(line);
  }

  if (!parsed.apply) {
    console.log("(Dry run — add --apply to update docs.)");
    return;
  }

  if (result === "pass") {
    const rulesHtml = readFileSync(rulesPath, "utf8");
    const researchHtmlByRel = Object.fromEntries(
      RESEARCH_LAUNCH_PAGE_RELS.map((rel) => [rel, readFileSync(join(root, rel), "utf8")])
    );
    const runbookPath = join(root, COMPREHENSION_RUNBOOK_REL);
    const runbook = readFileSync(runbookPath, "utf8");
    const validation = validateComprehensionSignOffPass({
      marketsLiveCityBoard: surfacesMarketLiveCityBoard({ rulesHtml, researchHtmlByRel }),
      runbook,
    });
    if (!validation.ok) {
      for (const issue of validation.issues) console.error(issue);
      process.exit(1);
    }

    writeFileSync(
      runbookPath,
      applyComprehensionRunbookPass(runbook, parsed),
      "utf8"
    );
    console.log("Updated:", COMPREHENSION_RUNBOOK_REL);

    const installPath = join(root, INSTALL_QA_REL);
    writeFileSync(
      installPath,
      applyInstallQaComprehensionPass(readFileSync(installPath, "utf8"), parsed),
      "utf8"
    );
    console.log("Updated:", INSTALL_QA_REL);

    const launchPath = join(root, LAUNCH_CHECKLIST_REL);
    writeFileSync(
      launchPath,
      applyLaunchChecklistP1Pass(readFileSync(launchPath, "utf8"), parsed),
      "utf8"
    );
    console.log("Updated:", LAUNCH_CHECKLIST_REL);

    console.log("\n✅ C2 comprehension sign-off recorded (pass).");
    return;
  }

  console.log("\n⚠️  C2 comprehension sign-off recorded (fail). Fix copy before launch.");
}

main();
