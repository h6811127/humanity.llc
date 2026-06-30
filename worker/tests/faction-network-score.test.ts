import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildSignalWarSnapshotSummary,
  computeFactionNetworkPoints,
} from "../src/city-game/faction-network-score";
import type { MapNodeSnapshotRow } from "../src/city-game/map-node-snapshot";
import { normalizeGameMeta } from "../src/city-game/game-meta";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const season = JSON.parse(
  readFileSync(join(root, "site/data/city-game-cr-season-01.json"), "utf8")
);

function relayRow(
  nodeId: string,
  faction: string | null,
  points: number | null = 10
): MapNodeSnapshotRow {
  return {
    node_id: nodeId,
    label: nodeId,
    district: "river_spine",
    role: "relay_gate",
    lifecycle: "active",
    map_mode: "game",
    public_state: "Relay",
    game_meta: normalizeGameMeta({
      held_by_faction: faction,
      held_until: "2026-07-01T18:00:00-05:00",
      points_per_hour: points,
    }),
    route_open: null,
    active_bulletin: null,
    active_route: null,
    vouch_gate: null,
  };
}

describe("faction-network-score", () => {
  it("sums weighted holds per faction (SW-06–SW-07)", () => {
    const now = new Date("2026-06-07T18:00:00-05:00");
    const nodes = [
      relayRow("node_05", "red", 10),
      relayRow("node_15", "blue", 8),
      relayRow("node_08", "green", null),
    ];
    const points = computeFactionNetworkPoints({ nodes, season, now });
    expect(points.red).toBe(10);
    expect(points.blue).toBe(8);
    expect(points.green).toBe(6);
    expect(points.yellow).toBe(0);
  });

  it("builds snapshot summary with relay hold rows", () => {
    const now = new Date("2026-06-07T18:00:00-05:00");
    const summary = buildSignalWarSnapshotSummary({
      nodes: [relayRow("node_05", "red", 10)],
      season,
      now,
    });
    expect(summary.dominant_faction).toBe("red");
    expect(summary.summary_lines[0]).toMatch(/Signal War: Red · 10 pts/);
    expect(summary.relay_holds).toHaveLength(1);
    expect(summary.relay_holds[0]?.node_id).toBe("node_05");
  });

  it("doubles network weight for double_capture artifact (SW-09)", () => {
    const now = new Date("2026-06-07T18:00:00-05:00");
    const row = relayRow("node_05", "green", 5);
    row.game_meta.artifact_id = "double_capture";
    const points = computeFactionNetworkPoints({ nodes: [row], season, now });
    expect(points.green).toBe(10);
  });

  it("neutralizes expired holds for scoring (SW-05)", () => {
    const now = new Date("2026-07-02T12:00:00-05:00");
    const nodes = [
      relayRow("node_05", "red", 10),
    ];
    nodes[0]!.game_meta.held_until = "2026-06-07T18:00:00-05:00";
    const points = computeFactionNetworkPoints({ nodes, season, now });
    expect(points.red).toBe(0);
  });
});
