import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(import.meta.dirname, "../..");

describe("merch-funnel rollout scripts", () => {
  it("package.json exposes rollout steps and verify:merch-funnel", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    expect(pkg.scripts["merch-funnel:rollout:step1"]).toContain("merch-funnel-rollout-step1.mjs");
    expect(pkg.scripts["merch-funnel:rollout:step6"]).toContain("merch-funnel-rollout-step6.mjs");
    expect(pkg.scripts["verify:merch-funnel"]).toContain("worker:test:merch-funnel");
  });

  it("step2 documents local preflight before deployed verify", () => {
    const script = readFileSync(
      join(repoRoot, "worker/scripts/merch-funnel-rollout-step2.mjs"),
      "utf8"
    );
    expect(script).toContain("--preflight");
    expect(script).toContain("--verify");
    expect(script).toContain("shop-config-rollout-core.mjs");
    expect(script).toContain("smokeShopGlitchProductPage");
  });

  it("step3 documents preflight and production verify", () => {
    const script = readFileSync(
      join(repoRoot, "worker/scripts/merch-funnel-rollout-step3.mjs"),
      "utf8"
    );
    expect(script).toContain("--preflight");
    expect(script).toContain("merch-funnel-rollout-preflight.mjs");
    expect(script).toContain("smokeStoreCatalog");
    expect(script).toContain("/v1/store/products/");
  });

  it("step4 asserts store catalog routes in worker index", () => {
    const script = readFileSync(
      join(repoRoot, "worker/scripts/merch-funnel-rollout-step4.mjs"),
      "utf8"
    );
    expect(script).toContain("handleGetStoreProduct");
    expect(script).toContain("worker/src/index.ts");
  });

  it("step5 supports preflight and digital production verify", () => {
    const script = readFileSync(
      join(repoRoot, "worker/scripts/merch-funnel-rollout-step5.mjs"),
      "utf8"
    );
    expect(script).toContain("--preflight");
    expect(script).toContain("--verify");
    expect(script).toContain("smokeShopGlitchProductPage");
    expect(script).toContain("worker:test:merch-print-qa");
  });

  it("step6 documents preflight before full verify", () => {
    const script = readFileSync(
      join(repoRoot, "worker/scripts/merch-funnel-rollout-step6.mjs"),
      "utf8"
    );
    expect(script).toContain("--preflight");
    expect(script).toContain("--verify");
    expect(script).toContain("verify:merch-funnel");
    expect(script).toContain("smokeShopGlitchProductPage");
    expect(script).toContain("e2e:merch-funnel");
    expect(script).toContain("runMerchRolloutPreflightVitest");
  });
});
