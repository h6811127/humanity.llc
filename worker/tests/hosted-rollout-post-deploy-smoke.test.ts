import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  postDeployCheckFlag,
  postDeploySmokeTarget,
} from "../scripts/hosted-rollout-post-deploy-smoke.mjs";
import { readWranglerHostedFlag } from "../scripts/hosted-rollout-step4a.mjs";

const repoRoot = join(import.meta.dirname, "../..");

describe("hosted-rollout-post-deploy-smoke", () => {
  it("targets step4 smoke when HOSTED_STEWARD_ENABLED is 1", () => {
    expect(readWranglerHostedFlag()).toBe(true);
    expect(postDeploySmokeTarget()).toBe("step4");
  });

  it("package.json exposes post-deploy smoke script", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    expect(pkg.scripts["hosted:rollout:post-deploy-smoke"]).toContain(
      "hosted-rollout-post-deploy-smoke.mjs"
    );
  });

  it("postDeployCheckFlag selects verify for step 4b CI", () => {
    expect(postDeployCheckFlag(false)).toBe("--smoke");
    expect(postDeployCheckFlag(true)).toBe("--verify");
  });

  it("deploy-worker workflow runs post-deploy verify after deploy", () => {
    const workflow = readFileSync(
      join(repoRoot, ".github/workflows/deploy-worker.yml"),
      "utf8"
    );
    expect(workflow).toContain("hosted:rollout:post-deploy-smoke -- --verify");
    expect(workflow).toContain("OPERATOR_AUDIT_TOKEN");
    expect(workflow.indexOf("worker:deploy")).toBeLessThan(
      workflow.indexOf("hosted:rollout:post-deploy-smoke")
    );
  });
});
