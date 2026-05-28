-- M4.7: optional scan display preferences on owner revocation.
ALTER TABLE revocations ADD COLUMN display_mode TEXT;
ALTER TABLE revocations ADD COLUMN public_reason TEXT;
