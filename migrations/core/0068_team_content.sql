-- Content and Slack audiences are native sales teams, never a new access grant.
ALTER TABLE message_library ADD COLUMN team_id TEXT;
ALTER TABLE slack_channels ADD COLUMN audience_team_id TEXT;
CREATE INDEX message_library_team ON message_library(team_id) WHERE team_id IS NOT NULL;

-- Extend the native override register without losing any installed per-user limits.
CREATE TABLE sending_limits_team (
 id TEXT PRIMARY KEY CHECK(id='shared' OR id LIKE 'one-to-one:%' OR id LIKE 'sequence:%' OR id LIKE 'team:one-to-one:%' OR id LIKE 'team:sequence:%'),
 value INTEGER NOT NULL CHECK(value>0),
 updated_by TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
INSERT INTO sending_limits_team SELECT id,value,updated_by,updated_at FROM sending_limits;
DROP TABLE sending_limits;
ALTER TABLE sending_limits_team RENAME TO sending_limits;
