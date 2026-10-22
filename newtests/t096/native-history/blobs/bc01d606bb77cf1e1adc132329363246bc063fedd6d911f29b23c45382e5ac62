-- First-run setup completion at /setup. An established workspace is already set up;
-- a fresh owner claim creates its workspace after this migration and completes /setup.
CREATE TABLE first_run_setup (
  id TEXT PRIMARY KEY CHECK (id = 'workspace'),
  completed_at TEXT NOT NULL
);
INSERT INTO first_run_setup (id, completed_at)
  SELECT 'workspace', updated_at FROM workspace_settings WHERE id = 'workspace';
