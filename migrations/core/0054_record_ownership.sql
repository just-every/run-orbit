-- RECORD-016: independent responsibility, never a new native-record column.
-- The withdrawn 0042 remains untouched, including its applied historical bytes.
CREATE TABLE record_ownership (
 record_type TEXT NOT NULL CHECK(record_type IN('contact','company')),
 record_id TEXT NOT NULL,
 owner_id TEXT REFERENCES operators(id) ON DELETE SET NULL,
 revision INTEGER NOT NULL CHECK(revision>0),
 updated_at TEXT NOT NULL,
 PRIMARY KEY(record_type,record_id)
);
CREATE INDEX record_ownership_owner ON record_ownership(owner_id,record_type);
-- Batch headers are identity-free customer audit and survive record erasure.
CREATE TABLE ownership_batches (
 id TEXT PRIMARY KEY,
 record_type TEXT NOT NULL CHECK(record_type IN('contact','company')),
 owner_id TEXT REFERENCES operators(id) ON DELETE SET NULL,
 actor_id TEXT REFERENCES operators(id) ON DELETE SET NULL,
 state TEXT NOT NULL CHECK(state IN('reviewed','applied','undone','held')),
 item_count INTEGER NOT NULL,
 created_at TEXT NOT NULL,
 applied_at TEXT,
 undone_at TEXT
);
CREATE TABLE ownership_batch_items (
 batch_id TEXT NOT NULL REFERENCES ownership_batches(id) ON DELETE CASCADE,
 ordinal INTEGER NOT NULL,
 record_id TEXT NOT NULL,
 record_name TEXT NOT NULL,
 previous_owner_id TEXT REFERENCES operators(id) ON DELETE SET NULL,
 previous_owner_name TEXT,
 new_owner_name TEXT,
 reviewed_revision INTEGER NOT NULL,
 reviewed_record_revision INTEGER NOT NULL,
 reviewed_updated_at TEXT,
 applied_revision INTEGER,
 failure TEXT,
 applied INTEGER NOT NULL DEFAULT 0,
 undone INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(batch_id,record_id)
);
CREATE TABLE record_ownership_history (
 id TEXT PRIMARY KEY,
 record_type TEXT NOT NULL CHECK(record_type IN('contact','company')),
 record_id TEXT NOT NULL,
 previous_owner_id TEXT REFERENCES operators(id) ON DELETE SET NULL,
 owner_id TEXT REFERENCES operators(id) ON DELETE SET NULL,
 actor_id TEXT REFERENCES operators(id) ON DELETE SET NULL,
 batch_id TEXT REFERENCES ownership_batches(id) ON DELETE SET NULL,
 action TEXT NOT NULL CHECK(action IN('assigned','undone')),
 revision INTEGER NOT NULL,
 occurred_at TEXT NOT NULL
);
CREATE INDEX record_ownership_history_record ON record_ownership_history(record_type,record_id,revision);
-- Durable, portable reconciliation receipts prevent old native columns reviving
-- after an unassignment or a restore. Copying is schema-checked by legacy.ts.
CREATE TABLE ownership_reconciliations (source TEXT PRIMARY KEY, completed_at TEXT NOT NULL);
CREATE TRIGGER ownership_erase_contact BEFORE DELETE ON contacts BEGIN
 DELETE FROM notifications WHERE event_key IN(SELECT 'ownership:'||batch_id FROM ownership_batch_items WHERE record_id=OLD.id AND batch_id IN(SELECT id FROM ownership_batches WHERE record_type='contact'));
 DELETE FROM record_ownership WHERE record_type='contact' AND record_id=OLD.id;
 DELETE FROM record_ownership_history WHERE record_type='contact' AND record_id=OLD.id;
 UPDATE ownership_batch_items SET record_id='erased:'||ordinal,record_name='Unavailable record',previous_owner_id=NULL,previous_owner_name=NULL,new_owner_name=NULL,reviewed_updated_at=NULL,failure='No permission or record unavailable',applied=0,undone=0 WHERE record_id=OLD.id AND batch_id IN(SELECT id FROM ownership_batches WHERE record_type='contact');
 DELETE FROM timeline_entries WHERE kind='owner.changed' AND id IN(SELECT timeline_entry_id FROM timeline_entry_records WHERE record_type='contact' AND record_id=OLD.id);
END;
CREATE TRIGGER ownership_erase_company BEFORE DELETE ON companies BEGIN
 DELETE FROM notifications WHERE event_key IN(SELECT 'ownership:'||batch_id FROM ownership_batch_items WHERE record_id=OLD.id AND batch_id IN(SELECT id FROM ownership_batches WHERE record_type='company'));
 DELETE FROM record_ownership WHERE record_type='company' AND record_id=OLD.id;
 DELETE FROM record_ownership_history WHERE record_type='company' AND record_id=OLD.id;
 UPDATE ownership_batch_items SET record_id='erased:'||ordinal,record_name='Unavailable record',previous_owner_id=NULL,previous_owner_name=NULL,new_owner_name=NULL,reviewed_updated_at=NULL,failure='No permission or record unavailable',applied=0,undone=0 WHERE record_id=OLD.id AND batch_id IN(SELECT id FROM ownership_batches WHERE record_type='company');
 DELETE FROM timeline_entries WHERE kind='owner.changed' AND id IN(SELECT timeline_entry_id FROM timeline_entry_records WHERE record_type='company' AND record_id=OLD.id);
END;
