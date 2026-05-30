import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  printedQaPostSmokeChecklist,
  printPrintedQaPostSmokeChecklist,
} from "../scripts/live-control-printed-qa-production-smoke.mjs";

const repoRoot = join(import.meta.dirname, "../..");

describe("live-control-printed-qa-production-smoke", () => {
  it("script documents H-01–H-03 production smoke and runbook step 2", () => {
    const script = readFileSync(
      join(repoRoot, "worker/scripts/live-control-printed-qa-production-smoke.mjs"),
      "utf8"
    );
    expect(script).toContain("verifyHardening: true");
    expect(script).toContain("verifyJson: true");
    expect(script).toContain("M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md");
  });

  it("package.json exposes live-control:printed-qa:production-smoke", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    expect(pkg.scripts["live-control:printed-qa:production-smoke"]).toContain(
      "live-control-printed-qa-production-smoke.mjs"
    );
  });

  it("post-smoke checklist points to step 3 two-device loop", () => {
    const text = printedQaPostSmokeChecklist().join("\n");
    expect(text).toContain("live-control:printed-qa:two-device-loop");
    expect(printPrintedQaPostSmokeChecklist).toBeTypeOf("function");
  });
});
