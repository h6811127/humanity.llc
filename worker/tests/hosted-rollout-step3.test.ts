import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(import.meta.dirname, "../..");

describe("hosted-rollout-step3", () => {
  it("rollout script documents operator and stripe secrets", () => {
    const script = readFileSync(
      join(repoRoot, "worker/scripts/hosted-rollout-step3.mjs"),
      "utf8"
    );
    expect(script).toContain("OPERATOR_AUDIT_TOKEN");
    expect(script).toContain("STRIPE_WEBHOOK_SECRET");
    expect(script).toContain("worker:check-steward-ops");
    expect(script).toContain("steward-ops");
  });

  it("package.json exposes hosted:rollout:step3", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    expect(pkg.scripts["hosted:rollout:step3"]).toContain("hosted-rollout-step3.mjs");
  });

  it("dev vars example documents wrangler secret put", () => {
    expect(existsSync(join(repoRoot, "worker/.dev.vars.example"))).toBe(true);
    const example = readFileSync(join(repoRoot, "worker/.dev.vars.example"), "utf8");
    expect(example).toContain("wrangler secret put OPERATOR_AUDIT_TOKEN");
  });
});
