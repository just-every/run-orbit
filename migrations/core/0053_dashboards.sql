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
