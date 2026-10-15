import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import {customerSignalSql} from '../signals/test-events';
import { drizzle } from "drizzle-orm/d1";

import type { NowOpportunityFacets, NowOpportunityFilters } from "./contracts";

import {
  companies,
  evaluationContributions,
  evaluations,
  operators,
  opportunities,
  pipelineStages,
  signalSources,
  signals
} from "../../platform/schema";

export class OpportunitiesRepository {
  constructor(private readonly binding: D1Database) {}

  async recordCurrentEvaluation(input: {
    id: string;
    opportunityId: string;
    score: number;
    band: "low" | "medium" | "high";
    evaluatedAt: string;
    policyVersion: string;
    status: "current" | "stale" | "failed";
    failureAt: string | null;
    now: string;
  }): Promise<void> {
    await this.binding.batch([
      this.binding
        .prepare(
          "UPDATE evaluations SET status = 'stale' WHERE opportunity_id = ? AND status = 'current' AND id != ? AND NOT EXISTS (SELECT 1 FROM evaluations WHERE id = ?)"
        )
        .bind(input.opportunityId, input.id, input.id),
      this.binding
        .prepare(
          "INSERT OR IGNORE INTO evaluations (id, opportunity_id, score, band, evaluated_at, policy_version, status, failure_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(
          input.id,
          input.opportunityId,
          input.score,
          input.band,
          input.evaluatedAt,
          input.policyVersion,
          input.status,
          input.failureAt,
          input.now
        )
    ]);
  }

  async ensureContribution(input: {
    id: string;
    evaluationId: string;
    signalId: string;
    contribution: number;
    now: string;
  }): Promise<void> {
    await drizzle(this.binding)
      .insert(evaluationContributions)
      .values({ ...input, createdAt: input.now })
      .onConflictDoNothing();
  }

  async listNow(filters: NowOpportunityFilters = {}) {
    const conditions = [eq(opportunities.lifecycle, "open"), eq(opportunities.queueState, "now")];
    if (filters.ownerId === "unassigned") conditions.push(isNull(opportunities.ownerId));
    if (filters.ownerId && filters.ownerId !== "unassigned") conditions.push(eq(opportunities.ownerId, filters.ownerId));
    if (filters.stageId) conditions.push(eq(opportunities.stageId, filters.stageId));
    if (filters.band) conditions.push(eq(opportunities.band, filters.band));

    return drizzle(this.binding)
      .select({
        id: opportunities.id,
        title: opportunities.title,
        lifecycle: opportunities.lifecycle,
        stageId: opportunities.stageId,
        stage: pipelineStages.name,
        ownerId: opportunities.ownerId,
        ownerName: operators.displayName,
        companyName: companies.name,
        score: opportunities.score,
        band: opportunities.band,
        queueState: opportunities.queueState,
        queueReason: opportunities.queueReason,
        lastContributingSignalAt: opportunities.lastContributingSignalAt
      })
      .from(opportunities)
      .innerJoin(pipelineStages, eq(opportunities.stageId, pipelineStages.id))
      .leftJoin(operators, eq(opportunities.ownerId, operators.id))
      .leftJoin(companies, eq(opportunities.companyId, companies.id))
      .where(and(...conditions))
      .orderBy(desc(opportunities.score), desc(opportunities.lastContributingSignalAt), asc(opportunities.id))
      .limit(50);
  }

  async listNowFacets(): Promise<NowOpportunityFacets> {
    const currentNow = and(eq(opportunities.lifecycle, "open"), eq(opportunities.queueState, "now"));
    const [owners, stages, bands] = await Promise.all([
      drizzle(this.binding)
        .select({ id: opportunities.ownerId, name: operators.displayName })
        .from(opportunities)
        .leftJoin(operators, eq(opportunities.ownerId, operators.id))
        .where(currentNow)
        .groupBy(opportunities.ownerId, operators.displayName)
        .orderBy(asc(operators.displayName), asc(opportunities.ownerId)),
      drizzle(this.binding)
        .select({ id: pipelineStages.id, name: pipelineStages.name })
        .from(opportunities)
        .innerJoin(pipelineStages, eq(opportunities.stageId, pipelineStages.id))
        .where(currentNow)
        .groupBy(pipelineStages.id, pipelineStages.name)
        .orderBy(asc(pipelineStages.name)),
      drizzle(this.binding)
        .select({ band: opportunities.band })
        .from(opportunities)
        .where(currentNow)
        .groupBy(opportunities.band)
        .orderBy(asc(opportunities.band))
    ]);

    return { bands: bands.map((item) => item.band), owners, stages };
  }

  async findOpportunity(id: string) {
    return (
      await drizzle(this.binding)
        .select({
          id: opportunities.id,
          title: opportunities.title,
          lifecycle: opportunities.lifecycle,
          stageId: opportunities.stageId,
          stage: pipelineStages.name,
          ownerId: opportunities.ownerId,
          ownerName: operators.displayName,
          companyId: opportunities.companyId,
          companyName: companies.name,
          valueCents: opportunities.valueCents,
          expectedCloseAt: opportunities.expectedCloseAt,
          score: opportunities.score,
          band: opportunities.band,
          queueState: opportunities.queueState,
          queueReason: opportunities.queueReason,
          lastContributingSignalAt: opportunities.lastContributingSignalAt
        })
        .from(opportunities)
        .innerJoin(pipelineStages, eq(opportunities.stageId, pipelineStages.id))
        .leftJoin(operators, eq(opportunities.ownerId, operators.id))
        .leftJoin(companies, eq(opportunities.companyId, companies.id))
        .where(eq(opportunities.id, id))
        .limit(1)
    )[0];
  }

  async findCurrentEvaluation(opportunityId: string) {
    return (
      await drizzle(this.binding)
        .select()
        .from(evaluations)
        .where(and(eq(evaluations.opportunityId, opportunityId), eq(evaluations.status, "current")))
        .orderBy(desc(evaluations.evaluatedAt), asc(evaluations.id))
        .limit(1)
    )[0];
  }

  async listEvaluationContributions(evaluationId: string) {
    return drizzle(this.binding)
      .select({
        signalId: signals.id,
        signalType: signals.type,
        occurredAt: signals.occurredAt,
        confidence: sql<string>`CASE WHEN ${sql.raw(customerSignalSql('signals'))} THEN ${signals.confidence} ELSE 'test' END`,
        source: signalSources.name,
        contribution: evaluationContributions.contribution
      })
      .from(evaluationContributions)
      .innerJoin(signals, eq(evaluationContributions.signalId, signals.id))
      .innerJoin(signalSources, eq(signals.sourceId, signalSources.id))
      .where(eq(evaluationContributions.evaluationId, evaluationId))
      .orderBy(desc(evaluationContributions.contribution), asc(signals.id));
  }
}
