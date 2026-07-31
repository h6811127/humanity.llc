import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "../..");
const unlockKindMigrationPath = join(
  root,
  "worker/migrations/0036_relationship_edges_unlock_kind.sql"
);
const stewardScopeMigrationPath = join(
  root,
  "worker/migrations/0038_relationship_edges_steward_scope.sql"
);

describe("relationship_edges migration 0036", () => {
  it("allows unlocks kind in CHECK constraint", () => {
    const sql = readFileSync(unlockKindMigrationPath, "utf8");
    expect(sql).toContain("kind IN ('witnesses', 'unlocks')");
    expect(sql).toContain("relationship_edges_v0036");
  });
});

describe("relationship_edges migration 0038", () => {
  it("scopes deterministic edge IDs to each steward graph", () => {
    const sql = readFileSync(stewardScopeMigrationPath, "utf8");
    expect(sql).toContain("PRIMARY KEY (steward_profile_id, edge_id)");
    expect(sql).toContain("relationship_edges_v0038");
    expect(sql).toContain("FROM relationship_edges");
  });
});
