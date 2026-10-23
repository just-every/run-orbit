ALTER TABLE workspace_settings ADD COLUMN capture_mail_rule TEXT NOT NULL DEFAULT 'review' CHECK(capture_mail_rule IN('review','recent','all'));

-- Keep fresh bootstrap atomic while later settings take their declared defaults.
DROP TRIGGER bootstrap_fresh_workspace;
CREATE TRIGGER bootstrap_fresh_workspace AFTER INSERT ON owner_bootstrap
BEGIN
  SELECT RAISE(ABORT, 'Owner bootstrap requires an empty workspace')
    WHERE EXISTS (SELECT 1 FROM operators) OR EXISTS (SELECT 1 FROM workspace_settings)
       OR EXISTS (SELECT 1 FROM pipeline_stages);
  INSERT INTO operators (id, email, display_name, status, setup_owner, created_at, updated_at)
    VALUES (NEW.owner_id, NEW.email, NEW.display_name, 'active', 1, NEW.created_at, NEW.created_at);
  INSERT INTO workspace_settings(id,name,timezone,currency,working_hours_json,stale_interval_days,awaiting_response_working_days,free_mail_domains_json,created_at,updated_at)
    VALUES ('workspace', NEW.workspace_name, NEW.timezone, NEW.currency,
      '{"days":[1,2,3,4,5],"start":"08:00","end":"18:00"}', 14, 5, '[]', NEW.created_at, NEW.created_at);
  INSERT INTO pipeline_stages (id, name, position, created_at, updated_at)
    SELECT json_extract(value, '$.id'), json_extract(value, '$.name'), CAST(key AS INTEGER), NEW.created_at, NEW.created_at
    FROM json_each(NEW.stages_json);
END;
