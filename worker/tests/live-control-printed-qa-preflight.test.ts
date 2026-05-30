import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  printedQaManualChecklist,
  printPrintedQaChecklist,
} from "../scripts/live-control-printed-qa-preflight.mjs";

const repoRoot = join(import.meta.dirname, "../..");

describe("live-control-printed-qa-preflight", () => {
  it("script documents runbook and production smoke flags", () => {
    const script = readFileSync(
      join(repoRoot, "worker/scripts/live-control-printed-qa-preflight.mjs"),
      "utf8"
    );
    expect(script).toContain("worker:test:live-control-printed-qa");
    expect(script).toContain("e2e:live-control-loop");
    expect(script).toContain("--production-smoke");
    expect(script).toContain("M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md");
  });

  it("package.json exposes live-control:printed-qa:preflight", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    expect(pkg.scripts["live-control:printed-qa:preflight"]).toContain(
      "live-control-printed-qa-preflight.mjs"
    );
  });

  it("manual checklist points to step 3 two-device loop", () => {
    const lines = printedQaManualChecklist();
    const text = lines.join("\n");
    expect(text).toContain("live-control:printed-qa:two-device-loop");
    expect(text).toContain("§ A–C");
    expect(text).toContain("P1-LCP");
    expect(printPrintedQaChecklist).toBeTypeOf("function");
  });
});
