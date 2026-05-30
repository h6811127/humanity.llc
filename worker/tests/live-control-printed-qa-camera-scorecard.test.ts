import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  PRINTED_QA_SECTION_A,
  PRINTED_QA_SECTION_B,
  PRINTED_QA_SECTION_C,
  printedQaCameraScorecardLines,
  printedQaCameraSignOffTemplate,
} from "../scripts/live-control-printed-qa-camera-scorecard.mjs";

const repoRoot = join(import.meta.dirname, "../..");
const PROFILE = "r4YyNEWJvVwWNMETzXfGjFyL";
const QR = "qr_8w7zHCPHisXvTnar";
const ORIGIN = "https://humanity.llc";
const SCAN_URL = `${ORIGIN}/c/${PROFILE}?q=${QR}`;

describe("live-control-printed-qa-camera-scorecard", () => {
  it("scorecard sections mirror runbook § A–C rows", () => {
    expect(PRINTED_QA_SECTION_A.map((r) => r.id)).toEqual(["P1", "P2", "P3", "P4", "P5"]);
    expect(PRINTED_QA_SECTION_B.map((r) => r.id)).toEqual(["B1", "B2", "B3", "B4", "B5", "B6"]);
    expect(PRINTED_QA_SECTION_C.map((r) => r.id)).toEqual(["C1", "C2", "C3"]);
  });

  it("script documents runbook scorecard and sign-off", () => {
    const script = readFileSync(
      join(repoRoot, "worker/scripts/live-control-printed-qa-camera-scorecard.mjs"),
      "utf8"
    );
    expect(script).toContain("M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md");
    expect(script).toContain("M7_LIVE_CONTROL_ALPHA.md");
  });

  it("package.json exposes live-control:printed-qa:camera-scorecard", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    expect(pkg.scripts["live-control:printed-qa:camera-scorecard"]).toContain(
      "live-control-printed-qa-camera-scorecard.mjs"
    );
  });

  it("operator scorecard includes URLs and all check rows", () => {
    const text = printedQaCameraScorecardLines({
      scanUrl: SCAN_URL,
      createdUrl: `${ORIGIN}/created/?profile_id=${PROFILE}&qr_id=${QR}`,
      profileId: PROFILE,
      qrId: QR,
    }).join("\n");

    expect(text).toContain(SCAN_URL);
    expect(text).toContain("stock Camera app");
    expect(text).toContain("B5");
    expect(text).toContain("does not prove legal identity");
    expect(text).toContain("C3");
    expect(text).toContain("≥3 phones");

    const signOff = printedQaCameraSignOffTemplate().join("\n");
    expect(signOff).toContain("Pass");
    expect(signOff).toContain("Fail");
  });
});
