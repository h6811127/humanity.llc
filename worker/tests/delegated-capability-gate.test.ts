import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function readRepoFile(path: string): string {
  return readFileSync(join(repoRoot, path), "utf8");
}

describe("delegated child capability product gate", () => {
  it("documents dormant prep without claiming public exposure", () => {
    const gate = readRepoFile("docs/DELEGATED_CHILD_CAPABILITIES_GATE.md");
    const schema = readRepoFile("docs/DELEGATED_CHILD_CAPABILITY_SCHEMA.md");

    expect(gate).toContain("Deferred / dormant prep only");
    expect(gate).toContain("no public route registration");
    expect(gate).toContain("not registered");
    expect(gate).toContain("not mounted");
    expect(schema).toContain("dormant implementation prep");
    expect(schema).toContain("intentionally not mounted");
  });

  it("keeps delegated capability list/issue/revoke routes unregistered", () => {
    const index = readRepoFile("worker/src/index.ts");

    expect(index).not.toContain("delegated-capability-routes");
    expect(index).not.toContain("handleGetDelegatedCapabilities");
    expect(index).not.toContain("handlePostDelegatedCapabilityIssue");
    expect(index).not.toContain("handlePostDelegatedCapabilityRevoke");
    expect(index).not.toMatch(/delegated-capabilities/);
  });

  it("keeps the /created/ delegated management panel unmounted", () => {
    const createdHtml = readRepoFile("site/created/index.html");
    const createdJs = readRepoFile("site/js/created.mjs");

    expect(createdHtml).not.toContain("delegated-capability-manage");
    expect(createdHtml).not.toContain("delegated-capability-issue-form");
    expect(createdJs).not.toContain("created-delegated-capability");
    expect(createdJs).not.toContain("initCreatedDelegatedCapability");
  });
});
