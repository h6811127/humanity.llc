import { describe, expect, it } from "vitest";

import type { GameMeta } from "../src/city-game/game-meta";
import {
  buildMapNodeChips,
  deriveMapNodeSnapshot,
} from "../src/city-game/map-node-snapshot";
import { nodeVisibleOnMapBoard } from "../src/city-game/map-fog-filter";
import { CR_SEASON_01 } from "../src/city-game/season-config";
import { resolveSeasonWindowPhase } from "../src/city-game/season-window";
import {
  buildWitnessMetaByNodeId,
  lorePathUnlocked,
  mapVouchChipValue,
  resolveWitnessGate,
} from "../src/city-game/witness-gate";
import type { ChildObjectRow } from "../src/db/types";
import { composeChildObjectScanState } from "../src/live-object/compose-child-object-scan";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const ENV = { CITY_GAME_ENABLED: "1" };
const NOW = new Date("2026-06-07T00:00:00-05:00");

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

function childDocument(input: {
  nodeId: string;
  role: string;
  district: string;
  meta?: Partial<GameMeta>;
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
      { id: "care", class: "care", label: "Care", value: "Open" },
    ],
  });
}

function gameChild(input: {
  nodeId: string;
  role: string;
  district: string;
  meta?: Partial<GameMeta>;
}): ChildObjectRow {
  const registry = CR_SEASON_01.nodes.find((n) => n.node_id === input.nodeId);
  return {
    object_id: registry?.object_id ?? `obj_${input.nodeId}`,
    parent_profile_id: PROFILE,
    object_type: "game_node",
    public_label: registry?.label ?? input.nodeId,
    public_state: "Live",
    status: "active",
    child_object_document_json: childDocument(input),
    created_at: "2026-06-01T12:00:00.000Z",
    updated_at: "2026-06-01T12:05:00.000Z",
  };
}

function cabinetAndWitnessChildren(witnessActiveFor: string[]) {
  const cabinet = gameChild({
    nodeId: "node_07",
    role: "lore_archive",
    district: "czech_village",
    meta: { vouch_requires: ["node_10"], unlocked_by: ["node_04"], fragment_id: "czech_1" },
  });
  const witness = gameChild({
    nodeId: "node_10",
    role: "witness",
    district: "downtown",
    meta: { vouch_active_for: witnessActiveFor, scarcity_remaining: 25 },
  });
  return { cabinet, witness, children: [cabinet, witness] };
}

function scanAndBoard(input: {
  cabinet: ChildObjectRow;
  witness: ChildObjectRow;
  children: ChildObjectRow[];
}) {
  const witnessMetaByNodeId = buildWitnessMetaByNodeId(input.children, CR_SEASON_01);
  const composed = composeChildObjectScanState({
    child: input.cabinet,
    season: CR_SEASON_01,
    env: ENV,
    now: NOW,
    vouchWitnesses: {
      node_10: baseMeta({ vouch_active_for: witnessMetaByNodeId.node_10?.vouch_active_for ?? [] }),
    },
  });
  const snap = deriveMapNodeSnapshot({
    child: input.cabinet,
    season: CR_SEASON_01,
    env: ENV,
    now: NOW,
    witnessMetaByNodeId,
  });
  const chips = snap
    ? buildMapNodeChips(snap, resolveSeasonWindowPhase(NOW, CR_SEASON_01))
    : [];
  return { composed, snap, chips, witnessMetaByNodeId };
}

describe("witness gate parity (scan + board + fog)", () => {
  it("scan pending witness gate when witness has not vouched target", () => {
    const { cabinet, witness, children } = cabinetAndWitnessChildren([]);
    const { composed } = scanAndBoard({ cabinet, witness, children });

    expect(composed.gameNode?.vouchGate?.met).toBe(false);
    expect(composed.gameNode?.vouchGate?.pending).toEqual(["node_10"]);
  });

  it("scan live witness gate when witness lists target in vouch_active_for", () => {
    const { cabinet, witness, children } = cabinetAndWitnessChildren(["node_07"]);
    const { composed } = scanAndBoard({ cabinet, witness, children });

    expect(composed.gameNode?.vouchGate?.met).toBe(true);
    expect(composed.gameNode?.vouchGate?.satisfied).toEqual(["node_10"]);
  });

  it("board snapshot pending matches scan vouch gate", () => {
    const { cabinet, witness, children } = cabinetAndWitnessChildren([]);
    const { composed, snap, chips } = scanAndBoard({ cabinet, witness, children });

    expect(snap?.vouch_gate).toEqual(composed.gameNode?.vouchGate);
    const vouchChip = chips.find((c) => c.label === "Vouch");
    expect(vouchChip?.value).toBe("Sealed · needs node_10");
    expect(mapVouchChipValue(snap!.game_meta, snap!.vouch_gate)).toBe(vouchChip?.value);
  });

  it("board snapshot live matches scan vouch gate", () => {
    const { cabinet, witness, children } = cabinetAndWitnessChildren(["node_07"]);
    const { composed, snap, chips } = scanAndBoard({ cabinet, witness, children });

    expect(snap?.vouch_gate?.met).toBe(true);
    expect(snap?.vouch_gate).toEqual(composed.gameNode?.vouchGate);
    const vouchChip = chips.find((c) => c.label === "Vouch");
    expect(vouchChip?.value).toBe("Path open");
  });

  it("fog lore visibility uses same gate result as scan (non-cooperative role)", () => {
    const witnessMetaByNodeId = buildWitnessMetaByNodeId(
      [gameChild({ nodeId: "node_10", role: "witness", district: "downtown", meta: { vouch_active_for: [] } })],
      CR_SEASON_01
    );
    const gate = resolveWitnessGate({
      targetNodeId: "node_gated",
      gameMeta: baseMeta({ unlocked_by: ["node_04"], vouch_requires: ["node_10"] }),
      witnessMetaByNodeId,
    });
    expect(gate?.met).toBe(false);
    expect(lorePathUnlocked(baseMeta({ unlocked_by: ["node_04"], vouch_requires: ["node_10"] }), gate)).toBe(
      false
    );

    const liveMeta = buildWitnessMetaByNodeId(
      [
        gameChild({
          nodeId: "node_10",
          role: "witness",
          district: "downtown",
          meta: { vouch_active_for: ["node_gated"] },
        }),
      ],
      CR_SEASON_01
    );
    const liveGate = resolveWitnessGate({
      targetNodeId: "node_gated",
      gameMeta: baseMeta({ unlocked_by: ["node_04"], vouch_requires: ["node_10"] }),
      witnessMetaByNodeId: liveMeta,
    });
    expect(liveGate?.met).toBe(true);
    expect(lorePathUnlocked(baseMeta({ unlocked_by: ["node_04"], vouch_requires: ["node_10"] }), liveGate)).toBe(
      true
    );

    const now = new Date("2026-06-07T18:00:00-05:00");
    const pendingRow = {
      node_id: "node_gated",
      label: "Gated lore",
      district: "newbo",
      role: "custom_lore",
      lifecycle: "active" as const,
      map_mode: "game" as const,
      public_state: "Hidden path",
      game_meta: baseMeta({ unlocked_by: ["node_04"], vouch_requires: ["node_10"] }),
      route_open: null,
      active_bulletin: null,
      active_route: null,
      vouch_gate: gate,
    };
    expect(
      nodeVisibleOnMapBoard({
        row: pendingRow,
        season: CR_SEASON_01,
        rumored: new Set(),
        now,
      })
    ).toBe(false);

    expect(
      nodeVisibleOnMapBoard({
        row: { ...pendingRow, vouch_gate: liveGate },
        season: CR_SEASON_01,
        rumored: new Set(),
        now,
      })
    ).toBe(true);
  });

  it("missing witness in index keeps gate pending", () => {
    const gate = resolveWitnessGate({
      targetNodeId: "node_07",
      gameMeta: baseMeta({ vouch_requires: ["node_10"] }),
      witnessMetaByNodeId: {},
    });
    expect(gate?.met).toBe(false);
    expect(gate?.pending).toEqual(["node_10"]);
    expect(mapVouchChipValue(baseMeta({ vouch_requires: ["node_10"] }), gate)).toBe(
      "Sealed · needs node_10"
    );
  });

  it("depleted witness scarcity still satisfies gate when vouch_active_for lists target", () => {
    const gate = resolveWitnessGate({
      targetNodeId: "node_07",
      gameMeta: baseMeta({ vouch_requires: ["node_10"] }),
      witnessMetaByNodeId: {
        node_10: baseMeta({ vouch_active_for: ["node_07"], scarcity_remaining: 0 }),
      },
    });
    expect(gate?.met).toBe(true);
  });
});
