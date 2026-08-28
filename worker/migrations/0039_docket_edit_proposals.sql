-- WS-DOCKET DG-store-v0 — signed dual-gate edit proposals (per case).
-- Never writes published case JSON; human-gated merge remains required.
-- @see docs/PUBLIC_DOCKET_AND_ACCOUNTABILITY_VERTICAL.md § Dual-gate steward edits

CREATE TABLE IF NOT EXISTS docket_edit_proposal_stores (
  case_id TEXT PRIMARY KEY NOT NULL
    CHECK (length(case_id) >= 2 AND length(case_id) <= 64),
  proposals_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_docket_edit_proposal_stores_updated
  ON docket_edit_proposal_stores (updated_at);
