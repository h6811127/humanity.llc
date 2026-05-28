import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeOperatorAuditToken } from "../scripts/hosted-rollout-token.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("hosted-rollout-step4b", () => {
  it("package.json exposes hosted:rollout:step4b", () => {
    const pkg = JSON.parse(
      readFileSync(path.join(repoRoot, "package.json"), "utf8")
    );
    expect(pkg.scripts["hosted:rollout:step4b"]).toContain("hosted-rollout-step4b.mjs");
  });

  it("rejects doc placeholder OPERATOR_AUDIT_TOKEN", () => {
    expect(() => normalizeOperatorAuditToken("...")).toThrow(/doc placeholder/);
  });

  it("step4b script documents preflight and local-smoke", () => {
    const src = readFileSync(
      path.join(repoRoot, "worker/scripts/hosted-rollout-step4b.mjs"),
      "utf8"
    );
    expect(src).toContain("--preflight");
    expect(src).toContain("--local-smoke");
    expect(src).toContain("hosted-rollout-step4.mjs");
    expect(src).toContain("runStep4PreflightVitest");
  });
});
