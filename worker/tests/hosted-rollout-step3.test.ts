import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(import.meta.dirname, "../..");

describe("hosted-rollout-step3", () => {
  it("step3 forwards to step3a", () => {
    const script = readFileSync(
      join(repoRoot, "worker/scripts/hosted-rollout-step3.mjs"),
      "utf8"
    );
    expect(script).toContain("hosted-rollout-step3a.mjs");
  });

  it("step3a documents operator token verification", () => {
    const script = readFileSync(
      join(repoRoot, "worker/scripts/hosted-rollout-step3a.mjs"),
      "utf8"
    );
    expect(script).toContain("OPERATOR_AUDIT_TOKEN");
    expect(script).toContain("worker:check-steward-ops");
    expect(script).toContain("steward-ops");
    expect(script).not.toContain("Re-run with --stripe-check");
  });

  it("package.json aliases step3 to step3a and exposes step3b", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    expect(pkg.scripts["hosted:rollout:step3"]).toContain("hosted-rollout-step3a.mjs");
    expect(pkg.scripts["hosted:rollout:step3a"]).toContain("hosted-rollout-step3a.mjs");
    expect(pkg.scripts["hosted:rollout:step3b"]).toContain("hosted-rollout-step3b.mjs");
  });

  it("dev vars example documents wrangler secret put", () => {
    expect(existsSync(join(repoRoot, "worker/.dev.vars.example"))).toBe(true);
    const example = readFileSync(join(repoRoot, "worker/.dev.vars.example"), "utf8");
    expect(example).toContain("wrangler secret put OPERATOR_AUDIT_TOKEN");
  });
});
