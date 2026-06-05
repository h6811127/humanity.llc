import { describe, expect, it } from "vitest";

import { buildDualVictorySnapshot } from "../src/city-game/dual-victory";
import { normalizeGameMeta } from "../src/city-game/game-meta";
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
    public_state: partial.public_state ?? "Live",
    game_meta: partial.game_meta ?? normalizeGameMeta({}),
    route_open: null,
    active_bulletin: null,
    active_route: null,
    ...partial,
  };
}

describe("dual-victory (SW-13)", () => {
  it("reports network majority when a faction holds half of owned relays", () => {
    const now = new Date("2026-06-07T12:00:00.000Z");
    const nodes = [
      row({
        node_id: "node_a",
        role: "relay_gate",
        game_meta: normalizeGameMeta({
          held_by_faction: "red",
          held_until: "2026-06-08T12:00:00.000Z",
        }),
      }),
      row({
        node_id: "node_b",
        role: "relay_gate",
        game_meta: normalizeGameMeta({
          held_by_faction: "red",
          held_until: "2026-06-08T12:00:00.000Z",
        }),
      }),
      row({
        node_id: "node_c",
        role: "relay_gate",
        game_meta: normalizeGameMeta({
          held_by_faction: "blue",
          held_until: "2026-06-08T12:00:00.000Z",
        }),
      }),
    ];
    const summary = buildDualVictorySnapshot({
      nodes,
      factionPoints: { red: 20, blue: 8, green: 0, yellow: 0 },
      season: CR_SEASON_01,
      now,
    });
    expect(summary.network_leader).toBe("red");
    expect(summary.network_majority_met).toBe(true);
    expect(summary.summary_lines.some((line) => line.includes("Signal War:"))).toBe(
      true
    );
  });

  it("tracks awakening fragment lattice on finale node", () => {
    const finaleId = CR_SEASON_01.automation?.finale_node ?? "node_13";
    const fragmentIds = CR_SEASON_01.automation?.fragment_nodes ?? [];
    const nodes = [
      row({
        node_id: finaleId,
        role: "finale",
        public_state: "Finale switch live",
        game_meta: normalizeGameMeta({
          fragment_id: "finale",
          unlocked_by: [...fragmentIds],
        }),
      }),
    ];
    const summary = buildDualVictorySnapshot({
      nodes,
      factionPoints: { red: 0, blue: 0, green: 0, yellow: 0 },
      season: CR_SEASON_01,
      now: new Date("2026-06-07T12:00:00.000Z"),
    });
    expect(summary.awakening_fragments_complete).toBe(true);
    expect(summary.finale_open).toBe(true);
    expect(summary.summary_lines.some((line) => line.includes("all 3 fragments found"))).toBe(
      true
    );
  });
});
