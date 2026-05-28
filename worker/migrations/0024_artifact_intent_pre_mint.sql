-- Pre-checkout owner-signed print_artifact credentials for post-payment auto-mint.
-- See docs/MERCH_HEADLESS_COMMERCE.md § End-to-end flow (Tier 1 personalized).

PRAGMA foreign_keys = ON;

ALTER TABLE artifact_intents ADD COLUMN pending_mint_credentials_json TEXT;
