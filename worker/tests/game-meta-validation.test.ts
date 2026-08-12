import { describe, expect, it } from "vitest";

import {
  gameMetaFromChildDocumentJson,
  normalizeGameMeta,
  validateGameNodeDistrict,
  validateGameNodeDocument,
} from "../src/city-game/game-meta";

describe("normalizeGameMeta validation edges", () => {
  it("rejects non-object game_meta", () => {
    expect(() => normalizeGameMeta("nope")).toThrow(/game_meta must be an object/);
  });

  it("rejects non-ISO visible_until and held_until", () => {
    expect(() =>
      normalizeGameMeta({ visible_until: "tomorrow" })
    ).toThrow(/visible_until must be ISO 8601/);
    expect(() =>
      normalizeGameMeta({ held_until: "2026-05-01" })
    ).toThrow(/held_until must be ISO 8601/);
  });

  it("rejects unknown held_by_faction values", () => {
    expect(() =>
      normalizeGameMeta({ held_by_faction: "purple" })
    ).toThrow(/held_by_faction must be red, blue, green, yellow, neutral/);
  });

  it("accepts Signal War hold fields when well-formed", () => {
    const out = normalizeGameMeta({
      held_by_faction: "neutral",
      held_until: "2026-06-08T18:00:00.000Z",
      points_per_hour: 12,
      overharvest_count: 0,
      overharvest_limit: 3,
    });
    expect(out.held_by_faction).toBe("neutral");
    expect(out.points_per_hour).toBe(12);
    expect(out.overharvest_limit).toBe(3);
  });

  it("enforces vouch array item and length limits", () => {
    expect(() =>
      normalizeGameMeta({ vouch_requires: ["ok", ""] })
    ).toThrow(/non-empty string/);
    expect(() =>
      normalizeGameMeta({
        unlocked_by: Array.from({ length: 9 }, (_, i) => `node_${i}`),
      })
    ).toThrow(/at most 8 entries/);
  });

  it("rejects non-integer collective progress", () => {
    expect(() =>
      normalizeGameMeta({ collective_progress: 1.5 })
    ).toThrow(/integer or null/);
  });
});

describe("validateGameNodeDistrict", () => {
  it("allows omitted or null district", () => {
    expect(() => validateGameNodeDistrict(null)).not.toThrow();
  });

  it("rejects uppercase or non-slug districts", () => {
    expect(() => validateGameNodeDistrict("NewBo")).toThrow(/lowercase slug/);
    expect(() => validateGameNodeDistrict("river-spine")).toThrow(/lowercase slug/);
  });

  it("rejects districts outside the season allow-list", () => {
    expect(() =>
      validateGameNodeDistrict("old_town", ["downtown", "river"])
    ).toThrow(/match a season district/);
  });
});

describe("validateGameNodeDocument", () => {
  it("requires season_id and a known node_role", () => {
    expect(() =>
      validateGameNodeDocument({
        object_type: "game_node",
        object_streams: [{ id: "care", class: "care", label: "Site", value: "Clear" }],
      })
    ).toThrow(/season_id is required/);

    expect(() =>
      validateGameNodeDocument({
        object_type: "game_node",
        season_id: "cr_season_01_wake",
        node_role: "not_a_role",
        object_streams: [{ id: "care", class: "care", label: "Site", value: "Clear" }],
      })
    ).toThrow(/node_role is required/);
  });
});

describe("gameMetaFromChildDocumentJson", () => {
  it("returns null for missing, non-game, or malformed JSON", () => {
    expect(gameMetaFromChildDocumentJson(null)).toBeNull();
    expect(gameMetaFromChildDocumentJson("{")).toBeNull();
    expect(
      gameMetaFromChildDocumentJson(
        JSON.stringify({ object_type: "status_plate", game_meta: {} })
      )
    ).toBeNull();
  });

  it("parses game_meta from a game_node document", () => {
    const meta = gameMetaFromChildDocumentJson(
      JSON.stringify({
        object_type: "game_node",
        game_meta: { compromised: true, held_by_faction: "red" },
      })
    );
    expect(meta?.compromised).toBe(true);
    expect(meta?.held_by_faction).toBe("red");
  });
});
