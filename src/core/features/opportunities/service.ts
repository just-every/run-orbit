import { OpportunitiesRepository } from "./repository";
import type { NowOpportunityFacets, OpportunityDetail, NowOpportunity, NowOpportunityFilters } from "./contracts";
import type { RecordsService } from "../records";
import type { RecommendationsService } from "../recommendations";
import type { SignalsService } from "../signals";
import type { TimelineService } from "../timeline";

export class OpportunitiesService {
  constructor(
    private readonly repository: OpportunitiesRepository,
    private readonly records: RecordsService,
    private readonly signals: SignalsService,
    private readonly recommendations: RecommendationsService,
    private readonly timeline: TimelineService
  ) {}

  async recordCurrentEvaluation(
    input: Parameters<OpportunitiesRepository["recordCurrentEvaluation"]>[0]
  ): Promise<void> {
    await this.repository.recordCurrentEvaluation(input);
  }

  async ensureContribution(input: Parameters<OpportunitiesRepository["ensureContribution"]>[0]): Promise<void> {
    await this.repository.ensureContribution(input);
  }

  async listNow(filters?: NowOpportunityFilters): Promise<NowOpportunity[]> {
    return this.repository.listNow(filters);
  }

  async listNowView(filters?: NowOpportunityFilters): Promise<{ facets: NowOpportunityFacets; opportunities: NowOpportunity[] }> {
    const [opportunities, facets] = await Promise.all([this.repository.listNow(filters), this.repository.listNowFacets()]);
    return { facets, opportunities };
  }

  async findDetail(id: string): Promise<OpportunityDetail | null> {
    const opportunity = await this.repository.findOpportunity(id);
    if (!opportunity) return null;

    const evaluation = await this.repository.findCurrentEvaluation(id);
    const replyInNow = opportunity.queueState === "now" && opportunity.queueReason === "Customer reply";
    const [contacts, signals, recommendation, timeline, contributions, queueSignalId] = await Promise.all([
      this.records.listOpportunityContacts(id),
      this.signals.listOpportunitySignals(id),
      this.recommendations.findCurrent(id),
      this.timeline.listOpportunityEntries(id),
      evaluation ? this.repository.listEvaluationContributions(evaluation.id) : [],
      replyInNow ? this.repository.findQueueReplyId(id) : null
    ]);

    const citedSignalId = replyInNow ? queueSignalId
      : [...contributions].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]?.signalId;
    return {
      ...opportunity,
      nextActionSignalId: signals.find(signal => signal.id === citedSignalId)?.id ?? null,
      contacts,
      signals,
      evaluation: evaluation
        ? {
            id: evaluation.id,
            score: evaluation.score,
            band: evaluation.band,
            evaluatedAt: evaluation.evaluatedAt,
            failureAt: evaluation.failureAt,
            policyVersion: evaluation.policyVersion,
            status: evaluation.status,
            contributions
          }
        : null,
      recommendation,
      timeline: timeline.map((entry) => ({ ...entry, payload: JSON.parse(entry.payloadJson) }))
    };
  }
}
