import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

const createdAt = () => text("created_at").notNull();
const updatedAt = () => text("updated_at").notNull();

export const workspaceSettings = sqliteTable("workspace_settings", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull(),
  currency: text("currency").notNull(),
  workingHoursJson: text("working_hours_json").notNull(),
  staleIntervalDays: integer("stale_interval_days").notNull(),
  awaitingResponseWorkingDays: integer("awaiting_response_working_days").notNull(),
  freeMailDomainsJson: text("free_mail_domains_json").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt()
});

export const operators = sqliteTable("operators", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  setupOwner: integer("setup_owner", { mode: "boolean" }).notNull().default(false),
  status: text("status").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt()
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  operatorId: text("operator_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  revokedAt: text("revoked_at"),
  lastSeenAt: text("last_seen_at"),
  createdAt: createdAt()
});

export const pipelineStages = sqliteTable("pipeline_stages", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  position: integer("position").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt()
});

export const companies = sqliteTable("companies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  primaryDomain: text("primary_domain"),
  primaryDomainKey: text("primary_domain_key"),
  createdAt: createdAt(),
  updatedAt: updatedAt()
});

export const contacts = sqliteTable("contacts", {
  id: text("id").primaryKey(),
  companyId: text("company_id"),
  name: text("name"),
  email: text("email"),
  emailKey: text("email_key"),
  phone: text("phone"),
  jobTitle: text("job_title"),
  timezone: text("timezone"),
  contactability: text("contactability").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt()
});

export const opportunities = sqliteTable("opportunities", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  lifecycle: text("lifecycle").notNull(),
  stageId: text("stage_id").notNull(),
  ownerId: text("owner_id"),
  companyId: text("company_id"),
  valueCents: integer("value_cents").notNull(),
  expectedCloseAt: text("expected_close_at"),
  score: integer("score").notNull(),
  band: text("band").notNull(),
  queueState: text("queue_state").notNull(),
  queueReason: text("queue_reason"),
  lastContributingSignalAt: text("last_contributing_signal_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt()
});

export const opportunityContacts = sqliteTable(
  "opportunity_contacts",
  {
    opportunityId: text("opportunity_id").notNull(),
    contactId: text("contact_id").notNull(),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull(),
    createdAt: createdAt()
  },
  (table) => [primaryKey({ columns: [table.opportunityId, table.contactId] })]
);

export const signalSources = sqliteTable("signal_sources", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt()
});

export const signals = sqliteTable("signals", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").notNull(),
  sourceEventId: text("source_event_id").notNull(),
  type: text("type").notNull(),
  subject: text("subject"),
  occurredAt: text("occurred_at").notNull(),
  receivedAt: text("received_at").notNull(),
  payloadHash: text("payload_hash").notNull(),
  confidence: text("confidence").notNull(),
  linkingBasis: text("linking_basis").notNull(),
  createdAt: createdAt()
});

export const signalLinks = sqliteTable(
  "signal_links",
  {
    signalId: text("signal_id").notNull(),
    recordType: text("record_type").notNull(),
    recordId: text("record_id").notNull(),
    linkingBasis: text("linking_basis").notNull(),
    linkedAt: text("linked_at").notNull()
  },
  (table) => [primaryKey({ columns: [table.signalId, table.recordType, table.recordId] })]
);

export const evaluations = sqliteTable("evaluations", {
  id: text("id").primaryKey(),
  opportunityId: text("opportunity_id").notNull(),
  score: integer("score").notNull(),
  band: text("band").notNull(),
  evaluatedAt: text("evaluated_at").notNull(),
  policyVersion: text("policy_version").notNull(),
  status: text("status").notNull(),
  failureAt: text("failure_at"),
  createdAt: createdAt()
});

export const evaluationContributions = sqliteTable("evaluation_contributions", {
  id: text("id").primaryKey(),
  evaluationId: text("evaluation_id").notNull(),
  signalId: text("signal_id").notNull(),
  contribution: integer("contribution").notNull(),
  createdAt: createdAt()
});

export const recommendations = sqliteTable("recommendations", {
  id: text("id").primaryKey(),
  opportunityId: text("opportunity_id").notNull(),
  actionType: text("action_type").notNull(),
  explanation: text("explanation"),
  policyVersion: text("policy_version").notNull(),
  isCurrent: integer("is_current", { mode: "boolean" }).notNull(),
  supersededAt: text("superseded_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt()
});

export const recommendationEvidence = sqliteTable(
  "recommendation_evidence",
  {
    recommendationId: text("recommendation_id").notNull(),
    signalId: text("signal_id").notNull()
  },
  (table) => [primaryKey({ columns: [table.recommendationId, table.signalId] })]
);

export const timelineEntries = sqliteTable("timeline_entries", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  occurredAt: text("occurred_at").notNull(),
  recordedAt: text("recorded_at").notNull(),
  actorType: text("actor_type").notNull(),
  actorId: text("actor_id"),
  source: text("source").notNull(),
  payloadJson: text("payload_json").notNull()
});

export const timelineEntryRecords = sqliteTable(
  "timeline_entry_records",
  {
    timelineEntryId: text("timeline_entry_id").notNull(),
    recordType: text("record_type").notNull(),
    recordId: text("record_id").notNull()
  },
  (table) => [primaryKey({ columns: [table.timelineEntryId, table.recordType, table.recordId] })]
);

export const drafts = sqliteTable("drafts", {
  id: text("id").primaryKey(),
  opportunityId: text("opportunity_id").notNull(),
  recommendationId: text("recommendation_id"),
  authorId: text("author_id").notNull(),
  recipientContactId: text("recipient_contact_id"),
  recipientEmail: text("recipient_email").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  revision: integer("revision").notNull(),
  isStale: integer("is_stale", { mode: "boolean" }).notNull(),
  staleReason: text("stale_reason"),
  createdAt: createdAt(),
  updatedAt: updatedAt()
});

export const auditEntries = sqliteTable("audit_entries", {
  id: text("id").primaryKey(),
  actorId: text("actor_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  detailsJson: text("details_json").notNull(),
  occurredAt: text("occurred_at").notNull()
});

export const sampleSeedRuns = sqliteTable("sample_seed_runs", {
  version: text("version").primaryKey(),
  appliedAt: text("applied_at").notNull()
});
