import type { GameMeta } from "../city-game/game-meta";
import type { GameVouchGate } from "../city-game/vouch-graph";
import { witnessVouchesForNode } from "../city-game/vouch-graph";
import type {
  RelationshipEdgeDocument,
  ScanRelationshipRules,
  ScanRelationshipStatus,
} from "./relationship-edge-spec";
import {
  RELATIONSHIP_EDGE_KIND_UNLOCKS,
  RELATIONSHIP_EDGE_KIND_WITNESSES,
  isUnlockRelationshipEdge,
  isWitnessRelationshipEdge,
  relationshipEdgePath,
} from "./relationship-edge-spec";

export type BuildScanWitnessRelationshipsInput = {
  scannedObjectId: string;
  incomingEdges: RelationshipEdgeDocument[];
  outgoingEdges: RelationshipEdgeDocument[];
  incomingGate: GameVouchGate | null;
  scannerGameMeta: GameMeta | null;
  peerLabels: Record<string, string>;
  /** Target object game_meta for outgoing unlock satisfaction (object_id → meta). */
  peerGameMetaByObjectId?: Record<string, GameMeta>;
};

function unlockPathSatisfied(
  fromNodeId: string,
  targetMeta: GameMeta | null | undefined
): boolean {
  if (!targetMeta) return false;
  return targetMeta.unlocked_by.includes(fromNodeId);
}

function relationshipEdgeRow(
  edge: RelationshipEdgeDocument,
  input: {
    direction: ScanRelationshipStatus["direction"];
    role: ScanRelationshipStatus["role"];
    satisfied: boolean;
    pendingNodeIds: string[];
    satisfiedNodeIds: string[];
    peerObjectId: string;
    peerLabels: Record<string, string>;
  }
): ScanRelationshipStatus {
  const path = relationshipEdgePath(edge);
  return {
    edge_id: edge.edge_id,
    kind: edge.kind,
    network_id: edge.network_id,
    from_object_id: edge.from.id,
    to_object_id: edge.to.id,
    from_node_id: path.from_node_id,
    to_node_id: path.to_node_id,
    label: edge.label,
    status: edge.status,
    satisfied: input.satisfied,
    pending_node_ids: input.pendingNodeIds,
    satisfied_node_ids: input.satisfiedNodeIds,
    direction: input.direction,
    role: input.role,
    rule_source: "signed_edge",
    peer_object_id: input.peerObjectId,
    peer_public_label: input.peerLabels[input.peerObjectId]?.trim() || null,
  };
}

function buildIncomingWitnessRows(
  edges: RelationshipEdgeDocument[],
  gate: GameVouchGate | null,
  peerLabels: Record<string, string>
): ScanRelationshipStatus[] {
  if (!gate) return [];
  const satisfiedSet = new Set(gate.satisfied);
  const pendingSet = new Set(gate.pending);

  return edges
    .filter(
      (edge) => isWitnessRelationshipEdge(edge) && edge.status === "active"
    )
    .map((edge) => {
      const witnessNodeId = edge.witness.from_node_id;
      const satisfied = satisfiedSet.has(witnessNodeId);
      return relationshipEdgeRow(edge, {
        direction: "incoming",
        role: "required_by",
        satisfied,
        pendingNodeIds:
          satisfied || !pendingSet.has(witnessNodeId) ? [] : [witnessNodeId],
        satisfiedNodeIds: satisfied ? [witnessNodeId] : [],
        peerObjectId: edge.from.id,
        peerLabels,
      });
    });
}

function buildIncomingUnlockRows(
  edges: RelationshipEdgeDocument[],
  scannerGameMeta: GameMeta | null,
  peerLabels: Record<string, string>
): ScanRelationshipStatus[] {
  return edges
    .filter(
      (edge) => isUnlockRelationshipEdge(edge) && edge.status === "active"
    )
    .map((edge) => {
      const fromNodeId = edge.unlock.from_node_id;
      const satisfied = unlockPathSatisfied(fromNodeId, scannerGameMeta);
      return relationshipEdgeRow(edge, {
        direction: "incoming",
        role: "required_by",
        satisfied,
        pendingNodeIds: satisfied ? [] : [fromNodeId],
        satisfiedNodeIds: satisfied ? [fromNodeId] : [],
        peerObjectId: edge.from.id,
        peerLabels,
      });
    });
}

function buildOutgoingWitnessRows(
  edges: RelationshipEdgeDocument[],
  scannerGameMeta: GameMeta | null,
  peerLabels: Record<string, string>
): ScanRelationshipStatus[] {
  return edges
    .filter(
      (edge) => isWitnessRelationshipEdge(edge) && edge.status === "active"
    )
    .map((edge) => {
      const targetNodeId = edge.witness.to_node_id;
      const satisfied =
        scannerGameMeta != null &&
        witnessVouchesForNode(scannerGameMeta, targetNodeId);
      return relationshipEdgeRow(edge, {
        direction: "outgoing",
        role: "unlocks",
        satisfied,
        pendingNodeIds: satisfied ? [] : [targetNodeId],
        satisfiedNodeIds: satisfied ? [targetNodeId] : [],
        peerObjectId: edge.to.id,
        peerLabels,
      });
    });
}

function buildOutgoingUnlockRows(
  edges: RelationshipEdgeDocument[],
  peerGameMetaByObjectId: Record<string, GameMeta>,
  peerLabels: Record<string, string>
): ScanRelationshipStatus[] {
  return edges
    .filter(
      (edge) => isUnlockRelationshipEdge(edge) && edge.status === "active"
    )
    .map((edge) => {
      const fromNodeId = edge.unlock.from_node_id;
      const targetMeta = peerGameMetaByObjectId[edge.to.id];
      const satisfied = unlockPathSatisfied(fromNodeId, targetMeta);
      return relationshipEdgeRow(edge, {
        direction: "outgoing",
        role: "unlocks",
        satisfied,
        pendingNodeIds: satisfied ? [] : [fromNodeId],
        satisfiedNodeIds: satisfied ? [fromNodeId] : [],
        peerObjectId: edge.to.id,
        peerLabels,
      });
    });
}

/** Compose incoming + outgoing signed edges for scan HTML and status JSON. */
export function buildScanWitnessRelationships(
  input: BuildScanWitnessRelationshipsInput
): ScanRelationshipStatus[] {
  const peerGameMeta = input.peerGameMetaByObjectId ?? {};
  const incoming = [
    ...buildIncomingWitnessRows(
      input.incomingEdges,
      input.incomingGate,
      input.peerLabels
    ),
    ...buildIncomingUnlockRows(
      input.incomingEdges,
      input.scannerGameMeta,
      input.peerLabels
    ),
  ];
  const outgoing = [
    ...buildOutgoingWitnessRows(
      input.outgoingEdges,
      input.scannerGameMeta,
      input.peerLabels
    ),
    ...buildOutgoingUnlockRows(
      input.outgoingEdges,
      peerGameMeta,
      input.peerLabels
    ),
  ];
  return [...incoming, ...outgoing];
}

export function scanRelationshipRulesFromEdges(
  edges: RelationshipEdgeDocument[],
  relationshipCount: number
): ScanRelationshipRules | null {
  if (!edges.length || relationshipCount === 0) return null;
  const stewardProfileId = edges[0]?.steward_profile_id?.trim();
  const networkId = edges[0]?.network_id?.trim();
  if (!stewardProfileId || !networkId) return null;
  return {
    signed: true,
    steward_profile_id: stewardProfileId,
    network_id: networkId,
    edge_count: relationshipCount,
  };
}

export function firstPendingIncomingLabel(
  relationships: ScanRelationshipStatus[]
): string | null {
  const pending = relationships.find(
    (row) => row.direction === "incoming" && row.role === "required_by" && !row.satisfied
  );
  return pending?.label?.trim() || null;
}

export function firstPendingIncomingPeer(
  relationships: ScanRelationshipStatus[]
): string | null {
  const pending = relationships.find(
    (row) => row.direction === "incoming" && row.role === "required_by" && !row.satisfied
  );
  if (!pending) return null;
  return pending.peer_public_label?.trim() || pending.peer_object_id;
}

export function incomingWitnessRelationships(
  relationships: ScanRelationshipStatus[]
): ScanRelationshipStatus[] {
  return relationships.filter(
    (row) => row.direction === "incoming" && row.role === "required_by"
  );
}

export function outgoingWitnessRelationships(
  relationships: ScanRelationshipStatus[]
): ScanRelationshipStatus[] {
  return relationships.filter(
    (row) => row.direction === "outgoing" && row.role === "unlocks"
  );
}

export function hasSignedUnlockIncomingRelationships(
  relationships: ScanRelationshipStatus[]
): boolean {
  return relationships.some(
    (row) =>
      row.kind === RELATIONSHIP_EDGE_KIND_UNLOCKS &&
      row.direction === "incoming" &&
      row.role === "required_by"
  );
}

export function hasSignedWitnessIncomingRelationships(
  relationships: ScanRelationshipStatus[]
): boolean {
  return relationships.some(
    (row) =>
      row.kind === RELATIONSHIP_EDGE_KIND_WITNESSES &&
      row.direction === "incoming" &&
      row.role === "required_by"
  );
}
