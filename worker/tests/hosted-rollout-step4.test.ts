import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  applyLocalApiOriginDefault,
  getApiOrigin,
  runStep4PreflightVitest,
} from "../scripts/hosted-rollout-step4.mjs";

const repoRoot = join(import.meta.dirname, "../..");

describe("hosted-rollout-step4", () => {
  afterEach(() => {
    delete process.env.API_ORIGIN;
  });

  it("getApiOrigin defaults to production and respects API_ORIGIN", () => {
    delete process.env.API_ORIGIN;
    expect(getApiOrigin()).toBe("https://humanity.llc");
    process.env.API_ORIGIN = "http://127.0.0.1:8787/";
    expect(getApiOrigin()).toBe("http://127.0.0.1:8787");
  });

  it("applyLocalApiOriginDefault sets local worker dev origin when unset", () => {
    delete process.env.API_ORIGIN;
    expect(applyLocalApiOriginDefault(true)).toBe("http://127.0.0.1:8787");
    expect(process.env.API_ORIGIN).toBe("http://127.0.0.1:8787");
  });

  it("runStep4PreflightVitest is exported for smoke --preflight", () => {
    expect(typeof runStep4PreflightVitest).toBe("function");
  });

  it("rollout script supports deploy, verify, and smoke flags", () => {
    const script = readFileSync(
      join(repoRoot, "worker/scripts/hosted-rollout-step4.mjs"),
      "utf8"
    );
    expect(script).toContain("worker:deploy");
    expect(script).toContain("smokeHostedStewardRoutesEnabled");
    expect(script).toContain("hosted_steward_v1");
    expect(script).toContain("--smoke");
    expect(script).toContain("--local");
    expect(script).toContain("--preflight");
    expect(script).toContain("hosted:rollout:step4a");
  });

  it("package.json exposes hosted:rollout:step4", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    expect(pkg.scripts["hosted:rollout:step4"]).toContain("hosted-rollout-step4.mjs");
  });

  it("wrangler.toml has hosted flag enabled after rollout step 4a", () => {
    const toml = readFileSync(join(repoRoot, "worker/wrangler.toml"), "utf8");
    expect(toml).toMatch(/HOSTED_STEWARD_ENABLED\s*=\s*"1"/);
  });
});
