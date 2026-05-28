-- M6 Step 3: vouch revocation replay protection + signed revoke record.

ALTER TABLE vouches ADD COLUMN revoke_nonce TEXT;
ALTER TABLE vouches ADD COLUMN revoke_signed_document_json TEXT;

CREATE UNIQUE INDEX idx_vouches_revoke_nonce
  ON vouches (revoke_nonce)
  WHERE revoke_nonce IS NOT NULL;
