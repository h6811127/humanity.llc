import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { printedQaDeskGateHumanNextSteps } from "../scripts/live-control-printed-qa-desk-gate.mjs";
import {
  ALPHA_DOC_REL,
  applyAlphaDocPrintedQaPass,
  parsePrintedQaSignOffArgs,
  printedQaSignOffSummaryLines,
  resolvePrintedQaSignOffResult,
} from "../scripts/live-control-printed-qa-sign-off-core.mjs";

const repoRoot = join(import.meta.dirname, "../..");

describe("live-control-printed-qa-desk-gate", () => {
  it("documents human follow-up steps", () => {
    const text = printedQaDeskGateHumanNextSteps().join("\n");
    expect(text).toContain("camera-scorecard");
    expect(text).toContain("sign-off");
    expect(text).toContain("P1-LCP");
  });

  it("package.json exposes desk-gate and sign-off scripts", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    expect(pkg.scripts["live-control:printed-qa:desk-gate"]).toContain(
      "live-control-printed-qa-desk-gate.mjs"
    );
    expect(pkg.scripts["live-control:printed-qa:sign-off"]).toContain(
      "live-control-printed-qa-sign-off.mjs"
    );
  });
});

describe("live-control-printed-qa-sign-off-core", () => {
  it("parses CLI flags", () => {
    const parsed = parsePrintedQaSignOffArgs([
      "--pass",
      "--apply",
      "--date",
      "2026-05-30",
      "--phones",
      "iPhone Safari",
    ]);
    expect(parsed.pass).toBe(true);
    expect(parsed.apply).toBe(true);
    expect(parsed.dateIso).toBe("2026-05-30");
    expect(parsed.phones).toBe("iPhone Safari");
    expect(resolvePrintedQaSignOffResult(parsed)).toBe("pass");
  });

  it("rejects pass and fail together", () => {
    expect(() =>
      resolvePrintedQaSignOffResult({ pass: true, fail: true })
    ).toThrow(/one of/);
  });

  it("applyAlphaDocPrintedQaPass updates pending markers", () => {
    const sample = [
      "**Status:** Step 1 shipped; printed QA pending",
      "",
      "- Manual iPhone/Android camera scan of a printed QR — **runbook shipped (2026-05-28):** docs.",
      "",
    ].join("\n");
    const out = applyAlphaDocPrintedQaPass(sample, { dateIso: "2026-05-30" });
    expect(out).toContain("printed QA **passed** (2026-05-30)");
    expect(out).toContain("**passed (2026-05-30)** · runbook shipped");
    expect(() => applyAlphaDocPrintedQaPass(out, { dateIso: "2026-05-31" })).toThrow(
      /already_passed/
    );
  });

  it("sign-off summary includes pass/fail guidance", () => {
    const pass = printedQaSignOffSummaryLines({
      dateIso: "2026-05-30",
      result: "pass",
    }).join("\n");
    expect(pass).toContain("PASS");
    expect(pass).toContain(ALPHA_DOC_REL);

    const fail = printedQaSignOffSummaryLines({
      dateIso: "2026-05-30",
      result: "fail",
    }).join("\n");
    expect(fail).toContain("FAIL");
    expect(fail).toContain("H-04");
  });
});
