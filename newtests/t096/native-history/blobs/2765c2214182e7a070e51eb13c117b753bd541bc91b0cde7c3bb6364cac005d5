import { and, asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { recommendationEvidence, recommendations } from "../../platform/schema";

export class RecommendationsRepository {
  constructor(private readonly binding: D1Database) {}

  async ensureRecommendation(input: {
    id: string;
    opportunityId: string;
    actionType: "email_follow_up" | "manual_action";
    explanation: string | null;
    policyVersion: string;
    isCurrent: boolean;
    supersededAt: string | null;
    now: string;
  }): Promise<void> {
    await drizzle(this.binding)
      .insert(recommendations)
      .values({ ...input, createdAt: input.now, updatedAt: input.now })
      .onConflictDoNothing();
  }

  async ensureEvidence(input: { recommendationId: string; signalId: string }): Promise<void> {
    await drizzle(this.binding).insert(recommendationEvidence).values(input).onConflictDoNothing();
  }

  async findCurrent(opportunityId: string) {
    return (
      await drizzle(this.binding)
        .select()
        .from(recommendations)
        .where(and(eq(recommendations.opportunityId, opportunityId), eq(recommendations.isCurrent, true)))
        .limit(1)
    )[0];
  }

  async listEvidenceSignalIds(recommendationId: string): Promise<string[]> {
    const rows = await drizzle(this.binding)
      .select({ signalId: recommendationEvidence.signalId })
      .from(recommendationEvidence)
      .where(eq(recommendationEvidence.recommendationId, recommendationId))
      .orderBy(asc(recommendationEvidence.signalId));

    return rows.map((row) => row.signalId);
  }
}
