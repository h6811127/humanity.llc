import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(import.meta.dirname, "../..");

describe("hosted-rollout-step1", () => {
  it("references hosted steward D1 migrations on disk", () => {
    for (const name of [
      "0012_steward_hosted.sql",
      "0013_steward_billing.sql",
      "0031_game_season_metering.sql",
    ]) {
      expect(existsSync(join(repoRoot, "worker/migrations", name))).toBe(true);
    }
  });

  it("rollout script documents G0 verify and migrate commands", () => {
    const script = readFileSync(
      join(repoRoot, "worker/scripts/hosted-rollout-step1.mjs"),
      "utf8"
    );
    expect(script).toContain("verify:hosted-g0");
    expect(script).toContain("worker:migrate:local");
    expect(script).toContain("0012_steward_hosted.sql");
    expect(script).toContain("0013_steward_billing.sql");
    expect(script).toContain("0031_game_season_metering.sql");
  });

  it("package.json exposes hosted:rollout:step1", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    expect(pkg.scripts["hosted:rollout:step1"]).toContain("hosted-rollout-step1.mjs");
  });
});
