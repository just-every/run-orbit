-- Zendesk credentials remain installation-local. Portable links carry no authority.
CREATE TABLE support_installation (
 id INTEGER PRIMARY KEY CHECK(id=1), subdomain TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN('connected','paused')), generation TEXT NOT NULL,
 checked_at TEXT NOT NULL, error TEXT
);
CREATE TABLE support_credentials (id INTEGER PRIMARY KEY CHECK(id=1), ciphertext TEXT NOT NULL);
CREATE TABLE support_mappings (
 company_id TEXT PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
 organization_id TEXT NOT NULL UNIQUE, organization_name TEXT NOT NULL,
 subdomain TEXT NOT NULL, generation TEXT, reviewed_by TEXT NOT NULL,
 reviewed_at TEXT NOT NULL
);
CREATE TABLE support_tickets (
 company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 ticket_id TEXT NOT NULL, subdomain TEXT NOT NULL,
 PRIMARY KEY(company_id,ticket_id,subdomain)
);
CREATE TABLE support_handoffs (
 id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
 contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL, subdomain TEXT NOT NULL,
 organization_id TEXT NOT NULL, generation TEXT NOT NULL, review_hash TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN('submitting','created','failed','uncertain','redacted')),
 ticket_id TEXT, actor_id TEXT NOT NULL, created_at TEXT NOT NULL,
 outcome_at TEXT, timeline_id TEXT
);
CREATE UNIQUE INDEX support_handoff_ticket ON support_handoffs(subdomain,ticket_id) WHERE ticket_id IS NOT NULL;
CREATE TABLE support_webhooks (digest TEXT PRIMARY KEY, received_at TEXT NOT NULL);
CREATE TRIGGER support_contact_erasure BEFORE DELETE ON contacts BEGIN
 DELETE FROM timeline_entries WHERE id IN(SELECT timeline_id FROM support_handoffs WHERE contact_id=OLD.id);
 DELETE FROM support_tickets WHERE (subdomain,ticket_id) IN(SELECT subdomain,ticket_id FROM support_handoffs WHERE contact_id=OLD.id);
 UPDATE support_handoffs SET company_id=NULL,contact_id=NULL,review_hash='',state='redacted',timeline_id=NULL WHERE contact_id=OLD.id;
END;
CREATE TRIGGER support_company_erasure BEFORE DELETE ON companies BEGIN
 UPDATE support_handoffs SET company_id=NULL,contact_id=NULL,review_hash='',state='redacted' WHERE company_id=OLD.id;
END;
