-- Child object IDs are stable within a root card, not global.
-- Public/deterministic catalog IDs (obj_cr_node_*, obj_<season>_node_*) must not
-- let one steward permanently block another steward's create (OBJECT_EXISTS 409).

CREATE TABLE child_objects_v0038 (
  object_id TEXT NOT NULL
    CHECK (length(object_id) >= 8 AND length(object_id) <= 80),
  parent_profile_id TEXT NOT NULL REFERENCES cards (profile_id),
  object_type TEXT NOT NULL
    CHECK (length(object_type) >= 1 AND length(object_type) <= 40),
  public_label TEXT NOT NULL
    CHECK (length(public_label) >= 1 AND length(public_label) <= 120),
  public_state TEXT NOT NULL
    CHECK (length(public_state) >= 1 AND length(public_state) <= 280),
  status TEXT NOT NULL
    CHECK (status IN ('active', 'disabled', 'revoked', 'replaced')),
  child_object_document_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (parent_profile_id, object_id)
);

INSERT INTO child_objects_v0038 (
  object_id, parent_profile_id, object_type, public_label, public_state,
  status, child_object_document_json, created_at, updated_at
)
SELECT
  object_id, parent_profile_id, object_type, public_label, public_state,
  status, child_object_document_json, created_at, updated_at
FROM child_objects;

DROP TABLE child_objects;

ALTER TABLE child_objects_v0038 RENAME TO child_objects;

CREATE INDEX IF NOT EXISTS idx_child_objects_parent_profile
  ON child_objects (parent_profile_id, status);
CREATE INDEX IF NOT EXISTS idx_child_objects_type
  ON child_objects (object_type);
CREATE INDEX IF NOT EXISTS idx_child_objects_object_id
  ON child_objects (object_id);
