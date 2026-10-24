-- Installation-local admission policy; identity tables never confer restored authority.
CREATE TABLE identity_domain_policies (
 domain TEXT PRIMARY KEY NOT NULL,
 provider_id TEXT NOT NULL,
 updated_by TEXT NOT NULL REFERENCES operators(id),
 updated_at TEXT NOT NULL
);
