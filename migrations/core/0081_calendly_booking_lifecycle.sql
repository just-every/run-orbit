-- Verified receipts retain their original signals; only the activity projection changes.
CREATE TABLE booking_lifecycle (
 signal_id TEXT PRIMARY KEY NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
 activity_id TEXT NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
 source_id TEXT NOT NULL REFERENCES signal_sources(id) ON DELETE CASCADE,
 invitee_uri TEXT NOT NULL,
 previous_invitee_uri TEXT,
 next_invitee_uri TEXT,
 event_json TEXT NOT NULL,
 current_json TEXT
);
CREATE INDEX booking_lifecycle_identity ON booking_lifecycle(source_id,invitee_uri);
CREATE INDEX booking_lifecycle_previous ON booking_lifecycle(source_id,previous_invitee_uri);
CREATE INDEX booking_lifecycle_next ON booking_lifecycle(source_id,next_invitee_uri);
CREATE INDEX booking_lifecycle_activity ON booking_lifecycle(activity_id);
