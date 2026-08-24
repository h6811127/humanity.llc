import { describe, expect, it } from "vitest";

import { GAME_NODE_OBJECT_TYPE } from "../src/city-game/constants";
import { gameMetaFromChildDocumentJson, normalizeGameMeta } from "../src/city-game/game-meta";
import { isGameNodeExpired, parseGameNodeFields } from "../src/city-game/scan-view";

function gameNodeDocument(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    object_type: GAME_NODE_OBJECT_TYPE,
    season_id: "cr_season_01_wake",
    node_role: "temp_drop",
    district: "newbo",
    game_meta: {
      visible_until: null,
      compromised: false,
    },
    ...overrides,
  });
}

describe("parseGameNodeFields", () => {
  it("returns null for missing, empty, or invalid JSON", () => {
    expect(parseGameNodeFields(null)).toBeNull();
    expect(parseGameNodeFields(undefined)).toBeNull();
    expect(parseGameNodeFields("")).toBeNull();
    expect(parseGameNodeFields("{not-json")).toBeNull();
  });

  it("returns null when object_type is not game_node", () => {
    expect(
      parseGameNodeFields(
        JSON.stringify({
          object_type: "status_plate",
          season_id: "cr_season_01_wake",
          node_role: "temp_drop",
        })
      )
    ).toBeNull();
  });

  it("returns null when season_id or node_role is missing or whitespace", () => {
    expect(
      parseGameNodeFields(
        gameNodeDocument({ season_id: "", node_role: "temp_drop" })
      )
    ).toBeNull();
    expect(
      parseGameNodeFields(
        gameNodeDocument({ season_id: "   ", node_role: "temp_drop" })
      )
    ).toBeNull();
    expect(
      parseGameNodeFields(
        gameNodeDocument({ season_id: "cr_season_01_wake", node_role: "" })
      )
    ).toBeNull();
    expect(
      parseGameNodeFields(
        JSON.stringify({
          object_type: GAME_NODE_OBJECT_TYPE,
          season_id: "cr_season_01_wake",
        })
      )
    ).toBeNull();
  });

  it("swallows invalid game_meta instead of throwing", () => {
    expect(
      parseGameNodeFields(gameNodeDocument({ game_meta: "not-an-object" }))
    ).toBeNull();
    expect(
      parseGameNodeFields(
        gameNodeDocument({ game_meta: { visible_until: "Friday" } })
      )
    ).toBeNull();
  });

  it("parses season, role, trimmed district, and defaulted game_meta", () => {
    const fields = parseGameNodeFields(
      gameNodeDocument({
        season_id: "  cr_season_01_wake  ",
        node_role: "  temp_drop  ",
        district: "  newbo  ",
        game_meta: undefined,
      })
    );
    expect(fields?.seasonId).toBe("cr_season_01_wake");
    expect(fields?.nodeRole).toBe("temp_drop");
    expect(fields?.district).toBe("newbo");
    expect(fields?.gameMeta.visible_until).toBeNull();
    expect(fields?.gameMeta.compromised).toBe(false);
  });

  it("omits district when it is absent or blank", () => {
    expect(parseGameNodeFields(gameNodeDocument({ district: "   " }))?.district).toBeNull();
    const withoutDistrict = JSON.parse(gameNodeDocument()) as Record<string, unknown>;
    delete withoutDistrict.district;
    expect(parseGameNodeFields(JSON.stringify(withoutDistrict))?.district).toBeNull();
  });
});

describe("isGameNodeExpired", () => {
  const now = new Date("2026-06-14T22:00:00.000Z");

  it("is not expired when visible_until is absent or unparsable", () => {
    expect(isGameNodeExpired(normalizeGameMeta({ visible_until: null }), now)).toBe(false);
    expect(isGameNodeExpired(normalizeGameMeta({}), now)).toBe(false);
    expect(
      isGameNodeExpired({ ...normalizeGameMeta({}), visible_until: "not-a-date" }, now)
    ).toBe(false);
  });

  it("treats visible_until as exclusive — still visible at the exact instant", () => {
    expect(
      isGameNodeExpired(
        normalizeGameMeta({ visible_until: "2026-06-14T22:00:00.000Z" }),
        now
      )
    ).toBe(false);
    expect(
      isGameNodeExpired(
        normalizeGameMeta({ visible_until: "2026-06-14T22:00:00.001Z" }),
        now
      )
    ).toBe(false);
    expect(
      isGameNodeExpired(
        normalizeGameMeta({ visible_until: "2026-06-14T21:59:59.999Z" }),
        now
      )
    ).toBe(true);
  });
});

describe("gameMetaFromChildDocumentJson", () => {
  it("reads game_meta without requiring season_id or node_role", () => {
    const meta = gameMetaFromChildDocumentJson(
      JSON.stringify({
        object_type: GAME_NODE_OBJECT_TYPE,
        game_meta: { visible_until: "2026-06-14T22:00:00-05:00" },
      })
    );
    expect(meta?.visible_until).toBe("2026-06-14T22:00:00-05:00");
  });

  it("returns null for non-game documents and invalid JSON", () => {
    expect(gameMetaFromChildDocumentJson(null)).toBeNull();
    expect(gameMetaFromChildDocumentJson("{")).toBeNull();
    expect(
      gameMetaFromChildDocumentJson(
        JSON.stringify({ object_type: "lost_item_relay", game_meta: {} })
      )
    ).toBeNull();
  });
});
