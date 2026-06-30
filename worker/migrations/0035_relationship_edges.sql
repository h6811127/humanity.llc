-- Signed relationship edges (RelationshipEdge v1 — witnesses + unlocks kinds).
-- See worker/src/live-object/relationship-edge-spec.ts

CREATE TABLE IF NOT EXISTS relationship_edges (
  edge_id TEXT PRIMARY KEY NOT NULL
    CHECK (length(edge_id) >= 8 AND length(edge_id) <= 80),
  network_id TEXT NOT NULL
    CHECK (length(network_id) >= 3 AND length(network_id) <= 80),
  kind TEXT NOT NULL
    CHECK (kind IN ('witnesses', 'unlocks')),
  from_object_id TEXT NOT NULL
    CHECK (length(from_object_id) >= 8 AND length(from_object_id) <= 80),
  to_object_id TEXT NOT NULL
    CHECK (length(to_object_id) >= 8 AND length(to_object_id) <= 80),
  steward_profile_id TEXT NOT NULL REFERENCES cards (profile_id),
  status TEXT NOT NULL
    CHECK (status IN ('active', 'revoked')),
  edge_document_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_relationship_edges_to_active
  ON relationship_edges (to_object_id, network_id, status);

CREATE INDEX IF NOT EXISTS idx_relationship_edges_network
  ON relationship_edges (network_id, kind, status);
