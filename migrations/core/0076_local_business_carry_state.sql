-- Local carry observation belongs to this installation, like first-run state;
-- it must not change the customer workspace schema or travel in Records archives.
CREATE TABLE local_business_carry (
  id TEXT PRIMARY KEY CHECK (id = 'workspace'),
  name TEXT NOT NULL
);
INSERT INTO local_business_carry (id, name)
  SELECT id, local_business_name FROM workspace_settings WHERE local_business_name IS NOT NULL;
ALTER TABLE workspace_settings DROP COLUMN local_business_name;
