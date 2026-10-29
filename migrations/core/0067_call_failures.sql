-- Retain submission custody and every historical value, owner column and object.
-- A documented creation refusal is a separate terminal outcome, never inferred
-- for an older uncertain attempt.
ALTER TABLE call_dial_attempts ADD COLUMN creation_outcome TEXT CHECK(creation_outcome IS NULL OR creation_outcome='failed');
ALTER TABLE call_dial_attempts ADD COLUMN provider_error_code INTEGER;
