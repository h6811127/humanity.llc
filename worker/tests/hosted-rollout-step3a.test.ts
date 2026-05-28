import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(import.meta.dirname, "../..");

describe("hosted-rollout-step3a", () => {
  it("step3a script documents operator token and steward-ops verify", () => {
    const script = readFileSync(
      join(repoRoot, "worker/scripts/hosted-rollout-step3a.mjs"),
      "utf8"
    );
    expect(script).toContain("OPERATOR_AUDIT_TOKEN");
    expect(script).toContain("worker:check-steward-ops");
    expect(script).toContain("steward-ops");
    expect(script).toContain("--smoke");
    expect(script).toContain("smokeStewardOpsAuthGate");
    expect(existsSync(join(repoRoot, "worker/tests/hosted-rollout-step3a-smoke.test.ts"))).toBe(
      true
    );
    expect(script).toContain("hosted:rollout:step4a");
    expect(script).not.toContain("Re-run with --stripe-check");
  });

  it("step3b is separate and marked deferred", () => {
    const script = readFileSync(
      join(repoRoot, "worker/scripts/hosted-rollout-step3b.mjs"),
      "utf8"
    );
    expect(script).toContain("deferred");
    expect(script).toContain("STRIPE_WEBHOOK_SECRET");
    expect(script).toContain("need step 3b to continue rollout steps");
  });

  it("package.json exposes step3a and aliases step3 to step3a", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    expect(pkg.scripts["hosted:rollout:step3a"]).toContain("hosted-rollout-step3a.mjs");
    expect(pkg.scripts["hosted:rollout:step3"]).toContain("hosted-rollout-step3a.mjs");
    expect(pkg.scripts["hosted:rollout:step3b"]).toContain("hosted-rollout-step3b.mjs");
  });

  it("dev vars example documents wrangler secret put", () => {
    expect(existsSync(join(repoRoot, "worker/.dev.vars.example"))).toBe(true);
    const example = readFileSync(join(repoRoot, "worker/.dev.vars.example"), "utf8");
    expect(example).toContain("wrangler secret put OPERATOR_AUDIT_TOKEN");
  });
});
