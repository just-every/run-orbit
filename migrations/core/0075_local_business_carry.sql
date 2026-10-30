-- Remember the last local Business name separately from the owner's workspace
-- name, so an unchanged carry cannot undo an edit made inside Orbit.
ALTER TABLE workspace_settings ADD COLUMN local_business_name TEXT;
