import { describe, expect, it } from "vitest";

import {
  CR_UNLOCK_EDGE_ID,
  CR_UNLOCK_EDGE_LABEL,
  CR_UNLOCK_FROM_NODE_ID,
  CR_UNLOCK_FROM_OBJECT_ID,
  CR_UNLOCK_NETWORK_ID,
  CR_UNLOCK_TO_NODE_ID,
  CR_UNLOCK_TO_OBJECT_ID,
  CR_WITNESS_EDGE_ID,
  CR_WITNESS_EDGE_LABEL,
  CR_WITNESS_FROM_NODE_ID,
  CR_WITNESS_FROM_OBJECT_ID,
  CR_WITNESS_NETWORK_ID,
  CR_WITNESS_TO_NODE_ID,
  CR_WITNESS_TO_OBJECT_ID,
  crUnlockEdgeDocumentUnsigned,
  crWitnessEdgeDocumentUnsigned,
  validateRelationshipEdgeShape,
} from "../src/live-object/relationship-edge-spec";

const STEWARD = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";

describe("relationship-edge-spec", () => {
  it("validates CR witness edge shape", () => {
    const doc = crWitnessEdgeDocumentUnsigned(STEWARD);
    expect(validateRelationshipEdgeShape(doc)).toEqual({ ok: true });
    expect(doc.edge_id).toBe(CR_WITNESS_EDGE_ID);
    expect(doc.from.id).toBe(CR_WITNESS_FROM_OBJECT_ID);
    expect(doc.to.id).toBe(CR_WITNESS_TO_OBJECT_ID);
    expect(doc.network_id).toBe(CR_WITNESS_NETWORK_ID);
    expect(doc.label).toBe(CR_WITNESS_EDGE_LABEL);
    expect(doc.witness.from_node_id).toBe(CR_WITNESS_FROM_NODE_ID);
    expect(doc.witness.to_node_id).toBe(CR_WITNESS_TO_NODE_ID);
  });

  it("validates CR unlock edge shape", () => {
    const doc = crUnlockEdgeDocumentUnsigned(STEWARD);
    expect(validateRelationshipEdgeShape(doc)).toEqual({ ok: true });
    expect(doc.edge_id).toBe(CR_UNLOCK_EDGE_ID);
    expect(doc.from.id).toBe(CR_UNLOCK_FROM_OBJECT_ID);
    expect(doc.to.id).toBe(CR_UNLOCK_TO_OBJECT_ID);
    expect(doc.network_id).toBe(CR_UNLOCK_NETWORK_ID);
    expect(doc.label).toBe(CR_UNLOCK_EDGE_LABEL);
    expect(doc.unlock.from_node_id).toBe(CR_UNLOCK_FROM_NODE_ID);
    expect(doc.unlock.to_node_id).toBe(CR_UNLOCK_TO_NODE_ID);
  });

  it("rejects unknown kind", () => {
    const doc = {
      ...crWitnessEdgeDocumentUnsigned(STEWARD),
      kind: "federation",
    };
    expect(validateRelationshipEdgeShape(doc).ok).toBe(false);
  });
});
