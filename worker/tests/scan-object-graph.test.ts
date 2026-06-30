import { describe, expect, it } from "vitest";

import type { GameMeta } from "../src/city-game/game-meta";
import {
  buildScanWitnessRelationships,
  firstPendingIncomingLabel,
  firstPendingIncomingPeer,
  hasSignedUnlockIncomingRelationships,
  hasSignedWitnessIncomingRelationships,
  incomingWitnessRelationships,
  outgoingWitnessRelationships,
  scanRelationshipRulesFromEdges,
} from "../src/live-object/scan-object-graph";
import {
  CR_UNLOCK_EDGE_LABEL,
  CR_WITNESS_EDGE_LABEL,
  crUnlockEdgeDocumentUnsigned,
  crWitnessEdgeDocumentUnsigned,
} from "../src/live-object/relationship-edge-spec";

const STEWARD = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const CABINET = "obj_cr_node_07_cabinet";
const LIBRARY = "obj_cr_node_10_library";
const RIVER = "obj_cr_node_04_river";

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

describe("scan-object-graph", () => {
  const edge = crWitnessEdgeDocumentUnsigned(STEWARD);

  it("builds incoming required_by and outgoing unlocks rows", () => {
    const incomingGate = {
      required: ["node_10"],
      satisfied: [],
      pending: ["node_10"],
      met: false,
    };
    const cabinetRows = buildScanWitnessRelationships({
      scannedObjectId: CABINET,
      incomingEdges: [edge],
      outgoingEdges: [],
      incomingGate,
      scannerGameMeta: null,
      peerLabels: { [LIBRARY]: "Library witness" },
    });
    expect(cabinetRows).toHaveLength(1);
    expect(cabinetRows[0]).toMatchObject({
      direction: "incoming",
      role: "required_by",
      satisfied: false,
      peer_object_id: LIBRARY,
      peer_public_label: "Library witness",
      label: CR_WITNESS_EDGE_LABEL,
      rule_source: "signed_edge",
    });

    const libraryRows = buildScanWitnessRelationships({
      scannedObjectId: LIBRARY,
      incomingEdges: [],
      outgoingEdges: [edge],
      incomingGate: null,
      scannerGameMeta: witnessMeta(["node_07"]),
      peerLabels: { [CABINET]: "Czech Village cabinet" },
    });
    expect(libraryRows).toHaveLength(1);
    expect(libraryRows[0]).toMatchObject({
      direction: "outgoing",
      role: "unlocks",
      satisfied: true,
      peer_object_id: CABINET,
      peer_public_label: "Czech Village cabinet",
    });
  });

  it("filters incoming and outgoing witness rows", () => {
    const rows = buildScanWitnessRelationships({
      scannedObjectId: CABINET,
      incomingEdges: [edge],
      outgoingEdges: [edge],
      incomingGate: {
        required: ["node_10"],
        satisfied: [],
        pending: ["node_10"],
        met: false,
      },
      scannerGameMeta: witnessMeta([]),
      peerLabels: {},
    });
    expect(incomingWitnessRelationships(rows)).toHaveLength(1);
    expect(outgoingWitnessRelationships(rows)).toHaveLength(1);
  });

  it("returns pending incoming label for hero note", () => {
    const rows = buildScanWitnessRelationships({
      scannedObjectId: CABINET,
      incomingEdges: [edge],
      outgoingEdges: [],
      incomingGate: {
        required: ["node_10"],
        satisfied: [],
        pending: ["node_10"],
        met: false,
      },
      scannerGameMeta: null,
      peerLabels: {},
    });
    expect(firstPendingIncomingLabel(rows)).toBe(CR_WITNESS_EDGE_LABEL);
    expect(firstPendingIncomingPeer(rows)).toBe("obj_cr_node_10_library");
  });

  it("builds signed relationship rules from edge docs", () => {
    const rules = scanRelationshipRulesFromEdges([edge], 1);
    expect(rules).toEqual({
      signed: true,
      steward_profile_id: STEWARD,
      network_id: "cr_season_01_wake",
      edge_count: 1,
    });
  });

  it("builds incoming unlock required_by and outgoing unlock rows (OG-2)", () => {
    const unlockEdge = crUnlockEdgeDocumentUnsigned(STEWARD);
    const cabinetPending = buildScanWitnessRelationships({
      scannedObjectId: CABINET,
      incomingEdges: [unlockEdge],
      outgoingEdges: [],
      incomingGate: null,
      scannerGameMeta: {
        ...witnessMeta([]),
        unlocked_by: [],
      },
      peerLabels: { [RIVER]: "Riverwalk River Lantern" },
    });
    expect(cabinetPending).toHaveLength(1);
    expect(cabinetPending[0]).toMatchObject({
      kind: "unlocks",
      direction: "incoming",
      role: "required_by",
      satisfied: false,
      peer_object_id: RIVER,
      label: CR_UNLOCK_EDGE_LABEL,
    });

    const cabinetLive = buildScanWitnessRelationships({
      scannedObjectId: CABINET,
      incomingEdges: [unlockEdge],
      outgoingEdges: [],
      incomingGate: null,
      scannerGameMeta: {
        ...witnessMeta([]),
        unlocked_by: ["node_04"],
      },
      peerLabels: { [RIVER]: "Riverwalk River Lantern" },
    });
    expect(cabinetLive[0]?.satisfied).toBe(true);

    const riverOutgoing = buildScanWitnessRelationships({
      scannedObjectId: RIVER,
      incomingEdges: [],
      outgoingEdges: [unlockEdge],
      incomingGate: null,
      scannerGameMeta: witnessMeta([]),
      peerLabels: { [CABINET]: "Czech Village cabinet" },
      peerGameMetaByObjectId: {
        [CABINET]: { ...witnessMeta([]), unlocked_by: ["node_04"] },
      },
    });
    expect(riverOutgoing[0]).toMatchObject({
      kind: "unlocks",
      direction: "outgoing",
      role: "unlocks",
      satisfied: true,
      peer_object_id: CABINET,
    });
  });

  it("detects signed unlock incoming for chip suppression", () => {
    const unlockEdge = crUnlockEdgeDocumentUnsigned(STEWARD);
    const rows = buildScanWitnessRelationships({
      scannedObjectId: CABINET,
      incomingEdges: [unlockEdge],
      outgoingEdges: [],
      incomingGate: null,
      scannerGameMeta: witnessMeta([]),
      peerLabels: {},
    });
    expect(hasSignedUnlockIncomingRelationships(rows)).toBe(true);
    expect(hasSignedWitnessIncomingRelationships(rows)).toBe(false);
  });

  it("composes witness + unlock incoming rows on one scan (OG-2 multi-edge)", () => {
    const witnessEdge = crWitnessEdgeDocumentUnsigned(STEWARD);
    const unlockEdge = crUnlockEdgeDocumentUnsigned(STEWARD);
    const rows = buildScanWitnessRelationships({
      scannedObjectId: CABINET,
      incomingEdges: [witnessEdge, unlockEdge],
      outgoingEdges: [],
      incomingGate: {
        required: ["node_10"],
        satisfied: [],
        pending: ["node_10"],
        met: false,
      },
      scannerGameMeta: {
        ...witnessMeta([]),
        unlocked_by: [],
      },
      peerLabels: {
        [LIBRARY]: "Library witness",
        [RIVER]: "Riverwalk River Lantern",
      },
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      kind: "witnesses",
      direction: "incoming",
      role: "required_by",
      satisfied: false,
    });
    expect(rows[1]).toMatchObject({
      kind: "unlocks",
      direction: "incoming",
      role: "required_by",
      satisfied: false,
    });
    expect(hasSignedWitnessIncomingRelationships(rows)).toBe(true);
    expect(hasSignedUnlockIncomingRelationships(rows)).toBe(true);
    expect(firstPendingIncomingPeer(rows)).toBe("Library witness");
  });
});
