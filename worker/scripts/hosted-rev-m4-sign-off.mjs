/**
 * WS-REV R4 — record M4 governance sign-off for revenue path.
 *
 * Usage:
 *   npm run hosted:rev:m4:preflight
 *   npm run hosted:rev:m4-sign-off -- --pass
 *   npm run hosted:rev:m4-sign-off -- --pass --apply --date 2026-06-03
 *   npm run hosted:rev:m4-sign-off -- --pass --apply --note "Stripe test mode OK"
 *
 * @see docs/HOSTED_TIER_M4_GOVERNANCE_BRIEF.md
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  COORDINATION_DOC_REL,
  HOSTED_PRICING_DOC_REL,
  M4_BRIEF_DOC_REL,
  PAID_TIER_DOC_REL,
  applyCoordinationWsRevR4Changelog,
  applyHostedTierPricingWsRevR4Pass,
  applyM4BriefWsRevR4Note,
  applyPaidTierWsRevR4Pass,
  hostedRevM4SignOffSummaryLines,
  parseHostedRevM4SignOffArgs,
  resolveHostedRevM4SignOffResult,
} from "./hosted-rev-m4-sign-off-core.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * @param {{
 *   pass: boolean;
 *   fail: boolean;
 *   apply: boolean;
 *   dateIso: string;
 *   note: string;
 * }} input
 */
export function runHostedRevM4SignOff(input) {
  const result = resolveHostedRevM4SignOffResult(input);

  for (const line of hostedRevM4SignOffSummaryLines({
    dateIso: input.dateIso,
    note: input.note,
    result,
  })) {
    console.log(line);
  }

  if (result === "pass" && input.apply) {
    const pricingPath = path.join(repoRoot, HOSTED_PRICING_DOC_REL);
    const paidPath = path.join(repoRoot, PAID_TIER_DOC_REL);
    const coordPath = path.join(repoRoot, COORDINATION_DOC_REL);
    const briefPath = path.join(repoRoot, M4_BRIEF_DOC_REL);

    writeFileSync(
      pricingPath,
      applyHostedTierPricingWsRevR4Pass(readFileSync(pricingPath, "utf8"), {
        dateIso: input.dateIso,
        note: input.note,
      }),
      "utf8"
    );
    writeFileSync(
      paidPath,
      applyPaidTierWsRevR4Pass(readFileSync(paidPath, "utf8")),
      "utf8"
    );
    writeFileSync(
      coordPath,
      applyCoordinationWsRevR4Changelog(readFileSync(coordPath, "utf8"), {
        dateIso: input.dateIso,
      }),
      "utf8"
    );
    writeFileSync(
      briefPath,
      applyM4BriefWsRevR4Note(readFileSync(briefPath, "utf8"), {
        dateIso: input.dateIso,
      }),
      "utf8"
    );

    console.log(`✅ Updated ${HOSTED_PRICING_DOC_REL}`);
    console.log(`✅ Updated ${PAID_TIER_DOC_REL}`);
    console.log(`✅ Updated ${COORDINATION_DOC_REL} changelog`);
    console.log(`✅ Updated ${M4_BRIEF_DOC_REL} changelog`);
  } else if (result === "pass") {
    console.log(`Tip: add --apply to record sign-off in ${HOSTED_PRICING_DOC_REL}.`);
  }

  console.log(
    result === "pass"
      ? "✅ WS-REV R4 governance sign-off recorded (pass)."
      : "⚠️  WS-REV R4 governance sign-off recorded (fail)."
  );
}

function main() {
  runHostedRevM4SignOff(parseHostedRevM4SignOffArgs(process.argv.slice(2)));
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isCli) {
  main();
}
