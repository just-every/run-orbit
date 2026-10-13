import type { AuditService } from "../../../src/core/features/audit";
import type { TestAuth } from "../../support/test-auth";
import type { DraftsService } from "../../../src/core/features/drafts";
import type { OpportunitiesService } from "../../../src/core/features/opportunities";
import type { RecommendationsService } from "../../../src/core/features/recommendations";
import type { RecordsService } from "../../../src/core/features/records";
import type { SignalsService } from "../../../src/core/features/signals";
import type { TimelineService } from "../../../src/core/features/timeline";
import type { WorkspaceService } from "../../../src/core/features/workspace";
import type { Clock } from "../../../src/core/platform/clock";
import { toIsoString } from "../../../src/core/shared/time";

import { SampleDataRepository } from "./repository";
import { sampleData } from "./sample";

export interface SampleSeedServices {
  audit: AuditService;
  auth: TestAuth;
  drafts: DraftsService;
  opportunities: OpportunitiesService;
  recommendations: RecommendationsService;
  records: RecordsService;
  signals: SignalsService;
  timeline: TimelineService;
  workspace: WorkspaceService;
}

export class SampleDataService {
  constructor(
    private readonly repository: SampleDataRepository,
    private readonly services: SampleSeedServices,
    private readonly clock: Clock
  ) {}

  async seed(): Promise<{ version: string; applied: boolean }> {
    if (await this.repository.hasRun(sampleData.version)) {
      return { version: sampleData.version, applied: false };
    }

    await this.services.workspace.ensureWorkspace(sampleData.workspace);
    for (const stage of sampleData.pipelineStages) await this.services.workspace.ensurePipelineStage(stage);
    for (const operator of sampleData.operators) await this.services.auth.ensureOperator(operator);
    for (const company of sampleData.companies) await this.services.records.ensureCompany(company);
    for (const contact of sampleData.contacts) await this.services.records.ensureContact(contact);
    for (const opportunity of sampleData.opportunities) await this.services.records.ensureOpportunity(opportunity);
    for (const association of sampleData.opportunityContacts) {
      await this.services.records.ensureOpportunityContact(association);
    }
    for (const source of sampleData.signalSources) await this.services.signals.ensureSource(source);
    for (const signal of sampleData.signals) await this.services.signals.recordSignal(signal);
    for (const link of sampleData.signalLinks) await this.services.signals.ensureLink(link);
    for (const evaluation of sampleData.evaluations) {
      await this.services.opportunities.recordCurrentEvaluation({
        ...evaluation,
        now: evaluation.evaluatedAt
      });
      for (const contribution of evaluation.contributions) {
        await this.services.opportunities.ensureContribution({
          ...contribution,
          evaluationId: evaluation.id,
          now: evaluation.evaluatedAt
        });
      }
    }
    for (const recommendation of sampleData.recommendations) {
      await this.services.recommendations.ensureRecommendation(recommendation);
      for (const signalId of recommendation.evidenceSignalIds) {
        await this.services.recommendations.ensureEvidence({ recommendationId: recommendation.id, signalId });
      }
    }
    for (const entry of sampleData.timelineEntries) {
      await this.services.timeline.ensureEntry({
        ...entry,
        payloadJson: JSON.stringify(entry.payload)
      });
      for (const record of entry.records) {
        await this.services.timeline.ensureRecord({ timelineEntryId: entry.id, ...record });
      }
    }
    for (const draft of sampleData.drafts) await this.services.drafts.ensureDraft(draft);
    for (const audit of sampleData.auditEntries) {
      await this.services.audit.ensureEntry({ ...audit, detailsJson: JSON.stringify(audit.details) });
    }

    await this.repository.markRun(sampleData.version, toIsoString(this.clock.now()));
    return { version: sampleData.version, applied: true };
  }
}
