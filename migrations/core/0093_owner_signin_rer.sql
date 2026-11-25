-- `rer signin` (rer 0.2.105 and later) writes its one-time owner grant into
-- oa_owner_signins and picks the owner from oa_operators and oa_bootstrap.
-- Orbit keeps its own operators, so the grant table takes rer's name (every
-- row and its cascade to operators kept) and two read-only views project
-- Orbit's active setup owner under the names rer reads. Only the owner is
-- projected: rer signs in the owner, and Orbit's people stay in operators.
ALTER TABLE identity_owner_signins RENAME TO oa_owner_signins;

DROP VIEW rer_owner_signin_operators;

CREATE VIEW oa_operators AS
 SELECT o.id,o.email,'owner' AS role,o.status,
  COALESCE(unixepoch(o.updated_at)*1000+CAST(substr(o.updated_at,21,3) AS INTEGER),0) AS version,
  o.created_at
 FROM operators o WHERE o.setup_owner=1 AND o.status='active';

CREATE VIEW oa_bootstrap AS
 SELECT 1 AS singleton,o.id AS claim_id FROM operators o WHERE o.setup_owner=1 AND o.status='active';
