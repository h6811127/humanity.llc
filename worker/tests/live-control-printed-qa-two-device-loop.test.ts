import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { resolvePrintedQaOperatorUrls } from "../scripts/hosted-rollout-scan-smoke.mjs";
import {
  printedQaTwoDeviceLoopBrief,
  printedQaTwoDeviceVerifyChecklist,
} from "../scripts/live-control-printed-qa-two-device-loop.mjs";

const repoRoot = join(import.meta.dirname, "../..");

describe("live-control-printed-qa-two-device-loop", () => {
  it("resolvePrintedQaOperatorUrls builds scan and created URLs from showcase", () => {
    const urls = resolvePrintedQaOperatorUrls("https://humanity.llc");
    expect(urls.scanUrl).toBe(
      "https://humanity.llc/c/r4YyNEWJvVwWNMETzXfGjFyL?q=qr_8w7zHCPHisXvTnar"
    );
    expect(urls.createdUrl).toBe(
      "https://humanity.llc/created/?profile_id=r4YyNEWJvVwWNMETzXfGjFyL&qr_id=qr_8w7zHCPHisXvTnar"
    );
    expect(urls.profileId).toBe("r4YyNEWJvVwWNMETzXfGjFyL");
    expect(urls.qrId).toBe("qr_8w7zHCPHisXvTnar");
  });

  it("script documents runbook step 3 and Playwright proxy", () => {
    const script = readFileSync(
      join(repoRoot, "worker/scripts/live-control-printed-qa-two-device-loop.mjs"),
      "utf8"
    );
    expect(script).toContain("e2e:live-control-loop");
    expect(script).toContain("M7_LIVE_CONTROL_PRINTED_QA_RUNBOOK.md");
  });

  it("package.json exposes live-control:printed-qa:two-device-loop", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    expect(pkg.scripts["live-control:printed-qa:two-device-loop"]).toContain(
      "live-control-printed-qa-two-device-loop.mjs"
    );
  });

  it("operator brief and verify checklist cover pre-flight step 3", () => {
    const brief = printedQaTwoDeviceLoopBrief({
      scanUrl: "https://humanity.llc/c/p?q=qr_x",
      createdUrl: "https://humanity.llc/created/?profile_id=p&qr_id=qr_x",
    }).join("\n");
    expect(brief).toContain("Ask for live proof");
    expect(brief).toContain("Prove control now");
    expect(brief).toContain("does not prove legal identity");

    const verify = printedQaTwoDeviceVerifyChecklist().join("\n");
    expect(verify).toContain("Expires in M:SS");
    expect(verify).toContain("§ A–C");
  });
});
