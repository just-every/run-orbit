-- Definitions only: figures always come from the current viewer's report engine.
CREATE TABLE sales_dashboards (
 workspace_id TEXT NOT NULL, id TEXT NOT NULL, owner_id TEXT, version INTEGER NOT NULL,
 sharing_version INTEGER NOT NULL DEFAULT 1, authority INTEGER NOT NULL DEFAULT 1,
 PRIMARY KEY(workspace_id,id)
);
CREATE TABLE sales_dashboard_versions (
 workspace_id TEXT NOT NULL, dashboard_id TEXT NOT NULL, version INTEGER NOT NULL,
 body_json TEXT NOT NULL, actor_id TEXT, created_at TEXT NOT NULL,
 PRIMARY KEY(workspace_id,dashboard_id,version)
);
CREATE TABLE sales_dashboard_shares (
 workspace_id TEXT NOT NULL, dashboard_id TEXT NOT NULL, version INTEGER NOT NULL,
 body_json TEXT NOT NULL, actor_id TEXT, created_at TEXT NOT NULL,
 PRIMARY KEY(workspace_id,dashboard_id,version)
);
CREATE TABLE sales_dashboard_defaults (
 workspace_id TEXT NOT NULL, operator_id TEXT NOT NULL, dashboard_id TEXT NOT NULL,
 PRIMARY KEY(workspace_id,operator_id)
);
CREATE TABLE sales_dashboard_schedules (
 workspace_id TEXT NOT NULL, dashboard_id TEXT NOT NULL, version INTEGER NOT NULL,
 body_json TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN('paused','active')),
 actor_id TEXT, created_at TEXT NOT NULL,
 PRIMARY KEY(workspace_id,dashboard_id,version)
);
-- Erasure withdraws saved-result pointers from every retained definition version.
CREATE TRIGGER dashboard_withdraw_sales_snapshot BEFORE DELETE ON analytics_snapshots
WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import'))
BEGIN
 UPDATE sales_dashboard_versions SET body_json=json_set(body_json,'$.tiles',json((SELECT json_group_array(json(CASE WHEN json_extract(t.value,'$.snapshotId')=OLD.id THEN json_set(t.value,'$.sourceId','','$.snapshotId',NULL,'$.withdrawn',json('true')) ELSE t.value END)) FROM json_each(body_json,'$.tiles') t)))
 WHERE EXISTS(SELECT 1 FROM json_each(body_json,'$.tiles') t WHERE json_extract(t.value,'$.snapshotId')=OLD.id);
END;
CREATE TRIGGER dashboard_withdraw_forecast_snapshot BEFORE DELETE ON forecast_snapshots
WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import'))
BEGIN
 UPDATE sales_dashboard_versions SET body_json=json_set(body_json,'$.tiles',json((SELECT json_group_array(json(CASE WHEN json_extract(t.value,'$.source')='forecast' AND json_extract(t.value,'$.sourceId')=OLD.id THEN json_set(t.value,'$.sourceId','','$.snapshotId',NULL,'$.withdrawn',json('true')) ELSE t.value END)) FROM json_each(body_json,'$.tiles') t)))
 WHERE EXISTS(SELECT 1 FROM json_each(body_json,'$.tiles') t WHERE json_extract(t.value,'$.source')='forecast' AND json_extract(t.value,'$.sourceId')=OLD.id);
END;

-- A removed report cannot be replaced under the same key and silently revive an old tile.
CREATE TRIGGER dashboard_withdraw_report BEFORE DELETE ON analytics_report_shares
WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import'))
BEGIN
 UPDATE sales_dashboard_versions SET body_json=json_set(body_json,'$.tiles',json((SELECT json_group_array(json(CASE WHEN json_extract(t.value,'$.source')='report' AND json_extract(t.value,'$.sourceId')=OLD.definition_id THEN json_set(t.value,'$.sourceId','','$.snapshotId',NULL,'$.withdrawn',json('true')) ELSE t.value END)) FROM json_each(body_json,'$.tiles') t)))
 WHERE workspace_id=OLD.workspace_id AND EXISTS(SELECT 1 FROM json_each(body_json,'$.tiles') t WHERE json_extract(t.value,'$.source')='report' AND json_extract(t.value,'$.sourceId')=OLD.definition_id);
END;
