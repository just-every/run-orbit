export interface NowOpportunity {
  id: string;
  title: string;
  lifecycle: string;
  stageId: string;
  stage: string;
  ownerId: string | null;
  ownerName: string | null;
  companyName: string | null;
  score: number;
  band: string;
  queueState: string;
  queueReason: string | null;
  lastContributingSignalAt: string | null;
}

export interface NowOpportunityFilters {
  band?: "low" | "medium" | "high";
  ownerId?: string | "unassigned";
  stageId?: string;
}

export interface NowOpportunityFacets {
  bands: string[];
  owners: Array<{ id: string | null; name: string | null }>;
  stages: Array<{ id: string; name: string }>;
}

export interface OpportunityDetail extends NowOpportunity {
  stageId: string;
  ownerId: string | null;
  companyId: string | null;
  valueCents: number;
  expectedCloseAt: string | null;
  contacts: Array<{
    id: string;
    name: string | null;
    email: string | null;
    jobTitle: string | null;
    contactability: string;
    isPrimary: boolean;
  }>;
  signals: Array<{
    id: string;
    type: string;
    subject: string | null;
    occurredAt: string;
    receivedAt: string;
    confidence: string;
    linkingBasis: string;
    source: string;
  }>;
  evaluation: {
    id: string;
    score: number;
    band: string;
    evaluatedAt: string;
    failureAt: string | null;
    policyVersion: string;
    status: string;
    contributions: Array<{
      signalId: string;
      signalType: string;
      occurredAt: string;
      confidence: string;
      source: string;
      contribution: number;
    }>;
  } | null;
  recommendation: {
    id: string;
    actionType: string;
    explanation: string | null;
    policyVersion: string;
    evidenceSignalIds: string[];
  } | null;
  timeline: Array<{
    id: string;
    kind: string;
    occurredAt: string;
    recordedAt: string;
    actorType: string;
    actorName: string;
    sourceName: string;
    payload: unknown;
  }>;
}
