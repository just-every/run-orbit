-- Provider authority stays installation-local. Portable rows are billing evidence only.
CREATE TABLE billing_connection (
 id TEXT PRIMARY KEY CHECK(id='stripe'), connected_at TEXT NOT NULL,
 checked_at TEXT NOT NULL, last_event_at TEXT, disconnected_at TEXT
);
CREATE TABLE billing_credentials (
 id TEXT PRIMARY KEY CHECK(id='stripe'), sealed TEXT NOT NULL
);
CREATE TABLE billing_mappings (
 customer_id TEXT PRIMARY KEY, customer_hash TEXT NOT NULL,
 company_id TEXT NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
 opportunity_id TEXT NOT NULL UNIQUE REFERENCES opportunities(id) ON DELETE CASCADE,
 contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
 name TEXT NOT NULL, email TEXT NOT NULL, domain TEXT NOT NULL,
 reviewed_at TEXT NOT NULL, reviewed_by TEXT NOT NULL REFERENCES operators(id)
);
CREATE TABLE billing_events (
 id TEXT PRIMARY KEY, customer_id TEXT NOT NULL, customer_hash TEXT NOT NULL,
 object_id TEXT NOT NULL, event_type TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN('paid','past-due','refunded','voided')),
 currency TEXT NOT NULL CHECK(currency='USD'), amount_cents INTEGER NOT NULL CHECK(amount_cents>=0),
 occurred_at TEXT NOT NULL, source_created INTEGER NOT NULL, received_at TEXT NOT NULL
);
CREATE INDEX billing_events_customer ON billing_events(customer_id,source_created);
CREATE TABLE billing_erased_customers (customer_hash TEXT PRIMARY KEY, erased_at TEXT NOT NULL);

CREATE TRIGGER billing_contact_erased BEFORE DELETE ON contacts
WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN
 INSERT OR IGNORE INTO billing_erased_customers SELECT customer_hash,strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM billing_mappings WHERE contact_id=OLD.id;
 DELETE FROM billing_events WHERE customer_id IN(SELECT customer_id FROM billing_mappings WHERE contact_id=OLD.id);
END;
CREATE TRIGGER billing_company_erased BEFORE DELETE ON companies
WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN
 INSERT OR IGNORE INTO billing_erased_customers SELECT customer_hash,strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM billing_mappings WHERE company_id=OLD.id;
 DELETE FROM billing_events WHERE customer_id IN(SELECT customer_id FROM billing_mappings WHERE company_id=OLD.id);
END;
CREATE TRIGGER billing_opportunity_erased BEFORE DELETE ON opportunities
WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN
 INSERT OR IGNORE INTO billing_erased_customers SELECT customer_hash,strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM billing_mappings WHERE opportunity_id=OLD.id;
 DELETE FROM billing_events WHERE customer_id IN(SELECT customer_id FROM billing_mappings WHERE opportunity_id=OLD.id);
END;
