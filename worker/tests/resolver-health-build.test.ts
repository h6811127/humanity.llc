import { describe, expect, it } from "vitest";

import { WORKER_BUILD_META } from "../src/generated/worker-build-meta";
import { resolverHealthBuildField } from "../src/resolver-health-build";

describe("resolver health build field", () => {
  it("maps WORKER_BUILD_META into health.build shape", () => {
    expect(resolverHealthBuildField()).toEqual({
      gitSha: WORKER_BUILD_META.gitSha,
      builtAt: WORKER_BUILD_META.builtAt,
      source: WORKER_BUILD_META.source,
    });
  });

  it("accepts override meta for tests", () => {
    expect(
      resolverHealthBuildField({
        gitSha: "abc1234",
        builtAt: "2026-05-27T00:00:00.000Z",
        source: "deploy",
      })
    ).toEqual({
      gitSha: "abc1234",
      builtAt: "2026-05-27T00:00:00.000Z",
      source: "deploy",
    });
  });
});
