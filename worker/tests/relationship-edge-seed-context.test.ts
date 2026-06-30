import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { loadRelationshipEdgeSeedContext } from "../scripts/relationship-edge-seed-context.mjs";

const root = join(import.meta.dirname, "../..");
const seedPath = join(root, "worker/.local/city-game-seed.json");

describe("relationship-edge-seed-context", () => {
  it("loads game_operator_private_key_b58 from city-game-seed.json", () => {
    const ctx = loadRelationshipEdgeSeedContext(seedPath, join(root, "worker/.local/missing-prod.json"));
    const seed = JSON.parse(readFileSync(seedPath, "utf8"));
    expect(ctx.stewardProfileId).toBe(seed.profile_id);
    expect(ctx.publicKeyBase58).toBeTruthy();
  });

  it("prefers issuer_private_key when both keys exist", () => {
    const seed = JSON.parse(readFileSync(seedPath, "utf8"));
    const tempPath = join(root, "worker/.local/relationship-edge-seed-test.json");
    writeFileSync(
      tempPath,
      JSON.stringify({
        profile_id: seed.profile_id,
        issuer_private_key: seed.game_operator_private_key_b58,
        game_operator_private_key_b58: "invalid",
      }),
      "utf8"
    );
    const ctx = loadRelationshipEdgeSeedContext(tempPath, join(root, "worker/.local/missing-prod.json"));
    expect(ctx.stewardProfileId).toBe(seed.profile_id);
  });
});
