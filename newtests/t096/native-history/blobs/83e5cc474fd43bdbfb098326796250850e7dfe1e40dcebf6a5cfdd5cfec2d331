-- Association metadata stays outside the four-column native opportunity_contacts table.
CREATE TABLE opportunity_stakeholder_roles (
 opportunity_id TEXT NOT NULL,
 contact_id TEXT NOT NULL,
 roles_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(roles_json) AND json_type(roles_json)='array'),
 verified INTEGER NOT NULL DEFAULT 0 CHECK(verified IN(0,1)),
 verified_by TEXT REFERENCES operators(id) ON DELETE SET NULL,
 verified_at TEXT,
 updated_at TEXT NOT NULL,
 PRIMARY KEY(opportunity_id,contact_id),
 FOREIGN KEY(opportunity_id,contact_id) REFERENCES opportunity_contacts(opportunity_id,contact_id) ON DELETE CASCADE,
 CHECK((verified=0 AND verified_by IS NULL AND verified_at IS NULL) OR (verified=1 AND verified_at IS NOT NULL))
);
CREATE INDEX stakeholder_roles_contact ON opportunity_stakeholder_roles(contact_id,opportunity_id);

CREATE TABLE opportunity_buying_context (
 opportunity_id TEXT PRIMARY KEY REFERENCES opportunities(id) ON DELETE CASCADE,
 products_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(products_json) AND json_type(products_json)='array'),
 next_step TEXT NOT NULL DEFAULT '',
 mutual_commitments TEXT NOT NULL DEFAULT '',
 updated_at TEXT NOT NULL
);

-- Keep context attribution even after someone is removed from a deal, for later erasure.
CREATE TABLE buying_context_contacts (
 opportunity_id TEXT NOT NULL REFERENCES opportunity_buying_context(opportunity_id) ON DELETE CASCADE,
 contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
 PRIMARY KEY(opportunity_id,contact_id)
);
CREATE INDEX buying_context_contact ON buying_context_contacts(contact_id,opportunity_id);

CREATE TABLE contact_company_relationships (
 contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
 company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 verified INTEGER NOT NULL DEFAULT 0 CHECK(verified IN(0,1)),
 verified_by TEXT REFERENCES operators(id) ON DELETE SET NULL,
 verified_at TEXT,
 updated_at TEXT NOT NULL,
 PRIMARY KEY(contact_id,company_id),
 CHECK((verified=0 AND verified_by IS NULL AND verified_at IS NULL) OR (verified=1 AND verified_at IS NOT NULL))
);
CREATE INDEX contact_secondary_company ON contact_company_relationships(company_id,contact_id);

-- Promoting a secondary company through the native editor leaves one primary association.
CREATE TRIGGER relationship_primary_company AFTER UPDATE OF company_id ON contacts
WHEN NEW.company_id IS NOT NULL BEGIN
 DELETE FROM contact_company_relationships WHERE contact_id=NEW.id AND company_id=NEW.company_id;
END;

-- Merges transfer and remove retired attribution before deleting the retired row.
-- Other contact deletion removes dependent personal buying context as a whole.
CREATE TRIGGER relationship_contact_context_erasure BEFORE DELETE ON contacts
WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN
 DELETE FROM opportunity_buying_context WHERE opportunity_id IN(SELECT opportunity_id FROM buying_context_contacts WHERE contact_id=OLD.id);
END;

-- Reject writes already in flight when archive restoration takes maintenance.
CREATE TRIGGER archive_guard_opportunity_stakeholder_roles_insert BEFORE INSERT ON opportunity_stakeholder_roles
WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying')
BEGIN SELECT RAISE(ABORT,'Archive restoration is in progress'); END;
CREATE TRIGGER archive_guard_opportunity_stakeholder_roles_update BEFORE UPDATE ON opportunity_stakeholder_roles
WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying')
BEGIN SELECT RAISE(ABORT,'Archive restoration is in progress'); END;
CREATE TRIGGER archive_guard_opportunity_stakeholder_roles_delete BEFORE DELETE ON opportunity_stakeholder_roles
WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying')
BEGIN SELECT RAISE(ABORT,'Archive restoration is in progress'); END;
CREATE TRIGGER archive_guard_opportunity_buying_context_insert BEFORE INSERT ON opportunity_buying_context
WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying')
BEGIN SELECT RAISE(ABORT,'Archive restoration is in progress'); END;
CREATE TRIGGER archive_guard_opportunity_buying_context_update BEFORE UPDATE ON opportunity_buying_context
WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying')
BEGIN SELECT RAISE(ABORT,'Archive restoration is in progress'); END;
CREATE TRIGGER archive_guard_opportunity_buying_context_delete BEFORE DELETE ON opportunity_buying_context
WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying')
BEGIN SELECT RAISE(ABORT,'Archive restoration is in progress'); END;
CREATE TRIGGER archive_guard_buying_context_contacts_insert BEFORE INSERT ON buying_context_contacts
WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying')
BEGIN SELECT RAISE(ABORT,'Archive restoration is in progress'); END;
CREATE TRIGGER archive_guard_buying_context_contacts_update BEFORE UPDATE ON buying_context_contacts
WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying')
BEGIN SELECT RAISE(ABORT,'Archive restoration is in progress'); END;
CREATE TRIGGER archive_guard_buying_context_contacts_delete BEFORE DELETE ON buying_context_contacts
WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying')
BEGIN SELECT RAISE(ABORT,'Archive restoration is in progress'); END;
CREATE TRIGGER archive_guard_contact_company_relationships_insert BEFORE INSERT ON contact_company_relationships
WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying')
BEGIN SELECT RAISE(ABORT,'Archive restoration is in progress'); END;
CREATE TRIGGER archive_guard_contact_company_relationships_update BEFORE UPDATE ON contact_company_relationships
WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying')
BEGIN SELECT RAISE(ABORT,'Archive restoration is in progress'); END;
CREATE TRIGGER archive_guard_contact_company_relationships_delete BEFORE DELETE ON contact_company_relationships
WHEN EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_import') AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='archive_applying')
BEGIN SELECT RAISE(ABORT,'Archive restoration is in progress'); END;
