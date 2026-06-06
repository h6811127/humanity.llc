import { describe, expect, it } from "vitest";

import type { GameMeta } from "../src/city-game/game-meta";
import {
  buildMapNodeChips,
  deriveMapNodeSnapshot,
} from "../src/city-game/map-node-snapshot";
import { CR_SEASON_01 } from "../src/city-game/season-config";
import { resolveSeasonWindowPhase } from "../src/city-game/season-window";
import type { ChildObjectRow } from "../src/db/types";
import { composeChildObjectScanState } from "../src/live-object/compose-child-object-scan";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const ENV = { CITY_GAME_ENABLED: "1" };

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
  careValue?: string;
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
        value: input.careValue ?? "Clear",
      },
    ],
  });
}

function gameChild(input: {
  nodeId: string;
  role: string;
  district: string;
  careValue?: string;
  meta?: Partial<GameMeta>;
  status?: ChildObjectRow["status"];
  publicState?: string;
}): ChildObjectRow {
  const registry = CR_SEASON_01.nodes.find((n) => n.node_id === input.nodeId);
  return {
    object_id: registry?.object_id ?? `obj_${input.nodeId}`,
    parent_profile_id: PROFILE,
    object_type: "game_node",
    public_label: registry?.label ?? input.nodeId,
    public_state: input.publicState ?? "Relay readable",
    status: input.status ?? "active",
    child_object_document_json: childDocument({
      nodeId: input.nodeId,
      role: input.role,
      district: input.district,
      careValue: input.careValue,
      meta: input.meta,
    }),
    created_at: "2026-06-01T12:00:00.000Z",
    updated_at: "2026-06-01T12:05:00.000Z",
  };
}

function boardParity(input: {
  child: ChildObjectRow;
  now: Date;
}) {
  const composed = composeChildObjectScanState({
    child: input.child,
    season: CR_SEASON_01,
    env: ENV,
    now: input.now,
  });
  const snap = deriveMapNodeSnapshot({
    child: input.child,
    season: CR_SEASON_01,
    env: ENV,
    now: input.now,
  });
  const windowPhase = resolveSeasonWindowPhase(input.now, CR_SEASON_01);
  const chips = snap ? buildMapNodeChips(snap, windowPhase) : [];
  return { composed, snap, chips, windowPhase };
}

/** Active lifecycle: board must mirror scan compose headline + game mode. */
function expectActiveComposeParity(
  composed: ReturnType<typeof composeChildObjectScanState>,
  snap: NonNullable<ReturnType<typeof deriveMapNodeSnapshot>>
) {
  expect(snap.lifecycle).toBe("active");
  expect(snap.public_state).toBe(composed.publicState);
  expect(snap.map_mode).toBe(composed.gameNode?.mode);
}

describe("board-node scan parity contract", () => {
  it("active + season open: public_state and map_mode match compose; no maintenance-only chips", () => {
    const now = new Date("2026-06-07T00:00:00-05:00");
    const { composed, snap, chips } = boardParity({
      child: gameChild({
        nodeId: "node_01",
        role: "relay_gate",
        district: "newbo",
        careValue: "Clear",
      }),
      now,
    });

    expect(snap).not.toBeNull();
    expectActiveComposeParity(composed, snap!);
    expect(composed.gameNode?.mode).toBe("game");
    expect(composed.streamPolicy?.phase).toBe("game_scheduled");
    expect(snap!.active_bulletin).not.toBeNull();
    expect(chips[0]?.kind).not.toBe("maintenance");
    expect(chips.some((c) => c.kind === "maintenance")).toBe(false);
  });

  it("care_pause: public_state and map_mode match compose; board shows maintenance chip only", () => {
    const now = new Date("2026-06-07T12:00:00-05:00");
    const careValue = "Closed for maintenance";
    const { composed, snap, chips } = boardParity({
      child: gameChild({
        nodeId: "node_01",
        role: "relay_gate",
        district: "newbo",
        careValue,
        publicState: "Trail closed for maintenance",
      }),
      now,
    });

    expect(snap).not.toBeNull();
    expectActiveComposeParity(composed, snap!);
    expect(composed.gameNode?.mode).toBe("care_pause");
    expect(composed.streamPolicy?.phase).toBe("care_pause");
    expect(snap!.active_bulletin).toBeNull();
    expect(snap!.active_route).toBeNull();
    expect(snap!.route_open).toBeNull();
    expect(chips).toEqual([
      { kind: "maintenance", label: "Care", value: "Trail closed for maintenance" },
    ]);
  });

  it("revoked lifecycle: board uses terminal revoked chips without compose drift on mode", () => {
    const now = new Date("2026-06-07T00:00:00-05:00");
    const child = gameChild({
      nodeId: "node_01",
      role: "relay_gate",
      district: "newbo",
      status: "revoked",
      publicState: "Revoked on network",
    });
    const composed = composeChildObjectScanState({
      child,
      season: CR_SEASON_01,
      env: ENV,
      now,
    });
    const snap = deriveMapNodeSnapshot({
      child,
      season: CR_SEASON_01,
      env: ENV,
      now,
    });
    const chips = buildMapNodeChips(snap!, resolveSeasonWindowPhase(now, CR_SEASON_01));

    expect(snap?.lifecycle).toBe("revoked");
    expect(snap?.map_mode).toBe("revoked");
    expect(snap?.public_state).toBe("Revoked on network");
    expect(composed.gameNode?.mode).toBe("game");
    expect(chips).toEqual([{ kind: "revoked", label: "Status", value: "Revoked" }]);
  });

  it("dormant pre-window: public_state and map_mode match compose dormant mode", () => {
    const now = new Date("2026-06-01T12:00:00-05:00");
    const { composed, snap, chips } = boardParity({
      child: gameChild({
        nodeId: "node_01",
        role: "relay_gate",
        district: "newbo",
        careValue: "Clear",
      }),
      now,
    });

    expect(snap).not.toBeNull();
    expectActiveComposeParity(composed, snap!);
    expect(composed.gameNode?.mode).toBe("dormant");
    expect(composed.streamPolicy?.phase).toBe("game_muted");
    expect(chips.some((c) => c.kind === "drop" && c.value === "Dormant")).toBe(true);
    expect(chips.some((c) => c.kind === "maintenance")).toBe(false);
  });
});
