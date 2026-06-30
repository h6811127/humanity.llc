import type {
  RelationshipEdgeDocument,
  ScanRelationshipStatus,
} from "./relationship-edge-spec";
import { buildScanWitnessRelationships } from "./scan-object-graph";

/** @deprecated Use buildScanWitnessRelationships — incoming-only helper for tests. */
export function buildWitnessRelationshipStatuses(
  edges: RelationshipEdgeDocument[],
  gate: import("../city-game/vouch-graph").GameVouchGate | null
): ScanRelationshipStatus[] {
  return buildScanWitnessRelationships({
    scannedObjectId: "",
    incomingEdges: edges,
    outgoingEdges: [],
    incomingGate: gate,
    scannerGameMeta: null,
    peerLabels: {},
  });
}
