-- Artifact intents for personalized merch (SF-002 / A-001 metadata spike).
-- Stores planned item QR ids only; credentials mint after Shopify paid webhook.

PRAGMA foreign_keys = ON;

CREATE TABLE artifact_intents (
  artifact_intent_id TEXT PRIMARY KEY NOT NULL
    CHECK (artifact_intent_id GLOB 'ai_*'),
  profile_id TEXT NOT NULL REFERENCES cards (profile_id),
  source_qr_id TEXT NOT NULL,
  product_id TEXT,
  quantity INTEGER NOT NULL CHECK (quantity >= 1 AND quantity <= 10),
  planned_item_qr_ids_json TEXT NOT NULL,
  planned_print_artifact_ids_json TEXT NOT NULL,
  status TEXT NOT NULL
    CHECK (status IN (
      'draft',
      'proofed',
      'attached_to_cart',
      'expired',
      'converted',
      'blocked'
    )),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_artifact_intents_profile ON artifact_intents (profile_id);
CREATE INDEX idx_artifact_intents_status ON artifact_intents (status);
CREATE INDEX idx_artifact_intents_expires ON artifact_intents (expires_at);
