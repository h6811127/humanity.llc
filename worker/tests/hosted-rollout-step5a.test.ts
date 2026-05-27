import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(import.meta.dirname, "../..");

describe("hosted-rollout-step5a", () => {
  it("step5a script documents CF dashboard setup only", () => {
    const script = readFileSync(
      join(repoRoot, "worker/scripts/hosted-rollout-step5a.mjs"),
      "utf8"
    );
    expect(script).toContain("HOSTED_STEWARD_CF_DASHBOARD.md");
    expect(script).toContain("humanity-llc-resolver");
    expect(script).toContain("hosted:rollout:step5");
    expect(script).not.toContain("worker:check-steward-ops");
  });

  it("step5 script documents E6.2 verify path", () => {
    const script = readFileSync(
      join(repoRoot, "worker/scripts/hosted-rollout-step5.mjs"),
      "utf8"
    );
    expect(script).toContain("hosted:rollout:step5a");
    expect(script).toContain("worker:check-steward-ops");
    expect(script).toContain("steward-ops-daily.yml");
    expect(script).not.toContain("printCfDashboardSetup");
  });

  it("package.json exposes step5a", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    expect(pkg.scripts["hosted:rollout:step5a"]).toContain("hosted-rollout-step5a.mjs");
    expect(pkg.scripts["hosted:rollout:step5"]).toContain("hosted-rollout-step5.mjs");
  });
});
