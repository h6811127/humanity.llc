import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(import.meta.dirname, "../..");

describe("hosted-rollout-step4", () => {
  it("rollout script documents flag enable and verification", () => {
    const script = readFileSync(
      join(repoRoot, "worker/scripts/hosted-rollout-step4.mjs"),
      "utf8"
    );
    expect(script).toContain('HOSTED_STEWARD_ENABLED = "1"');
    expect(script).toContain("operator/plans");
    expect(script).toContain("hosted_steward_v1");
    expect(script).toContain("verify:hosted-g0");
  });

  it("package.json exposes hosted:rollout:step4", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    expect(pkg.scripts["hosted:rollout:step4"]).toContain("hosted-rollout-step4.mjs");
  });

  it("wrangler.toml declares HOSTED_STEWARD_ENABLED", () => {
    expect(existsSync(join(repoRoot, "worker/wrangler.toml"))).toBe(true);
    const toml = readFileSync(join(repoRoot, "worker/wrangler.toml"), "utf8");
    expect(toml).toMatch(/HOSTED_STEWARD_ENABLED\s*=\s*"[01]"/);
  });
});
