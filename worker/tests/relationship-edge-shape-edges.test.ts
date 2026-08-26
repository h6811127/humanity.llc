import { describe, expect, it } from "vitest";

import {
  RELATIONSHIP_EDGE_KIND_UNLOCKS,
  RELATIONSHIP_EDGE_KIND_WITNESSES,
  crUnlockEdgeDocumentUnsigned,
  crWitnessEdgeDocumentUnsigned,
  isUnlockRelationshipEdge,
  isWitnessRelationshipEdge,
  relationshipEdgePath,
  validateRelationshipEdgeShape,
} from "../src/live-object/relationship-edge-spec";

const STEWARD = "7Xk9mP2nQ4rT6xW8yZ1aB3cD5";

function issuesOf(doc: unknown): string[] {
  const result = validateRelationshipEdgeShape(doc);
  return result.ok ? [] : result.issues;
}

describe("validateRelationshipEdgeShape edges", () => {
  it("rejects non-objects", () => {
    expect(validateRelationshipEdgeShape(null)).toEqual({
      ok: false,
      issues: ["document must be an object."],
    });
    expect(validateRelationshipEdgeShape("edge")).toEqual({
      ok: false,
      issues: ["document must be an object."],
    });
  });

  it("rejects version, type, kind, and status mismatches", () => {
    const base = crWitnessEdgeDocumentUnsigned(STEWARD);
    expect(issuesOf({ ...base, version: "0.9" })).toContain(
      'version must be "1.0".'
    );
    expect(issuesOf({ ...base, type: "child_object" })).toContain(
      'type must be "relationship_edge".'
    );
    expect(issuesOf({ ...base, kind: "federation" })).toContain(
      'kind must be "witnesses" or "unlocks".'
    );
    expect(issuesOf({ ...base, status: "pending" })).toContain(
      'status must be "active" or "revoked".'
    );
  });

  it("enforces edge_id pattern length and prefix", () => {
    const base = crWitnessEdgeDocumentUnsigned(STEWARD);
    expect(issuesOf({ ...base, edge_id: "edge_abc" })).toContain(
      "edge_id must match edge_* pattern."
    );
    expect(issuesOf({ ...base, edge_id: "id_abcd" })).toContain(
      "edge_id must match edge_* pattern."
    );
    expect(issuesOf({ ...base, edge_id: `edge_${"a".repeat(77)}` })).toContain(
      "edge_id must match edge_* pattern."
    );
    expect(validateRelationshipEdgeShape({ ...base, edge_id: "edge_abcd" }).ok).toBe(
      true
    );
  });

  it("rejects blank or oversized required strings", () => {
    const base = crWitnessEdgeDocumentUnsigned(STEWARD);
    expect(issuesOf({ ...base, network_id: "   " })).toContain(
      "network_id is required."
    );
    expect(issuesOf({ ...base, steward_profile_id: "" })).toContain(
      "steward_profile_id is required."
    );
    expect(issuesOf({ ...base, label: "x".repeat(201) })).toContain(
      "label is required."
    );
    expect(issuesOf({ ...base, created_at: "  " })).toContain(
      "created_at is required."
    );
  });

  it("requires object_id refs and kind-specific path blocks", () => {
    const witness = crWitnessEdgeDocumentUnsigned(STEWARD);
    expect(issuesOf({ ...witness, from: { ref: "profile_id", id: "obj_a" } })).toContain(
      "from must be { ref: object_id, id }."
    );
    expect(issuesOf({ ...witness, to: { ref: "object_id", id: "" } })).toContain(
      "to must be { ref: object_id, id }."
    );
    expect(issuesOf({ ...witness, witness: { from_node_id: "node_10" } })).toContain(
      "witness.from_node_id and witness.to_node_id are required."
    );

    const unlock = crUnlockEdgeDocumentUnsigned(STEWARD);
    expect(issuesOf({ ...unlock, unlock: null })).toContain(
      "unlock.from_node_id and unlock.to_node_id are required."
    );
  });
});

describe("relationship edge kind helpers", () => {
  it("routes path and type guards from kind", () => {
    const witness = crWitnessEdgeDocumentUnsigned(STEWARD);
    const unlock = crUnlockEdgeDocumentUnsigned(STEWARD);

    expect(isWitnessRelationshipEdge(witness)).toBe(true);
    expect(isUnlockRelationshipEdge(witness)).toBe(false);
    expect(relationshipEdgePath(witness)).toEqual(witness.witness);

    expect(isUnlockRelationshipEdge(unlock)).toBe(true);
    expect(isWitnessRelationshipEdge(unlock)).toBe(false);
    expect(relationshipEdgePath(unlock)).toEqual(unlock.unlock);

    expect(RELATIONSHIP_EDGE_KIND_WITNESSES).toBe("witnesses");
    expect(RELATIONSHIP_EDGE_KIND_UNLOCKS).toBe("unlocks");
  });
});
