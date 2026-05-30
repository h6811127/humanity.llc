/**
 * H-12 printed QR camera QA — operator sign-off recorder.
 *
 * Usage:
 *   npm run live-control:printed-qa:sign-off -- --pass --apply --date 2026-05-30
 *   npm run live-control:printed-qa:sign-off -- --fail
 *
 * @see docs/M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md § Sign-off
 * @see docs/DEVICE_OS_QA.md § P1-LCP
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolvePrintedQaOperatorUrls } from "./hosted-rollout-scan-smoke.mjs";
import {
  ALPHA_DOC_REL,
  applyAlphaDocPrintedQaPass,
  parsePrintedQaSignOffArgs,
  printedQaSignOffSummaryLines,
  resolvePrintedQaSignOffResult,
} from "./live-control-printed-qa-sign-off-core.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

/**
 * @param {{
 *   pass: boolean;
 *   fail: boolean;
 *   apply: boolean;
 *   dateIso: string;
 *   phones: string;
 *   printType: string;
 *   qrId: string;
 *   apiOrigin?: string;
 * }} input
 */
export function runPrintedQaSignOff(input) {
  const result = resolvePrintedQaSignOffResult(input);
  const apiOrigin = (input.apiOrigin || process.env.API_ORIGIN || "https://humanity.llc").replace(
    /\/$/,
    ""
  );
  const urls = resolvePrintedQaOperatorUrls(apiOrigin);
  const qrId = input.qrId || urls.qrId;

  for (const line of printedQaSignOffSummaryLines({
    dateIso: input.dateIso,
    phones: input.phones,
    printType: input.printType,
    qrId,
    result,
  })) {
    console.log(line);
  }

  if (result === "pass" && input.apply) {
    const alphaPath = path.join(repoRoot, ALPHA_DOC_REL);
    const before = readFileSync(alphaPath, "utf8");
    const after = applyAlphaDocPrintedQaPass(before, { dateIso: input.dateIso });
    writeFileSync(alphaPath, after, "utf8");
    console.log(`✅ Updated ${ALPHA_DOC_REL} — printed QA marked passed (${input.dateIso}).`);
  } else if (result === "pass") {
    console.log("Tip: add --apply to update docs/M7_LIVE_CONTROL_ALPHA.md in the repo.");
  }

  console.log(result === "pass" ? "✅ H-12 sign-off recorded (pass)." : "⚠️  H-12 sign-off recorded (fail).");
}

function main() {
  const parsed = parsePrintedQaSignOffArgs(process.argv.slice(2));
  runPrintedQaSignOff(parsed);
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isCli) {
  main();
}
