import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(import.meta.dirname, "../..");

describe("hosted-rollout-step5b", () => {
  it("package.json exposes hosted:rollout:step5b", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    expect(pkg.scripts["hosted:rollout:step5b"]).toContain("hosted-rollout-step5b.mjs");
  });

  it("step5b script documents preflight and verify", () => {
    const script = readFileSync(
      join(repoRoot, "worker/scripts/hosted-rollout-step5b.mjs"),
      "utf8"
    );
    expect(script).toContain("--preflight");
    expect(script).toContain("--verify");
    expect(script).toContain("hosted-rollout-step5.mjs");
    expect(script).toContain("runStep5PreflightVitest");
    expect(script).toContain("hosted:rollout:step5a");
  });

  it("step5 exports preflight helpers for step5b", () => {
    const script = readFileSync(
      join(repoRoot, "worker/scripts/hosted-rollout-step5.mjs"),
      "utf8"
    );
    expect(script).toContain("export function runStep5PreflightVitest");
    expect(script).toContain("export function assertDeployWorkerUsesOperatorToken");
    expect(script).toContain("export { assertE62WorkflowPresent }");
  });
});
