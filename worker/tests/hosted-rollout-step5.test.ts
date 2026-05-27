import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(import.meta.dirname, "../..");

describe("hosted-rollout-step5", () => {
  it("rollout script documents CF dashboard and E6.2 CI setup", () => {
    const script = readFileSync(
      join(repoRoot, "worker/scripts/hosted-rollout-step5.mjs"),
      "utf8"
    );
    expect(script).toContain("HOSTED_STEWARD_CF_DASHBOARD.md");
    expect(script).toContain("HOSTED_STEWARD_OPS_RUNBOOK.md");
    expect(script).toContain("steward-ops-daily.yml");
    expect(script).toContain("worker:check-steward-ops");
    expect(script).toContain("humanity-llc-resolver");
  });

  it("package.json exposes hosted:rollout:step5", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    expect(pkg.scripts["hosted:rollout:step5"]).toContain("hosted-rollout-step5.mjs");
  });

  it("E6.2 workflow uses OPERATOR_AUDIT_TOKEN", () => {
    const workflow = join(repoRoot, ".github/workflows/steward-ops-daily.yml");
    expect(existsSync(workflow)).toBe(true);
    expect(readFileSync(workflow, "utf8")).toContain("OPERATOR_AUDIT_TOKEN");
  });
});
