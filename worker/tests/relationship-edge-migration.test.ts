import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "../..");
const migrationPath = join(
  root,
  "worker/migrations/0036_relationship_edges_unlock_kind.sql"
);

describe("relationship_edges migration 0036", () => {
  it("allows unlocks kind in CHECK constraint", () => {
    const sql = readFileSync(migrationPath, "utf8");
    expect(sql).toContain("kind IN ('witnesses', 'unlocks')");
    expect(sql).toContain("relationship_edges_v0036");
  });
});
