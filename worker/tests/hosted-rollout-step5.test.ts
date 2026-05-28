import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(import.meta.dirname, "../..");

describe("hosted-rollout-step5", () => {
  it("step5 references step5a and E6.2 workflow", () => {
    const script = readFileSync(
      join(repoRoot, "worker/scripts/hosted-rollout-step5.mjs"),
      "utf8"
    );
    expect(script).toContain("hosted:rollout:step5a");
    expect(script).toContain("HOSTED_STEWARD_OPS_RUNBOOK.md");
    expect(script).toContain("steward-ops-daily.yml");
    expect(script).toContain("worker:check-steward-ops");
  });

  it("E6.2 workflow uses OPERATOR_AUDIT_TOKEN", () => {
    const workflow = join(repoRoot, ".github/workflows/steward-ops-daily.yml");
    expect(existsSync(workflow)).toBe(true);
    expect(readFileSync(workflow, "utf8")).toContain("OPERATOR_AUDIT_TOKEN");
  });
});
