CREATE TABLE workspace_settings (
  id TEXT PRIMARY KEY CHECK (id = 'workspace'),
  name TEXT NOT NULL,
  timezone TEXT NOT NULL,
  currency TEXT NOT NULL,
  working_hours_json TEXT NOT NULL,
  stale_interval_days INTEGER NOT NULL,
  awaiting_response_working_days INTEGER NOT NULL,
  free_mail_domains_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE operators (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'removed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  operator_id TEXT NOT NULL REFERENCES operators(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  last_seen_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX sessions_operator_id_idx ON sessions(operator_id);
CREATE INDEX sessions_active_idx ON sessions(token_hash, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE pipeline_stages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  position INTEGER NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  primary_domain TEXT,
  primary_domain_key TEXT UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE contacts (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  name TEXT,
  email TEXT,
  email_key TEXT UNIQUE,
  phone TEXT,
  job_title TEXT,
  timezone TEXT,
  contactability TEXT NOT NULL CHECK (contactability IN ('contactable', 'do_not_contact')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX contacts_company_id_idx ON contacts(company_id);

CREATE TABLE opportunities (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  lifecycle TEXT NOT NULL CHECK (lifecycle IN ('open', 'won', 'lost')),
  stage_id TEXT NOT NULL REFERENCES pipeline_stages(id),
  owner_id TEXT REFERENCES operators(id) ON DELETE SET NULL,
  company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  value_cents INTEGER NOT NULL,
  expected_close_at TEXT,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  band TEXT NOT NULL CHECK (band IN ('low', 'medium', 'high')),
  queue_state TEXT NOT NULL CHECK (queue_state IN ('now', 'next', 'none')),
  queue_reason TEXT,
  last_contributing_signal_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX opportunities_now_order_idx ON opportunities(queue_state, lifecycle, score DESC, last_contributing_signal_at DESC, id ASC);
CREATE INDEX opportunities_company_id_idx ON opportunities(company_id);
CREATE INDEX opportunities_owner_id_idx ON opportunities(owner_id);

CREATE TABLE opportunity_contacts (
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  created_at TEXT NOT NULL,
  PRIMARY KEY (opportunity_id, contact_id)
);
CREATE UNIQUE INDEX opportunity_primary_contact_idx ON opportunity_contacts(opportunity_id) WHERE is_primary = 1;

CREATE TABLE signal_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE signals (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES signal_sources(id),
  source_event_id TEXT NOT NULL,
  type TEXT NOT NULL,
  subject TEXT,
  occurred_at TEXT NOT NULL,
  received_at TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('observed', 'inferred')),
  linking_basis TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (source_id, source_event_id)
);
CREATE INDEX signals_occurred_at_idx ON signals(occurred_at DESC, id ASC);

CREATE TABLE signal_links (
  signal_id TEXT NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK (record_type IN ('contact', 'company', 'opportunity')),
  record_id TEXT NOT NULL,
  linking_basis TEXT NOT NULL,
  linked_at TEXT NOT NULL,
  PRIMARY KEY (signal_id, record_type, record_id)
);
CREATE INDEX signal_links_record_idx ON signal_links(record_type, record_id, signal_id);

CREATE TABLE evaluations (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  band TEXT NOT NULL CHECK (band IN ('low', 'medium', 'high')),
  evaluated_at TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('current', 'stale', 'failed')),
  failure_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX evaluations_opportunity_idx ON evaluations(opportunity_id, evaluated_at DESC, id ASC);
CREATE UNIQUE INDEX current_evaluation_per_opportunity_idx ON evaluations(opportunity_id) WHERE status = 'current';

CREATE TABLE evaluation_contributions (
  id TEXT PRIMARY KEY,
  evaluation_id TEXT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  signal_id TEXT NOT NULL REFERENCES signals(id),
  contribution INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (evaluation_id, signal_id)
);

CREATE TABLE recommendations (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('email_follow_up', 'manual_action')),
  explanation TEXT,
  policy_version TEXT NOT NULL,
  is_current INTEGER NOT NULL CHECK (is_current IN (0, 1)),
  superseded_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX current_recommendation_per_opportunity_idx ON recommendations(opportunity_id) WHERE is_current = 1;

CREATE TABLE recommendation_evidence (
  recommendation_id TEXT NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  signal_id TEXT NOT NULL REFERENCES signals(id),
  PRIMARY KEY (recommendation_id, signal_id)
);

CREATE TABLE timeline_entries (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  source TEXT NOT NULL,
  payload_json TEXT NOT NULL
);
CREATE INDEX timeline_entries_order_idx ON timeline_entries(occurred_at DESC, id ASC);

CREATE TABLE timeline_entry_records (
  timeline_entry_id TEXT NOT NULL REFERENCES timeline_entries(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK (record_type IN ('contact', 'company', 'opportunity')),
  record_id TEXT NOT NULL,
  PRIMARY KEY (timeline_entry_id, record_type, record_id)
);
CREATE INDEX timeline_entry_records_record_idx ON timeline_entry_records(record_type, record_id, timeline_entry_id);

CREATE TABLE drafts (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  recommendation_id TEXT REFERENCES recommendations(id) ON DELETE SET NULL,
  author_id TEXT NOT NULL REFERENCES operators(id),
  recipient_contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  is_stale INTEGER NOT NULL DEFAULT 0 CHECK (is_stale IN (0, 1)),
  stale_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX drafts_opportunity_idx ON drafts(opportunity_id, updated_at DESC, id ASC);

CREATE TABLE audit_entries (
  id TEXT PRIMARY KEY,
  actor_id TEXT REFERENCES operators(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details_json TEXT NOT NULL,
  occurred_at TEXT NOT NULL
);
CREATE INDEX audit_entries_entity_idx ON audit_entries(entity_type, entity_id, occurred_at DESC, id ASC);

CREATE TABLE sample_seed_runs (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);
