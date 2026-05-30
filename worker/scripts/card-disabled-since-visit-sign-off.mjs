/**
 * P0b-1 prod WebKit sign-off recorder (R10).
 *
 * Usage:
 *   npm run card-disabled-since-visit:sign-off -- --pass --apply --date 2026-05-30 --device "iPhone Safari"
 *   npm run card-disabled-since-visit:sign-off -- --fail
 *
 * @see docs/DEVICE_OS_QA.md § P1-P0b-1
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  SAFARI_KEYS_DOC_REL,
  applySafariKeysDocP0b1ProdPass,
  cardDisabledSinceVisitSignOffSummaryLines,
  parseCardDisabledSinceVisitSignOffArgs,
  resolveCardDisabledSinceVisitSignOffResult,
} from "./card-disabled-since-visit-sign-off-core.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * @param {{
 *   pass: boolean;
 *   fail: boolean;
 *   apply: boolean;
 *   dateIso: string;
 *   device: string;
 * }} input
 */
export function runCardDisabledSinceVisitSignOff(input) {
  const result = resolveCardDisabledSinceVisitSignOffResult(input);

  for (const line of cardDisabledSinceVisitSignOffSummaryLines({
    dateIso: input.dateIso,
    device: input.device,
    result,
  })) {
    console.log(line);
  }

  if (result === "pass" && input.apply) {
    const docPath = path.join(repoRoot, SAFARI_KEYS_DOC_REL);
    const before = readFileSync(docPath, "utf8");
    const after = applySafariKeysDocP0b1ProdPass(before, {
      dateIso: input.dateIso,
      device: input.device,
    });
    writeFileSync(docPath, after, "utf8");
    console.log(`✅ Updated ${SAFARI_KEYS_DOC_REL} — P0b-1 prod WebKit marked passed.`);
  } else if (result === "pass") {
    console.log(`Tip: add --apply to update ${SAFARI_KEYS_DOC_REL} in the repo.`);
  }

  console.log(
    result === "pass"
      ? "✅ P0b-1 prod WebKit sign-off recorded (pass)."
      : "⚠️  P0b-1 prod WebKit sign-off recorded (fail)."
  );
}

function main() {
  runCardDisabledSinceVisitSignOff(parseCardDisabledSinceVisitSignOffArgs(process.argv.slice(2)));
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isCli) {
  main();
}
