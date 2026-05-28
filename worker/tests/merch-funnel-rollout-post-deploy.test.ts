import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  postDeployMerchScript,
  postDeployMerchTarget,
} from "../scripts/merch-funnel-rollout-post-deploy.mjs";

const repoRoot = join(import.meta.dirname, "../..");

describe("merch-funnel-rollout-post-deploy", () => {
  it("maps --pages and --worker to rollout steps", () => {
    expect(postDeployMerchTarget(["node", "script", "--pages"])).toBe("pages");
    expect(postDeployMerchTarget(["node", "script", "--worker"])).toBe("worker");
    expect(postDeployMerchTarget(["node", "script"])).toBeNull();
    expect(postDeployMerchScript("pages")).toBe("merch-funnel:rollout:step2");
    expect(postDeployMerchScript("worker")).toBe("merch-funnel:rollout:step3");
  });

  it("package.json exposes post-deploy script", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    expect(pkg.scripts["merch-funnel:rollout:post-deploy"]).toContain(
      "merch-funnel-rollout-post-deploy.mjs"
    );
  });

  it("deploy workflows run post-deploy verify after deploy", () => {
    const pages = readFileSync(
      join(repoRoot, ".github/workflows/deploy-pages.yml"),
      "utf8"
    );
    const worker = readFileSync(
      join(repoRoot, ".github/workflows/deploy-worker.yml"),
      "utf8"
    );
    expect(pages).toContain("merch-funnel:rollout:post-deploy -- --pages");
    expect(worker).toContain("merch-funnel:rollout:post-deploy -- --worker");
    expect(pages.indexOf("pages:deploy")).toBeLessThan(
      pages.indexOf("merch-funnel:rollout:post-deploy")
    );
    expect(worker.indexOf("worker:deploy")).toBeLessThan(
      worker.indexOf("merch-funnel:rollout:post-deploy")
    );
  });
});
