import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(import.meta.dirname, "../..");

describe("repair-live-control-challenges-fk", () => {
  it("exports npm script and repair SQL", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    expect(pkg.scripts["worker:repair-live-control-challenges-fk"]).toContain(
      "apply-repair-live-control-challenges-fk.mjs"
    );
    const sql = readFileSync(
      join(repoRoot, "worker/scripts/repair-live-control-challenges-fk.sql"),
      "utf8"
    );
    expect(sql).toContain("REFERENCES qr_credentials (qr_id)");
    expect(sql).toContain("live_control_challenges_repair");
  });
});
