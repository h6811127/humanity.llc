import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(import.meta.dirname, "../..");

describe("hosted-rollout-step2", () => {
  it("rollout script enforces HOSTED_STEWARD_ENABLED off and deploy/smoke flags", () => {
    const script = readFileSync(
      join(repoRoot, "worker/scripts/hosted-rollout-step2.mjs"),
      "utf8"
    );
    expect(script).toContain('HOSTED_STEWARD_ENABLED = "0"');
    expect(script).toContain("worker:deploy");
    expect(script).toContain("/.well-known/hc/v1/health");
    expect(script).toContain("smokeHostedStewardGated");
    expect(script).toContain("hosted_steward_disabled");
    expect(script).toContain("hosted:rollout:step1");
  });

  it("wrangler.toml default keeps hosted flag off for production step 2", () => {
    const toml = readFileSync(join(repoRoot, "worker/wrangler.toml"), "utf8");
    expect(toml).toMatch(/HOSTED_STEWARD_ENABLED\s*=\s*"0"/);
  });

  it("package.json exposes hosted:rollout:step2", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    expect(pkg.scripts["hosted:rollout:step2"]).toContain("hosted-rollout-step2.mjs");
  });
});
