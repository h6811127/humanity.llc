import { describe, expect, it } from "vitest";

import type { GameMeta } from "../src/city-game/game-meta";
import { buildWitnessRelationshipStatuses } from "../src/live-object/relationship-edge-evaluator";
import { resolveWitnessGate } from "../src/city-game/witness-gate";
import {
  crWitnessEdgeDocumentUnsigned,
  type RelationshipEdgeDocument,
} from "../src/live-object/relationship-edge-spec";

const STEWARD = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";

function witnessMeta(vouchActiveFor: string[]): GameMeta {
  return {
    visible_until: null,
    compromised: false,
    collective_progress: null,
    collective_target: null,
    unlocked_by: [],
    vouch_requires: [],
    vouch_active_for: vouchActiveFor,
    scarcity_remaining: null,
    fragment_id: null,
  };
}

function cabinetMeta(): GameMeta {
  return {
    visible_until: null,
    compromised: false,
    collective_progress: null,
    collective_target: null,
    unlocked_by: ["node_04"],
    vouch_requires: ["node_10"],
    vouch_active_for: [],
    scarcity_remaining: null,
    fragment_id: "czech_1",
  };
}

function crEdge(
  overrides: Partial<Omit<RelationshipEdgeDocument, "signature">> = {}
): RelationshipEdgeDocument {
  return {
    ...crWitnessEdgeDocumentUnsigned(STEWARD),
    ...overrides,
  };
}

describe("relationship-edge-evaluator", () => {
  it("evaluates witness edge pending and live via vouch_active_for", () => {
    const edges = [crEdge()];
    const pending = resolveWitnessGate({
      targetNodeId: "node_07",
      gameMeta: cabinetMeta(),
      witnessMetaByNodeId: { node_10: witnessMeta([]) },
      witnessRelationshipEdges: edges,
    });
    expect(pending?.met).toBe(false);
    expect(pending?.pending).toEqual(["node_10"]);

    const live = resolveWitnessGate({
      targetNodeId: "node_07",
      gameMeta: cabinetMeta(),
      witnessMetaByNodeId: { node_10: witnessMeta(["node_07"]) },
      witnessRelationshipEdges: edges,
    });
    expect(live?.met).toBe(true);
    expect(live?.satisfied).toEqual(["node_10"]);
  });

  it("prefers signed edges over legacy vouch_requires when edges present", () => {
    const gate = resolveWitnessGate({
      targetNodeId: "node_07",
      gameMeta: { ...cabinetMeta(), vouch_requires: [] },
      witnessMetaByNodeId: { node_10: witnessMeta(["node_07"]) },
      witnessRelationshipEdges: [crEdge()],
    });
    expect(gate?.met).toBe(true);
  });

  it("falls back to legacy vouch_requires when no edges", () => {
    const gate = resolveWitnessGate({
      targetNodeId: "node_07",
      gameMeta: cabinetMeta(),
      witnessMetaByNodeId: { node_10: witnessMeta([]) },
      witnessRelationshipEdges: null,
    });
    expect(gate?.met).toBe(false);
    expect(gate?.required).toEqual(["node_10"]);
  });

  it("builds relationship status rows with satisfied/pending node ids", () => {
    const gate = resolveWitnessGate({
      targetNodeId: "node_07",
      gameMeta: cabinetMeta(),
      witnessMetaByNodeId: { node_10: witnessMeta([]) },
      witnessRelationshipEdges: [crEdge()],
    });
    const statuses = buildWitnessRelationshipStatuses([crEdge()], gate);
    expect(statuses).toHaveLength(1);
    expect(statuses[0]).toMatchObject({
      edge_id: "edge_cr_witness_10_07",
      satisfied: false,
      direction: "incoming",
      role: "required_by",
      rule_source: "signed_edge",
      pending_node_ids: ["node_10"],
      satisfied_node_ids: [],
    });

    const liveGate = resolveWitnessGate({
      targetNodeId: "node_07",
      gameMeta: cabinetMeta(),
      witnessMetaByNodeId: { node_10: witnessMeta(["node_07"]) },
      witnessRelationshipEdges: [crEdge()],
    });
    const liveStatuses = buildWitnessRelationshipStatuses([crEdge()], liveGate);
    expect(liveStatuses[0]).toMatchObject({
      satisfied: true,
      pending_node_ids: [],
      satisfied_node_ids: ["node_10"],
    });
  });
});
