import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(import.meta.dirname, "../..");

describe("hosted-rollout-step4", () => {
  it("step4 forwards deploy/verify to step4b flow", () => {
    const script = readFileSync(
      join(repoRoot, "worker/scripts/hosted-rollout-step4.mjs"),
      "utf8"
    );
    expect(script).toContain("--deploy");
    expect(script).toContain("--verify");
    expect(script).toContain("worker:deploy");
  });
});
