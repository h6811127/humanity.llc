import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildCanonicalPrintScanUrl,
  validatePrintScanUrl,
} from "../scripts/hosted-rollout-scan-smoke.mjs";
import {
  printedQaPhonesReadyChecklist,
  printedQaPrintArtifactBrief,
  printedQaPrintChecklist,
} from "../scripts/live-control-printed-qa-print-prep.mjs";

const repoRoot = join(import.meta.dirname, "../..");
const PROFILE = "r4YyNEWJvVwWNMETzXfGjFyL";
const QR = "qr_8w7zHCPHisXvTnar";
const ORIGIN = "https://humanity.llc";
const SCAN_URL = `${ORIGIN}/c/${PROFILE}?q=${QR}`;

describe("live-control-printed-qa-print-prep", () => {
  it("buildCanonicalPrintScanUrl matches showcase scan URL", () => {
    expect(buildCanonicalPrintScanUrl(ORIGIN, PROFILE, QR)).toBe(SCAN_URL);
  });

  it("validatePrintScanUrl accepts canonical HTTPS and rejects hc://", () => {
    expect(
      validatePrintScanUrl(SCAN_URL, {
        profileId: PROFILE,
        qrId: QR,
        expectedOrigin: ORIGIN,
      })
    ).toEqual([]);

    expect(validatePrintScanUrl("hc://card/abc")).toContain(
      "must not use hc:// scheme — print HTTPS resolver URL only"
    );
    expect(validatePrintScanUrl("http://humanity.llc/c/p?q=qr_x")).toContain(
      "URL must use HTTPS"
    );
    expect(
      validatePrintScanUrl(`${ORIGIN}/c/wrong?q=${QR}`, { profileId: PROFILE, qrId: QR })
    ).toContain(`profile_id mismatch (expected ${PROFILE})`);
  });

  it("script documents runbook step 4 and QR branding", () => {
    const script = readFileSync(
      join(repoRoot, "worker/scripts/live-control-printed-qa-print-prep.mjs"),
      "utf8"
    );
    expect(script).toContain("M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md");
    expect(script).toContain("QR_BRANDING.md");
    expect(script).toContain("validatePrintScanUrl");
  });

  it("package.json exposes live-control:printed-qa:print-prep", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    expect(pkg.scripts["live-control:printed-qa:print-prep"]).toContain(
      "live-control-printed-qa-print-prep.mjs"
    );
  });

  it("operator brief and checklists cover print artifact and phones", () => {
    const brief = printedQaPrintArtifactBrief({
      scanUrl: SCAN_URL,
      createdUrl: `${ORIGIN}/created/?profile_id=${PROFILE}&qr_id=${QR}`,
      profileId: PROFILE,
      qrId: QR,
    }).join("\n");
    expect(brief).toContain("Download QR PNG");
    expect(brief).toContain(SCAN_URL);
    expect(brief).toContain("512 px");

    const print = printedQaPrintChecklist().join("\n");
    expect(print).toContain("≥ 2 cm");
    expect(print).toContain("hc://");

    const phones = printedQaPhonesReadyChecklist().join("\n");
    expect(phones).toContain("stock Camera");
    expect(phones).toContain("§ A–C");
    expect(phones).toContain("P1-LCP");
  });
});
