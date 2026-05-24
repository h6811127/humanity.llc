-- Organizer / coalition revoke key (Phase A vertical #3)
ALTER TABLE cards ADD COLUMN issuer_public_key TEXT;

CREATE INDEX idx_cards_issuer_public_key ON cards (issuer_public_key)
  WHERE issuer_public_key IS NOT NULL;
