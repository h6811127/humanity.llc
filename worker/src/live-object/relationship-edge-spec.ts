/**
 * RelationshipEdge v1 — witnesses + unlocks kinds.
 * @see docs/HUMANITY_OBJECT_MODEL_V1.md §10 Relationships
 */

export const RELATIONSHIP_EDGE_SPEC_VERSION = "1.0" as const;
export const RELATIONSHIP_EDGE_KIND_WITNESSES = "witnesses" as const;
export const RELATIONSHIP_EDGE_KIND_UNLOCKS = "unlocks" as const;

export const RELATIONSHIP_EDGE_KINDS = [
  RELATIONSHIP_EDGE_KIND_WITNESSES,
  RELATIONSHIP_EDGE_KIND_UNLOCKS,
] as const;

export type RelationshipEdgeKind = (typeof RELATIONSHIP_EDGE_KINDS)[number];

export const RELATIONSHIP_EDGE_ID_REGEX = /^edge_[A-Za-z0-9_-]{4,76}$/;

/** Cedar Rapids witness gate — library → cabinet (GT-4 / SF-3). */
export const CR_WITNESS_EDGE_ID = "edge_cr_witness_10_07";
export const CR_WITNESS_FROM_OBJECT_ID = "obj_cr_node_10_library";
export const CR_WITNESS_TO_OBJECT_ID = "obj_cr_node_07_cabinet";
export const CR_WITNESS_NETWORK_ID = "cr_season_01_wake";
export const CR_WITNESS_EDGE_LABEL =
  "Library witness vouch opens cabinet path";
export const CR_WITNESS_FROM_NODE_ID = "node_10";
export const CR_WITNESS_TO_NODE_ID = "node_07";

/** Cedar Rapids quorum unlock — river → cabinet (OG-2). */
export const CR_UNLOCK_EDGE_ID = "edge_cr_unlock_04_07";
export const CR_UNLOCK_FROM_OBJECT_ID = "obj_cr_node_04_river";
export const CR_UNLOCK_TO_OBJECT_ID = "obj_cr_node_07_cabinet";
export const CR_UNLOCK_NETWORK_ID = "cr_season_01_wake";
export const CR_UNLOCK_EDGE_LABEL =
  "River Lantern unlocks Czech Village cabinet";
export const CR_UNLOCK_FROM_NODE_ID = "node_04";
export const CR_UNLOCK_TO_NODE_ID = "node_07";

export type RelationshipEdgeObjectRef = {
  ref: "object_id";
  id: string;
};

export type RelationshipEdgePathRef = {
  from_node_id: string;
  to_node_id: string;
};

/** @deprecated Use RelationshipEdgePathRef */
export type RelationshipEdgeWitnessRef = RelationshipEdgePathRef;

export type RelationshipEdgeUnlockRef = RelationshipEdgePathRef;

export type RelationshipEdgeWitnessDocument = {
  version: typeof RELATIONSHIP_EDGE_SPEC_VERSION;
  type: "relationship_edge";
  edge_id: string;
  kind: typeof RELATIONSHIP_EDGE_KIND_WITNESSES;
  network_id: string;
  steward_profile_id: string;
  from: RelationshipEdgeObjectRef;
  to: RelationshipEdgeObjectRef;
  label: string;
  witness: RelationshipEdgePathRef;
  status: "active" | "revoked";
  created_at: string;
  signature?: Record<string, unknown>;
};

export type RelationshipEdgeUnlockDocument = {
  version: typeof RELATIONSHIP_EDGE_SPEC_VERSION;
  type: "relationship_edge";
  edge_id: string;
  kind: typeof RELATIONSHIP_EDGE_KIND_UNLOCKS;
  network_id: string;
  steward_profile_id: string;
  from: RelationshipEdgeObjectRef;
  to: RelationshipEdgeObjectRef;
  label: string;
  unlock: RelationshipEdgePathRef;
  status: "active" | "revoked";
  created_at: string;
  signature?: Record<string, unknown>;
};

export type RelationshipEdgeDocument =
  | RelationshipEdgeWitnessDocument
  | RelationshipEdgeUnlockDocument;

export type ScanRelationshipDirection = "incoming" | "outgoing";

/** Stranger-facing role on the scanned object page (WS-OBJECT-GRAPH-V1). */
export type ScanRelationshipRole = "required_by" | "unlocks";

export type ScanRelationshipStatus = {
  edge_id: string;
  kind: RelationshipEdgeKind;
  network_id: string;
  from_object_id: string;
  to_object_id: string;
  from_node_id: string;
  to_node_id: string;
  label: string;
  status: "active" | "revoked";
  satisfied: boolean;
  pending_node_ids: string[];
  satisfied_node_ids: string[];
  /** Relative to the scanned object. */
  direction: ScanRelationshipDirection;
  /** Incoming = waiting on witness/unlock; outgoing = enables another object. */
  role: ScanRelationshipRole;
  /** Verified RelationshipEdge document in D1. */
  rule_source: "signed_edge";
  /** Other endpoint object on this edge (not the scanned object). */
  peer_object_id: string;
  peer_public_label: string | null;
};

export type ScanRelationshipRules = {
  signed: true;
  steward_profile_id: string;
  network_id: string;
  edge_count: number;
};

function readRequiredString(
  obj: Record<string, unknown>,
  field: string,
  max: number
): string | null {
  const value = obj[field];
  if (typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim();
  if (trimmed.length > max) return null;
  return trimmed;
}

function readObjectRef(
  obj: Record<string, unknown>,
  field: string
): RelationshipEdgeObjectRef | null {
  const raw = obj[field];
  if (!raw || typeof raw !== "object") return null;
  const refObj = raw as Record<string, unknown>;
  if (refObj.ref !== "object_id") return null;
  const id = readRequiredString(refObj, "id", 80);
  if (!id) return null;
  return { ref: "object_id", id };
}

function readPathRef(
  obj: Record<string, unknown>,
  field: string
): RelationshipEdgePathRef | null {
  const raw = obj[field];
  if (!raw || typeof raw !== "object") return null;
  const path = raw as Record<string, unknown>;
  const fromNodeId = readRequiredString(path, "from_node_id", 40);
  const toNodeId = readRequiredString(path, "to_node_id", 40);
  if (!fromNodeId || !toNodeId) return null;
  return { from_node_id: fromNodeId, to_node_id: toNodeId };
}

export function relationshipEdgePath(
  edge: RelationshipEdgeDocument
): RelationshipEdgePathRef {
  return edge.kind === RELATIONSHIP_EDGE_KIND_WITNESSES
    ? edge.witness
    : edge.unlock;
}

export function isWitnessRelationshipEdge(
  edge: RelationshipEdgeDocument
): edge is RelationshipEdgeWitnessDocument {
  return edge.kind === RELATIONSHIP_EDGE_KIND_WITNESSES;
}

export function isUnlockRelationshipEdge(
  edge: RelationshipEdgeDocument
): edge is RelationshipEdgeUnlockDocument {
  return edge.kind === RELATIONSHIP_EDGE_KIND_UNLOCKS;
}

export function validateRelationshipEdgeShape(
  doc: unknown
): { ok: true } | { ok: false; issues: string[] } {
  if (!doc || typeof doc !== "object") {
    return { ok: false, issues: ["document must be an object."] };
  }
  const obj = doc as Record<string, unknown>;
  const issues: string[] = [];

  if (obj.version !== RELATIONSHIP_EDGE_SPEC_VERSION) {
    issues.push(`version must be "${RELATIONSHIP_EDGE_SPEC_VERSION}".`);
  }
  if (obj.type !== "relationship_edge") {
    issues.push('type must be "relationship_edge".');
  }

  const edgeId = readRequiredString(obj, "edge_id", 80);
  if (!edgeId || !RELATIONSHIP_EDGE_ID_REGEX.test(edgeId)) {
    issues.push("edge_id must match edge_* pattern.");
  }

  const kind = obj.kind;
  if (
    kind !== RELATIONSHIP_EDGE_KIND_WITNESSES &&
    kind !== RELATIONSHIP_EDGE_KIND_UNLOCKS
  ) {
    issues.push(
      `kind must be "${RELATIONSHIP_EDGE_KIND_WITNESSES}" or "${RELATIONSHIP_EDGE_KIND_UNLOCKS}".`
    );
  }

  const networkId = readRequiredString(obj, "network_id", 80);
  if (!networkId) issues.push("network_id is required.");

  const stewardProfileId = readRequiredString(obj, "steward_profile_id", 40);
  if (!stewardProfileId) issues.push("steward_profile_id is required.");

  const from = readObjectRef(obj, "from");
  const to = readObjectRef(obj, "to");
  if (!from) issues.push("from must be { ref: object_id, id }.");
  if (!to) issues.push("to must be { ref: object_id, id }.");

  const label = readRequiredString(obj, "label", 200);
  if (!label) issues.push("label is required.");

  if (kind === RELATIONSHIP_EDGE_KIND_WITNESSES) {
    const witness = readPathRef(obj, "witness");
    if (!witness) {
      issues.push("witness.from_node_id and witness.to_node_id are required.");
    }
  } else if (kind === RELATIONSHIP_EDGE_KIND_UNLOCKS) {
    const unlock = readPathRef(obj, "unlock");
    if (!unlock) {
      issues.push("unlock.from_node_id and unlock.to_node_id are required.");
    }
  }

  const status = obj.status;
  if (status !== "active" && status !== "revoked") {
    issues.push('status must be "active" or "revoked".');
  }

  const createdAt = readRequiredString(obj, "created_at", 40);
  if (!createdAt) issues.push("created_at is required.");

  return issues.length === 0 ? { ok: true } : { ok: false, issues };
}

export function crWitnessEdgeDocumentUnsigned(
  stewardProfileId: string,
  overrides: Partial<
    Omit<RelationshipEdgeWitnessDocument, "version" | "type" | "signature">
  > = {}
): Omit<RelationshipEdgeWitnessDocument, "signature"> {
  return {
    version: RELATIONSHIP_EDGE_SPEC_VERSION,
    type: "relationship_edge",
    edge_id: CR_WITNESS_EDGE_ID,
    kind: RELATIONSHIP_EDGE_KIND_WITNESSES,
    network_id: CR_WITNESS_NETWORK_ID,
    steward_profile_id: stewardProfileId,
    from: { ref: "object_id", id: CR_WITNESS_FROM_OBJECT_ID },
    to: { ref: "object_id", id: CR_WITNESS_TO_OBJECT_ID },
    label: CR_WITNESS_EDGE_LABEL,
    witness: {
      from_node_id: CR_WITNESS_FROM_NODE_ID,
      to_node_id: CR_WITNESS_TO_NODE_ID,
    },
    status: "active",
    created_at: "2026-06-22T00:00:00.000Z",
    ...overrides,
  };
}

export function crUnlockEdgeDocumentUnsigned(
  stewardProfileId: string,
  overrides: Partial<
    Omit<RelationshipEdgeUnlockDocument, "version" | "type" | "signature">
  > = {}
): Omit<RelationshipEdgeUnlockDocument, "signature"> {
  return {
    version: RELATIONSHIP_EDGE_SPEC_VERSION,
    type: "relationship_edge",
    edge_id: CR_UNLOCK_EDGE_ID,
    kind: RELATIONSHIP_EDGE_KIND_UNLOCKS,
    network_id: CR_UNLOCK_NETWORK_ID,
    steward_profile_id: stewardProfileId,
    from: { ref: "object_id", id: CR_UNLOCK_FROM_OBJECT_ID },
    to: { ref: "object_id", id: CR_UNLOCK_TO_OBJECT_ID },
    label: CR_UNLOCK_EDGE_LABEL,
    unlock: {
      from_node_id: CR_UNLOCK_FROM_NODE_ID,
      to_node_id: CR_UNLOCK_TO_NODE_ID,
    },
    status: "active",
    created_at: "2026-06-23T00:00:00.000Z",
    ...overrides,
  };
}
