/**
 * H-12 printed QR camera QA — § A–C camera scorecard (operator).
 *
 * Prints copy-paste URLs and human scorecard after pre-flight steps 1–5.
 *
 * Usage:
 *   npm run live-control:printed-qa:camera-scorecard
 *
 * @see docs/M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md § A–C · Sign-off
 * @see docs/LIVE_CONTROL_USABILITY_HARDENING.md § H-12
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolvePrintedQaOperatorUrls } from "./hosted-rollout-scan-smoke.mjs";

/** @typedef {{ id: string; check: string }} ScorecardRow */

/** @type {ScorecardRow[]} */
export const PRINTED_QA_SECTION_A = [
  {
    id: "P1",
    check: "Camera opens Safari/Chrome to humanity.llc scan page (no custom app required)",
  },
  {
    id: "P2",
    check: "Scan page loads pass-v33 UI: hero live check settles, Live control block visible",
  },
  {
    id: "P3",
    check: "Page usable without login, email, or app install prompt on scan route",
  },
  {
    id: "P4",
    check: "Scan completes in < 5 s on LTE/Wi‑Fi (not offline stub)",
  },
  {
    id: "P5",
    check: "Works under warm indoor light and near window daylight",
  },
];

/** @type {ScorecardRow[]} */
export const PRINTED_QA_SECTION_B = [
  {
    id: "B1",
    check: "Scanner taps Ask for live proof; owner panel or side-by-side Owner pane appears",
  },
  {
    id: "B2",
    check: "Expires in M:SS countdown visible while waiting for signature",
  },
  {
    id: "B3",
    check: "Owner opens proof link → Prove control now → scanner shows Control proven",
  },
  {
    id: "B4",
    check: "Success copy includes does not prove legal identity",
  },
  {
    id: "B5",
    check: "After proof display window, scanner returns to Ask for live proof (not stuck success)",
  },
  {
    id: "B6",
    check: "Unsigned challenge past 120s → The 2-minute window ended. You can ask again.",
  },
];

/** @type {ScorecardRow[]} */
export const PRINTED_QA_SECTION_C = [
  {
    id: "C1",
    check: "On phone held portrait: scanner + owner panes stack legibly",
  },
  {
    id: "C2",
    check: "On tablet or wide browser ≥640px: Scanner | Owner columns when waiting",
  },
  {
    id: "C3",
    check: "Ask again after success starts a fresh request without stale owner link",
  },
];

/**
 * @param {string} title
 * @param {ScorecardRow[]} rows
 * @returns {string[]}
 */
export function formatScorecardSection(title, rows) {
  const lines = [`${title}`, ""];
  for (const row of rows) {
    lines.push(`  ☐ ${row.id}  ${row.check}`);
  }
  lines.push("");
  return lines;
}

/**
 * @param {{ scanUrl: string; createdUrl: string; profileId: string; qrId: string }} urls
 * @returns {string[]}
 */
export function printedQaCameraScorecardBrief({ scanUrl, createdUrl, profileId, qrId }) {
  return [
    "H-12 printed QR camera QA — § A–C scorecard",
    "Docs: docs/M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md",
    "",
    "Use the printed QR (camera scan) for § A. Owner keys stay on a second device:",
    `  Scan (camera): ${scanUrl}`,
    `  Owner keys:    ${createdUrl}`,
    "",
    `Credential: ${profileId} · ${qrId}`,
    "",
    "Test each phone at arm's length with the stock Camera app (not Humanity PWA).",
    "",
  ];
}

/** @returns {string[]} */
export function printedQaCameraSignOffTemplate() {
  return [
    "Sign-off (fill when ≥3 phones complete § A–C):",
    "",
    "  Date:       [YYYY-MM-DD]",
    "  Print type: [paper / sticker / merch / plate]",
    "  QR id:      [qr_…]",
    "  Phones:     [e.g. iPhone 15 Safari, Pixel 8 Chrome, …]",
    "  Result:     [ ] Pass  ·  [ ] Fail — block public live-control demo on print",
    "",
    "On pass: update docs/M7_LIVE_CONTROL_ALPHA.md Step 2 printed-QR line with date.",
    "Failures: map to H-04–H-10 in docs/LIVE_CONTROL_USABILITY_HARDENING.md",
    "",
  ];
}

/**
 * @param {{ scanUrl: string; createdUrl: string; profileId: string; qrId: string }} urls
 * @returns {string[]}
 */
export function printedQaCameraScorecardLines(urls) {
  return [
    ...printedQaCameraScorecardBrief(urls),
    ...formatScorecardSection("§ A. Camera scan → scan page", PRINTED_QA_SECTION_A),
    ...formatScorecardSection("§ B. Live proof loop (printed entry path)", PRINTED_QA_SECTION_B),
    ...formatScorecardSection("§ C. In-person layout spot check", PRINTED_QA_SECTION_C),
    ...printedQaCameraSignOffTemplate(),
  ];
}

/**
 * @param {{ apiOrigin?: string }} [opts]
 */
export function runPrintedQaCameraScorecard(opts = {}) {
  const apiOrigin = (opts.apiOrigin || process.env.API_ORIGIN || "https://humanity.llc").replace(
    /\/$/,
    ""
  );
  const urls = resolvePrintedQaOperatorUrls(apiOrigin);

  for (const line of printedQaCameraScorecardLines(urls)) {
    console.log(line);
  }

  console.log("✅ H-12 camera scorecard ready — complete § A–C on ≥3 phones, then sign off.");
}

function main() {
  runPrintedQaCameraScorecard();
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isCli) {
  main();
}
