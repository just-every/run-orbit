ALTER TABLE operators ADD COLUMN setup_owner INTEGER NOT NULL DEFAULT 0 CHECK (setup_owner IN (0, 1));
CREATE UNIQUE INDEX one_setup_owner ON operators(setup_owner) WHERE setup_owner = 1;

CREATE TABLE owner_bootstrap (
  id TEXT PRIMARY KEY CHECK (id = 'initial-owner'),
  owner_id TEXT NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  workspace_name TEXT NOT NULL,
  timezone TEXT NOT NULL,
  currency TEXT NOT NULL,
  stages_json TEXT NOT NULL CHECK (json_valid(stages_json)),
  created_at TEXT NOT NULL
);

-- A single INSERT creates the complete workspace atomically, including on D1.
CREATE TRIGGER bootstrap_fresh_workspace AFTER INSERT ON owner_bootstrap
BEGIN
  SELECT RAISE(ABORT, 'Owner bootstrap requires an empty workspace')
    WHERE EXISTS (SELECT 1 FROM operators) OR EXISTS (SELECT 1 FROM workspace_settings)
       OR EXISTS (SELECT 1 FROM pipeline_stages);
  INSERT INTO operators (id, email, display_name, status, setup_owner, created_at, updated_at)
    VALUES (NEW.owner_id, NEW.email, NEW.display_name, 'active', 1, NEW.created_at, NEW.created_at);
  INSERT INTO workspace_settings
    VALUES ('workspace', NEW.workspace_name, NEW.timezone, NEW.currency,
      '{"days":[1,2,3,4,5],"start":"08:00","end":"18:00"}', 14, 5, '[]', NEW.created_at, NEW.created_at);
  INSERT INTO pipeline_stages (id, name, position, created_at, updated_at)
    SELECT json_extract(value, '$.id'), json_extract(value, '$.name'), CAST(key AS INTEGER), NEW.created_at, NEW.created_at
    FROM json_each(NEW.stages_json);
END;
