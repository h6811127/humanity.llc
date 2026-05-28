import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(import.meta.dirname, "../..");

describe("hosted-rollout-verify-path", () => {
  it("verify-path script documents roadmap step 3 Vitest bundle", () => {
    const script = readFileSync(
      join(repoRoot, "worker/scripts/hosted-rollout-verify-path.mjs"),
      "utf8"
    );
    expect(script).toContain("verify:hosted-g0");
    expect(script).toContain("device-steward-session-core.test.ts");
    expect(script).toContain("device-steward-billing-return-core.test.ts");
    expect(script).toContain("created-child-object-core.test.ts");
    expect(script).toContain("hosted-rollout-step3a-smoke.test.ts");
    expect(script).toContain("--e2e");
    expect(script).toContain("e2e:steward-hosted");
    expect(existsSync(join(repoRoot, "docs/STEWARD_DEVICE_ROADMAP.md"))).toBe(true);
  });

  it("package.json exposes hosted:rollout:verify-path", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    expect(pkg.scripts["hosted:rollout:verify-path"]).toContain(
      "hosted-rollout-verify-path.mjs"
    );
    expect(pkg.scripts["hosted:stripe-return-url"]).toContain(
      "hosted-stripe-checkout-return.mjs"
    );
  });

  it("created page wires child object status plate panel", () => {
    const html = readFileSync(join(repoRoot, "site/created/index.html"), "utf8");
    expect(html).toContain('id="child-object-add-status-plate"');
    expect(html).toContain('id="child-object-status-plate-form"');
    expect(html).toContain('id="child-object-plate-label"');
    expect(existsSync(join(repoRoot, "site/js/created-child-object.mjs"))).toBe(true);
  });
});
