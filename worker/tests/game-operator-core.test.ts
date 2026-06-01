import { describe, expect, it } from "vitest";

import {
  buildGameNodeUnsignedPayload,
  mergeGameNodeDraft,
  parseUnlockedByInput,
} from "../../site/js/game-operator-core.mjs";

describe("game-operator-core", () => {
  it("merges preset patches into draft", () => {
    const merged = mergeGameNodeDraft(
      {
        public_state: "Before",
        game_meta: { collective_target: 20, compromised: false },
      },
      {
        public_state: "After quorum",
        game_meta: { collective_progress: 20, unlocked_by: ["node_04"] },
      }
    );
    expect(merged.public_state).toBe("After quorum");
    expect(merged.game_meta.collective_progress).toBe(20);
    expect(merged.game_meta.collective_target).toBe(20);
    expect(merged.game_meta.unlocked_by).toEqual(["node_04"]);
  });

  it("builds unsigned game_node payload for signing", () => {
    const payload = buildGameNodeUnsignedPayload({
      object_id: "obj_cr_node_04_river",
      parent_profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
      public_label: "River Lantern",
      public_state: "Seed clue live",
      created_at: "2026-06-01T12:00:00.000Z",
      season_id: "cr_season_01_wake",
      node_role: "temp_drop",
      district: "river_spine",
      object_streams: [],
      game_meta: { collective_target: 20 },
    });
    expect(payload.object_type).toBe("game_node");
    expect(payload.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("parses unlocked_by input", () => {
    expect(parseUnlockedByInput("node_04, node_07")).toEqual(["node_04", "node_07"]);
    expect(parseUnlockedByInput("")).toEqual([]);
  });
});
