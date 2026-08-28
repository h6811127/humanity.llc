/**
 * WS-DOCKET chapter mint engineering preflight.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  DOCKET_CHAPTER_MINT_KIT_REL,
  applyDocketChapterMintReceiptToRegistry,
  buildDocketChapterMintReceipt,
  isFixtureDocketChildScanPath,
  isMintedDocketChildScanPath,
  validateDocketChapterMintReceipt,
} from "../../site/js/docket-chapter-mint-core.mjs";
import { validateDocketChapterDiscoveryPins } from "../../site/js/docket-chapter-discovery-core.mjs";

/**
 * @param {string} root
 */
export function assessWsDocketChapterMintPreflight(root) {
  /** @type {{ id: string; label: string; met: boolean; detail: string }[]} */
  const rows = [];

  const kit = existsSync(join(root, DOCKET_CHAPTER_MINT_KIT_REL));
  rows.push({
    id: "CM-kit",
    label: DOCKET_CHAPTER_MINT_KIT_REL,
    met: kit,
    detail: kit
      ? "npm run ws-docket:chapter-mint-kit"
      : "missing — npm run ws-docket:chapter-mint-kit",
  });

  const core = existsSync(join(root, "site/js/docket-chapter-mint-core.mjs"));
  rows.push({
    id: "CM-core",
    label: "docket-chapter-mint-core.mjs",
    met: core,
    detail: core ? "present" : "missing",
  });

  const script = existsSync(join(root, "worker/scripts/ws-docket-chapter-mint.mjs"));
  rows.push({
    id: "CM-script",
    label: "ws-docket-chapter-mint.mjs",
    met: script,
    detail: script ? "present" : "missing",
  });

  const pkg = readFileSync(join(root, "package.json"), "utf8");
  rows.push({
    id: "CM-npm-mint",
    label: "package.json ws-docket:chapter-mint",
    met: pkg.includes('"ws-docket:chapter-mint"'),
    detail: pkg.includes('"ws-docket:chapter-mint"') ? "wired" : "missing",
  });
  rows.push({
    id: "CM-npm-preflight",
    label: "package.json ws-docket:chapter-mint-preflight",
    met: pkg.includes('"ws-docket:chapter-mint-preflight"'),
    detail: pkg.includes('"ws-docket:chapter-mint-preflight"')
      ? "wired"
      : "missing",
  });

  const pins = JSON.parse(
    readFileSync(join(root, "site/data/docket-chapter-discovery-pins.json"), "utf8")
  );
  const pinsOk = validateDocketChapterDiscoveryPins(pins).ok;
  rows.push({
    id: "CM-pins",
    label: "chapter pins registry validates",
    met: pinsOk,
    detail: pinsOk ? "ok" : "invalid",
  });

  const pin0 = Array.isArray(pins.pins) ? pins.pins[0] : null;
  const scan =
    pin0 && typeof pin0 === "object"
      ? String(
          /** @type {Record<string, unknown>} */ (
            /** @type {Record<string, unknown>} */ (pin0).live_object ?? {}
          ).scan_path ?? ""
        )
      : "";
  const mintStatus =
    pin0 && typeof pin0 === "object"
      ? String(/** @type {Record<string, unknown>} */ (pin0).mint_status ?? "fixture")
      : "fixture";
  const scanOk =
    mintStatus === "minted"
      ? isMintedDocketChildScanPath(scan)
      : isFixtureDocketChildScanPath(scan) || isMintedDocketChildScanPath(scan);
  rows.push({
    id: "CM-scan",
    label: `pin scan_path (${mintStatus})`,
    met: scanOk,
    detail: scanOk ? scan : "bad scan_path",
  });

  const receipt = buildDocketChapterMintReceipt({
    pinId: "chapter-cr-research-circle",
    profileId: "7Xk9mP2nQ4rT6vW8yZ1aB3cD",
    qrId: "qr_7Xk9mP2nQ4rT6vW8",
    objectId: "obj_docket_casefile_chapter-cr-research-circle",
  });
  const receiptOk = validateDocketChapterMintReceipt(receipt).ok;
  let applyOk = false;
  if (pinsOk && receiptOk) {
    try {
      const next = applyDocketChapterMintReceiptToRegistry(pins, receipt);
      applyOk =
        validateDocketChapterDiscoveryPins(next).ok &&
        String(next.pins[0].mint_status) === "minted";
    } catch {
      applyOk = false;
    }
  }
  rows.push({
    id: "CM-receipt",
    label: "receipt + apply to registry",
    met: receiptOk && applyOk,
    detail: receiptOk && applyOk ? "ok" : "failed",
  });

  return { rows, engineeringMet: rows.every((r) => r.met) };
}

/**
 * @param {ReturnType<typeof assessWsDocketChapterMintPreflight>} report
 */
export function formatWsDocketChapterMintPreflightReport(report) {
  const lines = [
    "WS-DOCKET chapter mint (QR-mint-v0) preflight",
    "Canon: docs/PUBLIC_DOCKET_AND_ACCOUNTABILITY_VERTICAL.md",
    "",
  ];
  for (const row of report.rows) {
    lines.push(`  ${row.met ? "☑" : "☐"} ${row.label} — ${row.detail}`);
  }
  lines.push(
    "",
    report.engineeringMet
      ? "✅ WS-DOCKET chapter mint engineering preflight PASS"
      : "✗ WS-DOCKET chapter mint engineering preflight FAIL — fix ☐ rows above",
    "",
    "Next:",
    "  API_ORIGIN=http://127.0.0.1:8787 npm run ws-docket:chapter-mint -- --write-pins",
    "  Real license packs · production steward key custody"
  );
  return lines.join("\n");
}
