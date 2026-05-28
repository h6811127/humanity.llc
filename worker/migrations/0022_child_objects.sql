-- Parent-signed child objects under a root Humanity Card.
-- See docs/ROOT_CARD_AND_CHILD_OBJECTS.md and Technical Standards §7A.

CREATE TABLE IF NOT EXISTS child_objects (
  object_id TEXT PRIMARY KEY NOT NULL
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
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_child_objects_parent_profile
  ON child_objects (parent_profile_id, status);
CREATE INDEX IF NOT EXISTS idx_child_objects_type
  ON child_objects (object_type);

