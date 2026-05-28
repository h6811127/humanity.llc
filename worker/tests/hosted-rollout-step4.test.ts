import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(import.meta.dirname, "../..");

describe("hosted-rollout-step4", () => {
  it("rollout script supports deploy, verify, and smoke flags", () => {
    const script = readFileSync(
      join(repoRoot, "worker/scripts/hosted-rollout-step4.mjs"),
      "utf8"
    );
    expect(script).toContain("worker:deploy");
    expect(script).toContain("smokeHostedStewardRoutesEnabled");
    expect(script).toContain("hosted_steward_v1");
    expect(script).toContain("--smoke");
    expect(script).toContain("hosted:rollout:step4a");
  });

  it("package.json exposes hosted:rollout:step4", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    expect(pkg.scripts["hosted:rollout:step4"]).toContain("hosted-rollout-step4.mjs");
  });
});
