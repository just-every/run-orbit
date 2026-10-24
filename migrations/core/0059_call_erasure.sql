-- Retain only a digest so delayed provider events cannot restore an erased phone.
CREATE TABLE call_erased_numbers (phone_hash TEXT PRIMARY KEY NOT NULL);
