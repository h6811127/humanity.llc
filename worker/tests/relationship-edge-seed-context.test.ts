import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { loadRelationshipEdgeSeedContext } from "../scripts/relationship-edge-seed-context.mjs";

const fixturesDir = join(import.meta.dirname, "fixtures");
const seedFixturePath = join(fixturesDir, "city-game-seed-smoke.json");

describe("relationship-edge-seed-context", () => {
  it("loads game_operator_private_key_b58 from city-game-seed.json", () => {
    const ctx = loadRelationshipEdgeSeedContext(
      seedFixturePath,
      join(fixturesDir, "missing-prod-seed.json")
    );
    const seed = JSON.parse(readFileSync(seedFixturePath, "utf8"));
    expect(ctx.stewardProfileId).toBe(seed.profile_id);
    expect(ctx.publicKeyBase58).toBe(seed.public_key_base58);
  });

  it("prefers issuer_private_key when both keys exist", () => {
    const seed = JSON.parse(readFileSync(seedFixturePath, "utf8"));
    const tempPath = join(fixturesDir, "relationship-edge-seed-prefer-issuer-temp.json");
    writeFileSync(
      tempPath,
      JSON.stringify({
        profile_id: seed.profile_id,
        issuer_private_key: seed.game_operator_private_key_b58,
        game_operator_private_key_b58: "invalid",
      }),
      "utf8"
    );
    try {
      const ctx = loadRelationshipEdgeSeedContext(
        tempPath,
        join(fixturesDir, "missing-prod-seed.json")
      );
      expect(ctx.stewardProfileId).toBe(seed.profile_id);
      expect(ctx.publicKeyBase58).toBe(seed.public_key_base58);
    } finally {
      unlinkSync(tempPath);
    }
  });
});
