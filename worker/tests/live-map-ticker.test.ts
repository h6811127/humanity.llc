import { describe, expect, it } from "vitest";

import {
  buildLiveMapHeadlines,
  dedupeHeadlines,
  headlinePassesCopyGuard,
} from "../src/city-game/live-map-ticker";
import type { MapNodeSnapshotRow } from "../src/city-game/map-node-snapshot";
import type { GameMeta } from "../src/city-game/game-meta";

const SEASON = {
  season_id: "cr_season_01_wake",
  window: { starts_at: null, ends_at: null },
  nodes: [
    { node_id: "node_01", object_id: "obj_cr_node_01_newbo", role: "relay_gate", district: "newbo", label: "NewBo relay arch" },
    { node_id: "node_04", object_id: "obj_cr_node_04_river", role: "temp_drop", district: "river_spine", label: "Riverwalk River Lantern" },
    { node_id: "node_05", object_id: "obj_cr_node_05_bridge", role: "relay_gate", district: "river_spine", label: "16th Avenue bridge" },
    { node_id: "node_06", object_id: "obj_cr_node_06_skywalk", role: "route_splitter", district: "downtown", label: "Skywalk note" },
    { node_id: "node_07", object_id: "obj_cr_node_07_cabinet", role: "lore_archive", district: "czech_village", label: "Czech Village cabinet" },
    { node_id: "node_10", object_id: "obj_cr_node_10_library", role: "witness", district: "downtown", label: "Library witness seal" },
    { node_id: "node_13", object_id: "obj_cr_node_13_finale", role: "finale", district: "downtown", label: "Downtown alley arch" },
  ],
  unlock_edges: [],
  bulletin_schedule: {
    entries: [
      {
        node_id: "node_01",
        slots: [
          {
            after_start_hours: 0,
            controller: "Red team",
            bulletin: "Shift west, mural alley stays safe",
          },
        ],
      },
    ],
  },
  route_window_schedule: {
    timezone: "America/Chicago",
    entries: [
      {
        node_id: "node_06",
        slots: [
          {
            after_start_hours: 0,
            local_hour_from: 18,
            local_hour_until: 6,
            route_open: true,
            bulletin: "Shared ending needs the group — not a solo shortcut",
          },
        ],
      },
    ],
  },
  automation: {
    quorum_nodes: ["node_04"],
    fragment_nodes: ["node_09", "node_11", "node_01"],
    finale_node: "node_13",
    witness_scarcity_node: "node_10",
  },
  live_map_ticker: { max_headlines: 8 },
};

function baseMeta(overrides: Partial<GameMeta> = {}): GameMeta {
  return {
    visible_until: null,
    compromised: false,
    collective_progress: null,
    collective_target: null,
    unlocked_by: [],
    vouch_requires: [],
    vouch_active_for: [],
    scarcity_remaining: null,
    fragment_id: null,
    ...overrides,
  };
}

function nodeRow(
  nodeId: string,
  label: string,
  role: string,
  meta: GameMeta,
  extras: Partial<MapNodeSnapshotRow> = {}
): MapNodeSnapshotRow {
  return {
    node_id: nodeId,
    label,
    district: "downtown",
    role,
    lifecycle: "active",
    map_mode: "game",
    public_state: "Live",
    game_meta: meta,
    route_open: null,
    active_bulletin: null,
    active_route: null,
    ...extras,
  };
}

describe("live-map-ticker", () => {
  it("builds CR-M01 quorum headline from node state", () => {
    const nodes = [
      nodeRow(
        "node_04",
        "Riverwalk River Lantern",
        "temp_drop",
        baseMeta({ collective_progress: 20, collective_target: 20 })
      ),
    ];
    const headlines = buildLiveMapHeadlines({
      season: SEASON as never,
      nodes,
      now: new Date("2026-06-07T12:00:00-05:00"),
    });
    expect(headlines.some((line) => line.includes("Riverwalk lantern hit 20"))).toBe(true);
  });

  it("builds CR-M03 cabinet evolved headline", () => {
    const nodes = [
      nodeRow(
        "node_07",
        "Czech Village cabinet",
        "lore_archive",
        baseMeta({ unlocked_by: ["node_04"] }),
        { public_state: "Cabinet evolved — cooperation beat secrecy" }
      ),
    ];
    const headlines = buildLiveMapHeadlines({
      season: SEASON as never,
      nodes,
      now: new Date("2026-06-07T12:00:00-05:00"),
    });
    expect(headlines.some((line) => line.includes("cabinet evolved"))).toBe(true);
  });

  it("builds CR-M04 bridge compromised headline", () => {
    const nodes = [
      nodeRow(
        "node_05",
        "16th Avenue bridge",
        "relay_gate",
        baseMeta({ compromised: true })
      ),
    ];
    const headlines = buildLiveMapHeadlines({
      season: SEASON as never,
      nodes,
      now: new Date("2026-06-07T12:00:00-05:00"),
    });
    expect(headlines.some((line) => line.includes("compromised the 16th Avenue bridge"))).toBe(
      true
    );
  });

  it("builds CR-M07 witness depleted headline", () => {
    const nodes = [
      nodeRow(
        "node_10",
        "Library witness seal",
        "witness",
        baseMeta({ scarcity_remaining: 0 })
      ),
    ];
    const headlines = buildLiveMapHeadlines({
      season: SEASON as never,
      nodes,
      now: new Date("2026-06-07T12:00:00-05:00"),
    });
    expect(headlines.some((line) => line.includes("final sunset pass"))).toBe(true);
  });

  it("includes bulletin schedule headlines when nodes are empty (pre-seed)", () => {
    const headlines = buildLiveMapHeadlines({
      season: SEASON as never,
      nodes: [],
      now: new Date("2026-06-07T12:00:00-05:00"),
    });
    expect(headlines.some((line) => line.includes("Red reclaimed the NewBo relay arch"))).toBe(
      true
    );
  });

  it("caps headline count and rejects forbidden analytics copy", () => {
    expect(headlinePassesCopyGuard("River quorum met")).toBe(true);
    expect(headlinePassesCopyGuard("Leaderboard updated")).toBe(false);
    const capped = dedupeHeadlines([
      "One",
      "One",
      "Two",
      "leaderboard spike",
      "Three",
    ]);
    expect(capped).toEqual(["One", "Two", "Three"]);
  });

  it("respects max_headlines config", () => {
    const many = Array.from({ length: 12 }, (_, i) => `Beat ${i}`);
    const capped = dedupeHeadlines(many).slice(0, 3);
    expect(capped).toHaveLength(3);
  });
});
