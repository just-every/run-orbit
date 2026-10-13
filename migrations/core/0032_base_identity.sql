-- Base operator-auth composes over Orbit's own operators and sessions (the
-- native accounts route). No operator row moves: every operator id, foreign
-- key, access_* row and invitation stays where it is.

-- An operator's authority version is derived from operators.updated_at, which
-- every Orbit change to an operator's email, status or ownership sets. Deriving
-- it adds no trigger or column to operators, so archive schemas are unchanged.

-- How each session issued from now on was proven, beside Orbit's sessions so
-- no existing table changes. Sessions without a row predate Base sign-in and
-- keep their existing 14-day native contract.
CREATE TABLE identity_sessions (
  session_id TEXT PRIMARY KEY NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  kind TEXT CHECK (kind IS NULL OR kind IN ('native','oidc','dev')),
  authority_version INTEGER,
  issuer TEXT,
  subject TEXT,
  sid TEXT,
  provider_id TEXT,
  provider_linked_at INTEGER,
  provider_generation INTEGER,
  proof_at INTEGER,
  proof_version INTEGER
);
CREATE INDEX identity_sessions_provider_idx ON identity_sessions(issuer, subject);

-- One-use email proofs: sign-in links and session-bound step-up challenges.
-- Only keyed digests are stored, never the emailed token.
CREATE TABLE identity_proofs (
  id TEXT PRIMARY KEY NOT NULL,
  hash TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('magic','step_up')),
  operator_id TEXT NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  authority_version INTEGER NOT NULL,
  email TEXT NOT NULL,
  session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  action TEXT,
  return_to TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  revoked_at INTEGER,
  CHECK (kind <> 'step_up' OR (session_id IS NOT NULL AND action IS NOT NULL))
);
CREATE INDEX identity_proofs_operator_idx ON identity_proofs(operator_id, kind);

-- Keyed rate buckets for email requests, confirmations and step-up.
CREATE TABLE identity_limits (key TEXT PRIMARY KEY NOT NULL, count INTEGER NOT NULL, start INTEGER NOT NULL);

-- The app-owned provider sign-in setting (off for every existing install) and
-- its policy generation: a change ends outstanding provider sessions.
CREATE TABLE identity_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  idp_sign_in INTEGER NOT NULL CHECK (idp_sign_in IN (0,1)),
  generation INTEGER NOT NULL,
  first_setup INTEGER NOT NULL DEFAULT 0 CHECK (first_setup IN (0,1))
);
INSERT INTO identity_settings (id, idp_sign_in, generation, first_setup) VALUES (1, 0, 1, 0);

-- Provider principals bound to operators; a binding never moves to someone else.
CREATE TABLE identity_bindings (
  issuer TEXT NOT NULL,
  subject TEXT NOT NULL,
  operator_id TEXT NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (issuer, subject)
);
CREATE INDEX identity_bindings_operator_idx ON identity_bindings(operator_id);
CREATE TABLE identity_logouts (issuer TEXT NOT NULL, jti TEXT NOT NULL, PRIMARY KEY (issuer, jti));
CREATE TABLE identity_audit (action TEXT NOT NULL, operator_id TEXT, value TEXT, created_at INTEGER NOT NULL);
CREATE TABLE identity_guards (id INTEGER PRIMARY KEY, value INTEGER NOT NULL CHECK (value = 1));

-- A delegation credential minted from a local dev session authenticates only
-- behind the checkout's dev key, which a deployed Worker never has.
CREATE TABLE identity_dev_grants (grant_id TEXT PRIMARY KEY NOT NULL REFERENCES delegation_grants(id) ON DELETE CASCADE);

-- Orbit's own magic links are retired: unused links can no longer be redeemed.
-- The empty table stays, so code from the previous release that runs during an
-- upgrade still finds it.
DELETE FROM magic_links;
