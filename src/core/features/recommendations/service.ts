import type { Clock } from "../../platform/clock";
import { toIsoString } from "../../shared/time";

import { RecommendationsRepository } from "./repository";

export class RecommendationsService {
  constructor(
    private readonly repository: RecommendationsRepository,
    private readonly clock: Clock
  ) {}

  async ensureRecommendation(
    input: Omit<Parameters<RecommendationsRepository["ensureRecommendation"]>[0], "now">
  ): Promise<void> {
    await this.repository.ensureRecommendation({ ...input, now: toIsoString(this.clock.now()) });
  }

  async ensureEvidence(input: Parameters<RecommendationsRepository["ensureEvidence"]>[0]): Promise<void> {
    await this.repository.ensureEvidence(input);
  }

  async findCurrent(opportunityId: string) {
    const recommendation = await this.repository.findCurrent(opportunityId);
    if (!recommendation) return null;

    return {
      id: recommendation.id,
      actionType: recommendation.actionType,
      explanation: recommendation.explanation,
      policyVersion: recommendation.policyVersion,
      evidenceSignalIds: await this.repository.listEvidenceSignalIds(recommendation.id)
    };
  }
}
