-- M5.5.3  -  optional recovery public key on card (revoke when device key lost)
ALTER TABLE cards ADD COLUMN recovery_public_key TEXT;

CREATE INDEX idx_cards_recovery_public_key ON cards (recovery_public_key)
  WHERE recovery_public_key IS NOT NULL;
