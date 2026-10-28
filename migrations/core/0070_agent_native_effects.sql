-- Actor custody exists only inside the same batch as native effects. No session
-- or credential is created. Triggers keep native history honest for each writer.
CREATE TABLE orbit_agent_context (
 id INTEGER PRIMARY KEY CHECK(id=1), actor TEXT NOT NULL, principal TEXT NOT NULL, tool TEXT NOT NULL
);
CREATE TABLE orbit_native_attribution (
 table_name TEXT NOT NULL, id TEXT NOT NULL, actor TEXT NOT NULL,
 PRIMARY KEY(table_name,id)
);
CREATE TRIGGER orbit_agent_timeline AFTER INSERT ON timeline_entries
WHEN EXISTS(SELECT 1 FROM orbit_agent_context)
BEGIN
 INSERT INTO orbit_native_attribution SELECT 'timeline_entries',NEW.id,actor FROM orbit_agent_context;
END;
CREATE TRIGGER orbit_agent_audit AFTER INSERT ON audit_entries
WHEN EXISTS(SELECT 1 FROM orbit_agent_context)
BEGIN
 INSERT INTO orbit_native_attribution SELECT 'audit_entries',NEW.id,actor FROM orbit_agent_context;
END;
CREATE TABLE orbit_agent_work (
 message_id TEXT PRIMARY KEY, principal TEXT NOT NULL, actor TEXT NOT NULL, tool TEXT NOT NULL
);
CREATE TRIGGER orbit_agent_outbound AFTER INSERT ON outbound_messages
WHEN EXISTS(SELECT 1 FROM orbit_agent_context)
BEGIN
 INSERT INTO orbit_agent_work SELECT NEW.id,principal,actor,tool FROM orbit_agent_context;
END;
CREATE TABLE orbit_native_changes (
 sequence INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE,
 type TEXT NOT NULL, uri TEXT NOT NULL, actor TEXT, sponsor TEXT, at TEXT NOT NULL
);
CREATE TRIGGER orbit_change_contacts_insert AFTER INSERT ON contacts BEGIN
 INSERT INTO orbit_native_changes(id,type,uri,actor,sponsor,at) VALUES(lower(hex(randomblob(16))),'contacts.changed','orbit://records/contact/'||NEW.id,(SELECT actor FROM orbit_agent_context),(SELECT json_extract(principal,'$.person.id') FROM orbit_agent_context),strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER orbit_change_contacts_update AFTER UPDATE ON contacts BEGIN
 INSERT INTO orbit_native_changes(id,type,uri,actor,sponsor,at) VALUES(lower(hex(randomblob(16))),'contacts.changed','orbit://records/contact/'||NEW.id,(SELECT actor FROM orbit_agent_context),(SELECT json_extract(principal,'$.person.id') FROM orbit_agent_context),strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER orbit_change_companies_insert AFTER INSERT ON companies BEGIN
 INSERT INTO orbit_native_changes(id,type,uri,actor,sponsor,at) VALUES(lower(hex(randomblob(16))),'companies.changed','orbit://records/company/'||NEW.id,(SELECT actor FROM orbit_agent_context),(SELECT json_extract(principal,'$.person.id') FROM orbit_agent_context),strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER orbit_change_companies_update AFTER UPDATE ON companies BEGIN
 INSERT INTO orbit_native_changes(id,type,uri,actor,sponsor,at) VALUES(lower(hex(randomblob(16))),'companies.changed','orbit://records/company/'||NEW.id,(SELECT actor FROM orbit_agent_context),(SELECT json_extract(principal,'$.person.id') FROM orbit_agent_context),strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER orbit_change_opportunities_insert AFTER INSERT ON opportunities BEGIN
 INSERT INTO orbit_native_changes(id,type,uri,actor,sponsor,at) VALUES(lower(hex(randomblob(16))),'opportunities.changed','orbit://records/opportunity/'||NEW.id,(SELECT actor FROM orbit_agent_context),(SELECT json_extract(principal,'$.person.id') FROM orbit_agent_context),strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER orbit_change_opportunities_update AFTER UPDATE ON opportunities BEGIN
 INSERT INTO orbit_native_changes(id,type,uri,actor,sponsor,at) VALUES(lower(hex(randomblob(16))),'opportunities.changed','orbit://records/opportunity/'||NEW.id,(SELECT actor FROM orbit_agent_context),(SELECT json_extract(principal,'$.person.id') FROM orbit_agent_context),strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER orbit_change_handoff_tasks_insert AFTER INSERT ON handoff_tasks BEGIN
 INSERT INTO orbit_native_changes(id,type,uri,actor,sponsor,at) VALUES(lower(hex(randomblob(16))),'handoff_tasks.changed','orbit://operations/'||NEW.id,(SELECT actor FROM orbit_agent_context),(SELECT json_extract(principal,'$.person.id') FROM orbit_agent_context),strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER orbit_change_handoff_tasks_update AFTER UPDATE ON handoff_tasks BEGIN
 INSERT INTO orbit_native_changes(id,type,uri,actor,sponsor,at) VALUES(lower(hex(randomblob(16))),'handoff_tasks.changed','orbit://operations/'||NEW.id,(SELECT actor FROM orbit_agent_context),(SELECT json_extract(principal,'$.person.id') FROM orbit_agent_context),strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER orbit_change_drafts_insert AFTER INSERT ON drafts BEGIN
 INSERT INTO orbit_native_changes(id,type,uri,actor,sponsor,at) VALUES(lower(hex(randomblob(16))),'drafts.changed','orbit://drafts/'||NEW.id,(SELECT actor FROM orbit_agent_context),(SELECT json_extract(principal,'$.person.id') FROM orbit_agent_context),strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER orbit_change_drafts_update AFTER UPDATE ON drafts BEGIN
 INSERT INTO orbit_native_changes(id,type,uri,actor,sponsor,at) VALUES(lower(hex(randomblob(16))),'drafts.changed','orbit://drafts/'||NEW.id,(SELECT actor FROM orbit_agent_context),(SELECT json_extract(principal,'$.person.id') FROM orbit_agent_context),strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER orbit_change_outbound_messages_insert AFTER INSERT ON outbound_messages BEGIN
 INSERT INTO orbit_native_changes(id,type,uri,actor,sponsor,at) VALUES(lower(hex(randomblob(16))),'outbound_messages.changed','orbit://outreach/'||NEW.id,(SELECT actor FROM orbit_agent_context),(SELECT json_extract(principal,'$.person.id') FROM orbit_agent_context),strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER orbit_change_outbound_messages_update AFTER UPDATE ON outbound_messages BEGIN
 INSERT INTO orbit_native_changes(id,type,uri,actor,sponsor,at) VALUES(lower(hex(randomblob(16))),'outbound_messages.changed','orbit://outreach/'||NEW.id,(SELECT actor FROM orbit_agent_context),(SELECT json_extract(principal,'$.person.id') FROM orbit_agent_context),strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
