import { z } from "zod";

const identifier = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
const nullableString = z.string().nullable();
const recordType = z.enum(["contact", "company", "opportunity"]);

export const sampleDataSchema = z.object({
  version: z.string().min(1),
  workspace: z.object({
    name: z.string().min(1),
    timezone: z.string().min(1),
    currency: z.string().length(3),
    workingHours: z.unknown(),
    staleIntervalDays: z.number().int().positive(),
    awaitingResponseWorkingDays: z.number().int().positive(),
    freeMailDomains: z.array(z.string().min(1))
  }),
  operators: z.array(z.object({ id: identifier, email: z.string().email(), displayName: z.string().min(1) })),
  pipelineStages: z.array(z.object({ id: identifier, name: z.string().min(1), position: z.number().int().nonnegative() })),
  companies: z.array(z.object({
    id: identifier,
    name: z.string().min(1),
    primaryDomain: nullableString,
    primaryDomainKey: nullableString
  })),
  contacts: z.array(z.object({
    id: identifier,
    companyId: identifier.nullable(),
    name: nullableString,
    email: nullableString,
    emailKey: nullableString,
    phone: nullableString,
    jobTitle: nullableString,
    timezone: nullableString,
    contactability: z.enum(["contactable", "do_not_contact"])
  })),
  opportunities: z.array(z.object({
    id: identifier,
    title: z.string().min(1),
    lifecycle: z.enum(["open", "won", "lost"]),
    stageId: identifier,
    ownerId: identifier.nullable(),
    companyId: identifier.nullable(),
    valueCents: z.number().int().nonnegative(),
    expectedCloseAt: nullableString,
    score: z.number().int().min(0).max(100),
    band: z.enum(["low", "medium", "high"]),
    queueState: z.enum(["now", "next", "none"]),
    queueReason: nullableString,
    lastContributingSignalAt: nullableString
  })),
  opportunityContacts: z.array(z.object({ opportunityId: identifier, contactId: identifier, isPrimary: z.boolean() })),
  signalSources: z.array(z.object({ id: identifier, name: z.string().min(1), type: z.string().min(1), enabled: z.boolean() })),
  signals: z.array(z.object({
    id: identifier,
    sourceId: identifier,
    sourceEventId: z.string().min(1),
    type: z.string().min(1),
    subject: nullableString,
    occurredAt: z.string().datetime(),
    receivedAt: z.string().datetime(),
    payloadHash: z.string().regex(/^[a-f\d]{64}$/),
    confidence: z.enum(["observed", "inferred"]),
    linkingBasis: z.string().min(1)
  })),
  signalLinks: z.array(z.object({
    signalId: identifier,
    recordType,
    recordId: identifier,
    linkingBasis: z.string().min(1),
    linkedAt: z.string().datetime()
  })),
  evaluations: z.array(z.object({
    id: identifier,
    opportunityId: identifier,
    score: z.number().int().min(0).max(100),
    band: z.enum(["low", "medium", "high"]),
    evaluatedAt: z.string().datetime(),
    policyVersion: z.string().min(1),
    status: z.literal("current"),
    failureAt: nullableString,
    contributions: z.array(z.object({ id: identifier, signalId: identifier, contribution: z.number().int() }))
  })),
  recommendations: z.array(z.object({
    id: identifier,
    opportunityId: identifier,
    actionType: z.enum(["email_follow_up", "manual_action"]),
    explanation: nullableString,
    policyVersion: z.string().min(1),
    isCurrent: z.literal(true),
    supersededAt: nullableString,
    evidenceSignalIds: z.array(identifier).min(1)
  })),
  timelineEntries: z.array(z.object({
    id: identifier,
    kind: z.string().min(1),
    occurredAt: z.string().datetime(),
    recordedAt: z.string().datetime(),
    actorType: z.string().min(1),
    actorId: identifier.nullable(),
    source: z.string().min(1),
    payload: z.unknown(),
    records: z.array(z.object({ recordType, recordId: identifier })).min(1)
  })),
  drafts: z.array(z.object({
    id: identifier,
    opportunityId: identifier,
    recommendationId: identifier.nullable(),
    authorId: identifier,
    recipientContactId: identifier.nullable(),
    recipientEmail: z.string().email(),
    subject: z.string().min(1),
    body: z.string().min(1),
    revision: z.number().int().positive(),
    isStale: z.boolean(),
    staleReason: nullableString
  })),
  auditEntries: z.array(z.object({
    id: identifier,
    actorId: identifier.nullable(),
    action: z.string().min(1),
    entityType: z.string().min(1),
    entityId: z.string().min(1),
    details: z.unknown(),
    occurredAt: z.string().datetime()
  }))
});

export type SampleData = z.infer<typeof sampleDataSchema>;
