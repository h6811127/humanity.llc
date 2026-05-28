import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(import.meta.dirname, "../..");

describe("hosted-rollout-step6", () => {
  it("rollout script documents Vitest, preflight, and E2E regression", () => {
    const script = readFileSync(
      join(repoRoot, "worker/scripts/hosted-rollout-step6.mjs"),
      "utf8"
    );
    expect(script).toContain("verify:hosted-g0");
    expect(script).toContain("e2e:steward-hosted");
    expect(script).toContain("HOSTED_TIER_G0_READINESS.md");
    expect(script).toContain("--preflight");
    expect(script).toContain("runStep6PreflightVitest");
    expect(script).toContain("hosted-rollout-scan-smoke.test.ts");
    expect(script).toContain("schema-ready.test.ts");
  });

  it("package.json exposes hosted:rollout:step6", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    expect(pkg.scripts["hosted:rollout:step6"]).toContain("hosted-rollout-step6.mjs");
  });

  it("verify:hosted-g0 and e2e:steward-hosted are defined", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    expect(pkg.scripts["verify:hosted-g0"]).toContain("worker:test:hosted-free-tier");
    expect(pkg.scripts["e2e:steward-hosted"]).toContain("e2e:hosted-tier");
  });
});
