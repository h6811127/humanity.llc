import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(import.meta.dirname, "../..");

describe("apply-child-object-qr-schema", () => {
  it("exports npm script and rebuild SQL", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    expect(pkg.scripts["worker:apply-child-object-qr-schema"]).toContain(
      "apply-child-object-qr-schema.mjs"
    );
    const sql = readFileSync(
      join(repoRoot, "worker/scripts/child-object-qr-schema-rebuild.sql"),
      "utf8"
    );
    expect(sql).toContain("child_object");
    expect(sql).toContain("PRAGMA foreign_keys = OFF");
  });
});
