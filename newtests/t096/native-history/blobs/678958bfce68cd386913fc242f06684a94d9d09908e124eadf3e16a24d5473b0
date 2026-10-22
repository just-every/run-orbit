-- REPORT-001: who may open a saved report. Sharing never grants record access: each viewer's own access computes what they see.
-- A definition without a row keeps the earlier workspace-wide visibility.
CREATE TABLE analytics_report_shares(
 workspace_id TEXT NOT NULL,
 definition_id TEXT NOT NULL,
 owner_id TEXT,
 audience TEXT NOT NULL CHECK(audience IN('private','operators','workspace')),
 operators_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(operators_json) AND json_type(operators_json)='array'),
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
 updated_by TEXT,
 updated_at TEXT NOT NULL,
 PRIMARY KEY(workspace_id,definition_id)
);
