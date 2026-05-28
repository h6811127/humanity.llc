import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Production route guard for merch funnel + print middleware.
 * @see docs/MERCH_FUNNEL_MVP.md § Worker route (required)
 */
describe("wrangler production routes (merch)", () => {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
  const toml = readFileSync(join(repoRoot, "worker/wrangler.toml"), "utf8");

  it("routes humanity.llc/v1/* to the resolver Worker", () => {
    expect(toml).toMatch(/pattern\s*=\s*"humanity\.llc\/v1\/\*"/);
  });
});
