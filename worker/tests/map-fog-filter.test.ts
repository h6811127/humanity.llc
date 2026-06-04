import { describe, expect, it } from "vitest";

import { normalizeGameMeta } from "../src/city-game/game-meta";
import {
  filterNodesForMapBoard,
  nodeVisibleOnMapBoard,
  rumoredNodeIdsForSeason,
  seasonMapVisibility,
} from "../src/city-game/map-fog-filter";
import type { MapNodeSnapshotRow } from "../src/city-game/map-node-snapshot";
import { CR_SEASON_01 } from "../src/city-game/season-config";

function row(
  partial: Partial<MapNodeSnapshotRow> & Pick<MapNodeSnapshotRow, "node_id" | "role">
): MapNodeSnapshotRow {
  return {
    label: partial.label ?? partial.node_id,
    district: partial.district ?? "newbo",
    lifecycle: "active",
    map_mode: "game",
    public_state: "Live",
    game_meta: partial.game_meta ?? normalizeGameMeta({}),
    route_open: null,
    active_bulletin: null,
    active_route: null,
    ...partial,
  };
}

describe("map-fog-filter (SW-08)", () => {
  it("defaults map visibility to public when unset", () => {
    const season = { ...CR_SEASON_01, signal_war: {} };
    expect(seasonMapVisibility(season)).toBe("public");
  });

  it("reads signal_war map_visibility from season JSON", () => {
    expect(seasonMapVisibility(CR_SEASON_01)).toBe("signal_war");
  });

  it("hides unclaimed relays in signal_war mode", () => {
    const now = new Date("2026-06-07T18:00:00-05:00");
    const rumored = rumoredNodeIdsForSeason(CR_SEASON_01, now);
    const relay = row({
      node_id: "node_99",
      role: "relay_gate",
      game_meta: normalizeGameMeta({ held_by_faction: null }),
    });
    expect(
      nodeVisibleOnMapBoard({
        row: relay,
        season: CR_SEASON_01,
        rumored,
        now,
      })
    ).toBe(false);
  });

  it("shows owned relays and bulletin-rumored nodes", () => {
    const now = new Date("2026-06-07T18:00:00-05:00");
    const rumored = rumoredNodeIdsForSeason(CR_SEASON_01, now);
    expect(rumored.has("node_01")).toBe(true);

    const owned = row({
      node_id: "node_20",
      role: "relay_gate",
      game_meta: normalizeGameMeta({
        held_by_faction: "blue",
        held_until: "2026-06-08T12:00:00.000Z",
      }),
    });
    expect(
      nodeVisibleOnMapBoard({
        row: owned,
        season: CR_SEASON_01,
        rumored,
        now,
      })
    ).toBe(true);

    const rumoredRelay = row({
      node_id: "node_08",
      role: "relay_gate",
      game_meta: normalizeGameMeta({ held_by_faction: null }),
    });
    expect(
      nodeVisibleOnMapBoard({
        row: rumoredRelay,
        season: CR_SEASON_01,
        rumored,
        now,
      })
    ).toBe(true);
  });

  it("always shows cooperative sanctuary nodes under signal_war fog", () => {
    const now = new Date("2026-06-07T18:00:00-05:00");
    const rumored = rumoredNodeIdsForSeason(CR_SEASON_01, now);
    const sanctuary = row({
      node_id: "node_02",
      role: "sanctuary",
      game_meta: normalizeGameMeta({}),
    });
    expect(
      nodeVisibleOnMapBoard({
        row: sanctuary,
        season: CR_SEASON_01,
        rumored,
        now,
      })
    ).toBe(true);
  });

  it("filterNodesForMapBoard drops hidden relay rows from snapshot list", () => {
    const now = new Date("2026-06-07T18:00:00-05:00");
    const nodes = [
      row({
        node_id: "node_02",
        role: "sanctuary",
      }),
      row({
        node_id: "node_hidden",
        role: "relay_gate",
        game_meta: normalizeGameMeta({ held_by_faction: null }),
      }),
      row({
        node_id: "node_01",
        role: "relay_gate",
        game_meta: normalizeGameMeta({
          held_by_faction: "red",
          held_until: "2026-06-08T12:00:00.000Z",
        }),
      }),
    ];
    const filtered = filterNodesForMapBoard({
      nodes,
      season: CR_SEASON_01,
      now,
    });
    expect(filtered.map((n) => n.node_id)).toEqual(["node_02", "node_01"]);
  });
});
