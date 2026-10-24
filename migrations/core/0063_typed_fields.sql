CREATE TABLE record_custom_fields (
 kind TEXT NOT NULL CHECK(kind IN('contact','company','opportunity')),
 field_key TEXT NOT NULL,
 label TEXT NOT NULL,
 value_type TEXT NOT NULL CHECK(value_type IN('text','number','date','picklist')),
 required INTEGER NOT NULL CHECK(required IN(0,1)),
 is_unique INTEGER NOT NULL CHECK(is_unique IN(0,1)),
 options_json TEXT NOT NULL CHECK(json_valid(options_json)),
 archived INTEGER NOT NULL CHECK(archived IN(0,1)),
 revision INTEGER NOT NULL,
 PRIMARY KEY(kind,field_key)
);
CREATE TABLE identity_custom_field_epochs (kind TEXT PRIMARY KEY NOT NULL,epoch INTEGER NOT NULL);
INSERT INTO identity_custom_field_epochs VALUES('contact',0),('company',0),('opportunity',0);
CREATE TRIGGER custom_field_contacts_insert AFTER INSERT ON contacts BEGIN UPDATE identity_custom_field_epochs SET epoch=epoch+1 WHERE kind='contact'; END;
CREATE TRIGGER custom_field_contacts_update AFTER UPDATE ON contacts BEGIN UPDATE identity_custom_field_epochs SET epoch=epoch+1 WHERE kind='contact'; END;
CREATE TRIGGER custom_field_contacts_delete AFTER DELETE ON contacts BEGIN UPDATE identity_custom_field_epochs SET epoch=epoch+1 WHERE kind='contact'; END;
CREATE TRIGGER custom_field_companies_insert AFTER INSERT ON companies BEGIN UPDATE identity_custom_field_epochs SET epoch=epoch+1 WHERE kind='company'; END;
CREATE TRIGGER custom_field_companies_update AFTER UPDATE ON companies BEGIN UPDATE identity_custom_field_epochs SET epoch=epoch+1 WHERE kind='company'; END;
CREATE TRIGGER custom_field_companies_delete AFTER DELETE ON companies BEGIN UPDATE identity_custom_field_epochs SET epoch=epoch+1 WHERE kind='company'; END;
CREATE TRIGGER custom_field_deals_insert AFTER INSERT ON opportunities BEGIN UPDATE identity_custom_field_epochs SET epoch=epoch+1 WHERE kind='opportunity'; END;
CREATE TRIGGER custom_field_deals_update AFTER UPDATE ON opportunities BEGIN UPDATE identity_custom_field_epochs SET epoch=epoch+1 WHERE kind='opportunity'; END;
CREATE TRIGGER custom_field_deals_delete AFTER DELETE ON opportunities BEGIN UPDATE identity_custom_field_epochs SET epoch=epoch+1 WHERE kind='opportunity'; END;

CREATE TABLE record_custom_field_history (kind TEXT NOT NULL,field_key TEXT NOT NULL,revision INTEGER NOT NULL,definition_json TEXT NOT NULL CHECK(json_valid(definition_json)),changed_at TEXT NOT NULL,PRIMARY KEY(kind,field_key,revision));
