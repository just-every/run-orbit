-- One durable activity can have successive provider booking identities.
CREATE TABLE booking_activity_ids (
 source_id TEXT NOT NULL REFERENCES signal_sources(id) ON DELETE CASCADE,
 provider TEXT NOT NULL CHECK(provider IN ('calcom','calendly')),
 provider_id TEXT NOT NULL,
 timeline_id TEXT NOT NULL REFERENCES timeline_entries(id) ON DELETE CASCADE,
 PRIMARY KEY(source_id,provider,provider_id)
);
CREATE INDEX booking_activity_timeline ON booking_activity_ids(timeline_id);
