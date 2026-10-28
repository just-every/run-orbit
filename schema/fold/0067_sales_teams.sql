-- Native sales authority is separate from collaborator invitations and grants.
CREATE TABLE sales_roles (
 operator_id TEXT PRIMARY KEY REFERENCES operators(id) ON DELETE CASCADE,
 role TEXT NOT NULL CHECK(role IN('sales-admin','manager','seller','read-only')),
 scope TEXT NOT NULL CHECK(scope IN('all','team','assigned')),
 fields_json TEXT NOT NULL CHECK(json_valid(fields_json) AND json_type(fields_json)='array'),
 permissions_json TEXT NOT NULL CHECK(json_valid(permissions_json) AND json_type(permissions_json)='array'),
 include_associations INTEGER NOT NULL DEFAULT 0 CHECK(include_associations IN(0,1))
);
CREATE TABLE sales_teams (
 id TEXT PRIMARY KEY,name TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)),default_dashboard_id TEXT
);
CREATE TABLE sales_team_members (
 team_id TEXT NOT NULL REFERENCES sales_teams(id) ON DELETE CASCADE,
 operator_id TEXT NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
 PRIMARY KEY(team_id,operator_id)
);
CREATE INDEX sales_team_members_operator ON sales_team_members(operator_id,team_id);
CREATE TABLE sales_record_shares (
 id TEXT PRIMARY KEY,kind TEXT NOT NULL,record_id TEXT NOT NULL,
 subject_kind TEXT NOT NULL CHECK(subject_kind IN('user','team')),subject_id TEXT NOT NULL,
 fields_json TEXT NOT NULL CHECK(json_valid(fields_json) AND json_type(fields_json)='array'),
 can_edit INTEGER NOT NULL DEFAULT 0 CHECK(can_edit IN(0,1)),
 UNIQUE(kind,record_id,subject_kind,subject_id)
);
CREATE INDEX sales_record_shares_record ON sales_record_shares(kind,record_id);
CREATE INDEX sales_record_shares_subject ON sales_record_shares(subject_kind,subject_id);
CREATE TRIGGER sales_roles_epoch_insert AFTER INSERT ON sales_roles WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN UPDATE access_workspaces SET policy_epoch=policy_epoch+1; END;
CREATE TRIGGER sales_roles_epoch_update AFTER UPDATE ON sales_roles WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN UPDATE access_workspaces SET policy_epoch=policy_epoch+1; END;
CREATE TRIGGER sales_roles_epoch_delete AFTER DELETE ON sales_roles WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN UPDATE access_workspaces SET policy_epoch=policy_epoch+1; END;
CREATE TRIGGER sales_teams_epoch_insert AFTER INSERT ON sales_teams WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN UPDATE access_workspaces SET policy_epoch=policy_epoch+1; END;
CREATE TRIGGER sales_teams_epoch_update AFTER UPDATE ON sales_teams WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN UPDATE access_workspaces SET policy_epoch=policy_epoch+1; END;
CREATE TRIGGER sales_teams_epoch_delete AFTER DELETE ON sales_teams WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN UPDATE access_workspaces SET policy_epoch=policy_epoch+1; END;
CREATE TRIGGER sales_team_members_epoch_insert AFTER INSERT ON sales_team_members WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN UPDATE access_workspaces SET policy_epoch=policy_epoch+1; END;
CREATE TRIGGER sales_team_members_epoch_update AFTER UPDATE ON sales_team_members WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN UPDATE access_workspaces SET policy_epoch=policy_epoch+1; END;
CREATE TRIGGER sales_team_members_epoch_delete AFTER DELETE ON sales_team_members WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN UPDATE access_workspaces SET policy_epoch=policy_epoch+1; END;
CREATE TRIGGER sales_record_shares_epoch_insert AFTER INSERT ON sales_record_shares WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN UPDATE access_workspaces SET policy_epoch=policy_epoch+1; END;
CREATE TRIGGER sales_record_shares_epoch_update AFTER UPDATE ON sales_record_shares WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN UPDATE access_workspaces SET policy_epoch=policy_epoch+1; END;
CREATE TRIGGER sales_record_shares_epoch_delete AFTER DELETE ON sales_record_shares WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) BEGIN UPDATE access_workspaces SET policy_epoch=policy_epoch+1; END;
