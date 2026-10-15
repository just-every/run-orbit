-- A native owner recovery grant minted by rer signin with the deployment's
-- Cloudflare authority. Only its digest is stored; all state stays local.
CREATE TABLE identity_owner_signins (
 id TEXT PRIMARY KEY NOT NULL,
 token_hash TEXT NOT NULL UNIQUE,
 operator_id TEXT NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
 operator_version INTEGER NOT NULL,
 created_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 consumed_at INTEGER
);

-- Explicit, read-only native owner projection for the pinned CLI integration.
CREATE VIEW rer_owner_signin_operators AS
 SELECT o.id,o.email,
  COALESCE(unixepoch(o.updated_at)*1000+CAST(substr(o.updated_at,21,3) AS INTEGER),0) AS version
 FROM operators o WHERE o.setup_owner=1 AND o.status='active';
