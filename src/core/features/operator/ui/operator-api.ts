import { z } from "zod";

const nowOpportunitySchema = z.object({
  id: z.string(),
  title: z.string(),
  lifecycle: z.string(),
  stageId: z.string(),
  stage: z.string(),
  ownerId: z.string().nullable(),
  ownerName: z.string().nullable(),
  companyName: z.string().nullable(),
  score: z.number(),
  band: z.string(),
  queueState: z.string(),
  queueReason: z.string().nullable(),
  lastContributingSignalAt: z.string().nullable()
});

const opportunityDetailSchema = nowOpportunitySchema.extend({
  companyId: z.string().nullable(),
  valueCents: z.number(),
  expectedCloseAt: z.string().nullable(),
  contacts: z.array(z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string().nullable(),
    jobTitle: z.string().nullable(),
    contactability: z.string(),
    isPrimary: z.boolean()
  })),
  signals: z.array(z.object({
    id: z.string(),
    type: z.string(),
    subject: z.string().nullable(),
    occurredAt: z.string(),
    receivedAt: z.string(),
    confidence: z.string(),
    linkingBasis: z.string(),
    source: z.string()
  })),
  evaluation: z.object({
    id: z.string(),
    score: z.number(),
    band: z.string(),
    evaluatedAt: z.string(),
    failureAt: z.string().nullable(),
    policyVersion: z.string(),
    status: z.string(),
    contributions: z.array(z.object({
      signalId: z.string(),
      signalType: z.string(),
      occurredAt: z.string(),
      confidence: z.string(),
      source: z.string(),
      contribution: z.number()
    }))
  }).nullable(),
  recommendation: z.object({
    id: z.string(),
    actionType: z.string(),
    explanation: z.string().nullable(),
    policyVersion: z.string(),
    evidenceSignalIds: z.array(z.string())
  }).nullable(),
  timeline: z.array(z.object({
    id: z.string(),
    kind: z.string(),
    occurredAt: z.string(),
    recordedAt: z.string(),
    actorType: z.string(),
    actorName: z.string(),
    sourceName: z.string(),
    payload: z.unknown()
  }))
});

const draftSchema = z.object({
  id: z.string(),
  opportunityId: z.string().nullable(),
  recommendationId: z.string().nullable(),
  authorId: z.string(),
  authorLabel: z.string().optional(),
  recipientContactId: z.string().nullable(),
  recipientEmail: z.string().email(),
  subject: z.string(),
  body: z.string(),
  revision: z.number().int().positive(),
  isStale: z.boolean(),
  staleReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

const nowFacetsSchema = z.object({
  bands: z.array(z.string()),
  owners: z.array(z.object({ id: z.string().nullable(), name: z.string().nullable() })),
  stages: z.array(z.object({ id: z.string(), name: z.string() }))
});

export type NowOpportunity = z.infer<typeof nowOpportunitySchema>;
export type OpportunityDetail = z.infer<typeof opportunityDetailSchema>;
export type OperatorDraft = z.infer<typeof draftSchema>;
export class OperatorApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

const workspacePresentationSchema = z.object({
  currency: z.string().length(3),
  name: z.string().min(1),
  timezone: z.string().min(1)
});

export type WorkspacePresentation = z.infer<typeof workspacePresentationSchema>;

async function requestJson<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...init?.headers }
  });
  const payload: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const message = z.object({ error: z.string() }).safeParse(payload);
    throw new OperatorApiError(response.status, message.success ? message.data.error : "Orbit could not complete that request.");
  }

  return schema.parse(payload);
}

export const operatorApi = {
  listNow: (filters: { band?: string; ownerId?: string; stageId?: string } = {}) => {
    const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
    const suffix = query.size ? `?${query}` : "";
    return requestJson(`/api/v1/opportunities/now${suffix}`, z.object({ facets: nowFacetsSchema, opportunities: z.array(nowOpportunitySchema) }));
  },
  readOpportunity: (id: string) => requestJson(`/api/v1/opportunities/${id}`, z.object({ opportunity: opportunityDetailSchema })),
  listOpportunityDrafts: (opportunityId: string) => requestJson(
    `/api/v1/drafts?opportunityId=${encodeURIComponent(opportunityId)}`,
    z.object({ drafts: z.array(draftSchema) })
  ),
  readWorkspacePresentation: () => requestJson(
    "/api/v1/workspace/presentation",
    z.object({ presentation: workspacePresentationSchema })
  ),
  readDraft: (id: string) => requestJson(`/api/v1/drafts/${id}`, z.object({ draft: draftSchema })),
  updateDraft: (draft: OperatorDraft) => requestJson(
    `/api/v1/drafts/${draft.id}`,
    z.object({ draft: draftSchema }),
    {
      method: "PUT",
      body: JSON.stringify({
        revision: draft.revision,
        recipientEmail: draft.recipientEmail,
        subject: draft.subject,
        body: draft.body
      })
    }
  )
};
