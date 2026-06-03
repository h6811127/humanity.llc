import { describe, expect, it } from "vitest";

import type { GameMeta } from "../src/city-game/game-meta";
import {
  buildMapNodeChips,
  deriveMapNodeSnapshot,
  type MapNodeSnapshotRow,
} from "../src/city-game/map-node-snapshot";
import { CR_SEASON_01 } from "../src/city-game/season-config";

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

function snapshotRow(
  overrides: Partial<MapNodeSnapshotRow> & Pick<MapNodeSnapshotRow, "node_id" | "role">
): MapNodeSnapshotRow {
  return {
    label: overrides.label ?? overrides.node_id,
    district: overrides.district ?? "downtown",
    lifecycle: "active",
    map_mode: "game",
    public_state: "Live",
    game_meta: baseMeta(),
    route_open: null,
    active_bulletin: null,
    active_route: null,
    ...overrides,
  };
}

function childDocument(input: {
  nodeId: string;
  role: string;
  district: string;
  meta?: Partial<GameMeta>;
  careValue?: string;
  status?: string;
}) {
  const registry = CR_SEASON_01.nodes.find((n) => n.node_id === input.nodeId);
  return JSON.stringify({
    object_id: registry?.object_id ?? `obj_${input.nodeId}`,
    object_type: "game_node",
    season_id: CR_SEASON_01.season_id,
    node_role: input.role,
    district: input.district,
    game_meta: baseMeta(input.meta),
    object_streams: [
      {
        id: "care",
        class: "care",
        label: "Care",
        value: input.careValue ?? "Open",
      },
    ],
  });
}

describe("buildMapNodeChips", () => {
  it("shows maintenance only when care pause wins", () => {
    const chips = buildMapNodeChips(
      snapshotRow({
        node_id: "node_01",
        role: "relay_gate",
        map_mode: "care_pause",
        public_state: "Trail closed for maintenance",
        game_meta: baseMeta({ compromised: true }),
        active_bulletin: { controller: "Red team" },
      }),
      "open"
    );
    expect(chips).toEqual([
      { kind: "maintenance", label: "Care", value: "Trail closed for maintenance" },
    ]);
  });

  it("shows revoked chip for revoked lifecycle", () => {
    const chips = buildMapNodeChips(
      snapshotRow({
        node_id: "node_05",
        role: "relay_gate",
        lifecycle: "revoked",
        map_mode: "revoked",
      }),
      "open"
    );
    expect(chips[0]?.kind).toBe("revoked");
  });

  it("shows collective quorum progress", () => {
    const chips = buildMapNodeChips(
      snapshotRow({
        node_id: "node_04",
        role: "temp_drop",
        game_meta: baseMeta({ collective_progress: 14, collective_target: 20 }),
      }),
      "unset"
    );
    expect(chips.some((c) => c.kind === "collective" && c.value === "14 / 20")).toBe(true);
  });

  it("shows fragment lattice on finale node", () => {
    const chips = buildMapNodeChips(
      snapshotRow({
        node_id: "node_13",
        role: "finale",
        game_meta: baseMeta({ unlocked_by: ["node_09", "node_11"] }),
      }),
      "open"
    );
    expect(chips.some((c) => c.kind === "finale" && c.value.includes("2 / 3"))).toBe(true);
  });

  it("shows compromised relay chip", () => {
    const chips = buildMapNodeChips(
      snapshotRow({
        node_id: "node_05",
        role: "relay_gate",
        game_meta: baseMeta({ compromised: true }),
      }),
      "open"
    );
    expect(chips.some((c) => c.value.includes("Compromised"))).toBe(true);
  });
});

describe("deriveMapNodeSnapshot", () => {
  it("maps care pause from care stream", () => {
    const snap = deriveMapNodeSnapshot({
      child: {
        object_id: "obj_cr_node_01_newbo",
        object_type: "game_node",
        status: "active",
        public_state: "Relay readable",
        child_object_document_json: childDocument({
          nodeId: "node_01",
          role: "relay_gate",
          district: "newbo",
          careValue: "Closed for maintenance",
        }),
      },
      season: CR_SEASON_01,
      env: { CITY_GAME_ENABLED: "1" },
      now: new Date("2026-06-07T12:00:00-05:00"),
    });
    expect(snap?.map_mode).toBe("care_pause");
    expect(buildMapNodeChips(snap!, "open")[0]?.kind).toBe("maintenance");
  });
});
