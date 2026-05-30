/**
 * H-12 printed QR camera QA — step 4 print artifact prep (operator).
 *
 * Validates canonical scan URL, optional live fetch, and prints print/phone checklists.
 *
 * Usage:
 *   npm run live-control:printed-qa:print-prep
 *   npm run live-control:printed-qa:print-prep -- --verify-live
 *
 * @see docs/M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md § Pre-flight step 4–5
 * @see docs/QR_BRANDING.md
 * @see docs/LIVE_CONTROL_USABILITY_HARDENING.md § H-12
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildCanonicalPrintScanUrl,
  resolvePrintedQaOperatorUrls,
  scanPageSmokeFailure,
  validatePrintScanUrl,
} from "./hosted-rollout-scan-smoke.mjs";

/**
 * @param {{ scanUrl: string; createdUrl: string; profileId: string; qrId: string }} urls
 * @returns {string[]}
 */
export function printedQaPrintArtifactBrief({ scanUrl, createdUrl, profileId, qrId }) {
  return [
    "",
    "Print artifact (step 4):",
    `  Download QR PNG: ${createdUrl}`,
    "    → Steward keys page → Download QR (512 px PNG per QR_BRANDING.md).",
    "",
    "  URL that must appear on the print:",
    `    ${scanUrl}`,
    "",
    `  Credential: profile ${profileId} · ${qrId}`,
    "",
  ];
}

/** @returns {string[]} */
export function printedQaPrintChecklist() {
  return [
    "Before printing (check each):",
    "  ☐ Printed URL matches canonical HTTPS scan URL above (not hc://)",
    "  ☐ QR module ≥ 2 cm on paper (docs/QR_BRANDING.md)",
    "  ☐ Bullseye + humanity.llc framing visible at print contrast",
    "  ☐ Optional: scan downloaded 512 px PNG on desk phone before bulk print",
    "",
  ];
}

/** @returns {string[]} */
export function printedQaPhonesReadyChecklist() {
  return [
    "Phones ready (step 5):",
    "  ☐ iOS — stock Camera app → Safari scan path",
    "  ☐ Android — stock Camera / Chrome scan path",
    "  ☐ Third device if available",
    "",
    "Then run § A–C on ≥3 phones:",
    "  docs/M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md",
    "",
    "Manual QA entry: docs/DEVICE_OS_QA.md § P1-LCP",
    "",
  ];
}

/**
 * @param {string} apiOrigin
 * @param {{ verifyLive?: boolean }} [opts]
 */
export async function verifyPrintScanUrlLive(apiOrigin, opts = {}) {
  const verifyLive = opts.verifyLive ?? false;
  if (!verifyLive) return;

  const urls = resolvePrintedQaOperatorUrls(apiOrigin);
  console.log(`\n▶ Verify scan page loads (${urls.scanUrl})`);
  const res = await fetch(urls.scanUrl, {
    headers: { Accept: "text/html" },
    redirect: "follow",
  });
  const text = await res.text();
  if (scanPageSmokeFailure(res.status, text)) {
    console.error(`scan page verify failed (${res.status}) — fix before printing`);
    console.error("See: docs/SCAN_WORKER_1101_POSTMORTEM.md");
    process.exit(1);
  }
  console.log(`scan page verify OK (${res.status})`);
}

/**
 * @param {{ apiOrigin?: string; verifyLive?: boolean }} [opts]
 */
export async function runPrintedQaPrintPrep(opts = {}) {
  const apiOrigin = (opts.apiOrigin || process.env.API_ORIGIN || "https://humanity.llc").replace(
    /\/$/,
    ""
  );
  const verifyLive = opts.verifyLive ?? false;
  const urls = resolvePrintedQaOperatorUrls(apiOrigin);
  const canonical = buildCanonicalPrintScanUrl(apiOrigin, urls.profileId, urls.qrId);
  const urlIssues = validatePrintScanUrl(urls.scanUrl, {
    profileId: urls.profileId,
    qrId: urls.qrId,
    expectedOrigin: apiOrigin,
  });

  console.log("H-12 printed QR camera QA — step 4 print artifact prep");
  console.log("Docs: docs/M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md § Pre-flight\n");

  if (urlIssues.length) {
    console.error(`Print scan URL validation failed:\n  - ${urlIssues.join("\n  - ")}`);
    console.error(`Expected: ${canonical}`);
    console.error(`Resolved: ${urls.scanUrl}`);
    process.exit(1);
  }
  console.log("✅ Print scan URL OK (canonical HTTPS)");

  if (urls.scanUrl !== canonical) {
    console.warn(`Note: resolved scan URL differs from built canonical (override may be active).`);
    console.warn(`  Canonical: ${canonical}`);
    console.warn(`  Resolved:  ${urls.scanUrl}`);
  }

  await verifyPrintScanUrlLive(apiOrigin, { verifyLive });

  for (const line of printedQaPrintArtifactBrief(urls)) {
    console.log(line);
  }
  for (const line of printedQaPrintChecklist()) {
    console.log(line);
  }
  for (const line of printedQaPhonesReadyChecklist()) {
    console.log(line);
  }

  console.log("✅ H-12 step 4 print prep OK — complete manual print + § A–C on phones.");
}

async function main() {
  const verifyLive = process.argv.includes("--verify-live");
  await runPrintedQaPrintPrep({ verifyLive });
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isCli) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
