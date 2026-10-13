import { AuditRepository, AuditService } from "../features/audit";
import { DraftsRepository, DraftsService } from "../features/drafts";
import { HealthRepository, HealthService } from "../features/health";
import {
  OpportunitiesRepository,
  OpportunitiesService,
  createOpportunityRoutes
} from "../features/opportunities";
import { RecommendationsRepository, RecommendationsService } from "../features/recommendations";
import { RecordsRepository, RecordsService } from "../features/records";
import { SignalsRepository, SignalsService } from "../features/signals";
import { TimelineRepository, TimelineService } from "../features/timeline";
import { createWorkspaceRoutes, WorkspaceRepository, WorkspaceService } from "../features/workspace";
import { systemClock, type Clock } from "../platform/clock";

export function createDependencies(database: D1Database, clock: Clock = systemClock) {
  const workspace = new WorkspaceService(new WorkspaceRepository(database), clock);
  const records = new RecordsService(new RecordsRepository(database), clock);
  const signals = new SignalsService(new SignalsRepository(database), clock);
  const timeline = new TimelineService(new TimelineRepository(database));
  const recommendations = new RecommendationsService(new RecommendationsRepository(database), clock);
  const opportunities = new OpportunitiesService(
    new OpportunitiesRepository(database),
    records,
    signals,
    recommendations,
    timeline
  );
  const drafts = new DraftsService(new DraftsRepository(database), clock);
  const audit = new AuditService(new AuditRepository(database));

  return {
    audit,
    drafts,
    health: new HealthService(new HealthRepository(database)),
    opportunities,
    opportunityRoutes: createOpportunityRoutes(opportunities),
    recommendations,
    records,
    signals,
    timeline,
    workspace,
    workspaceRoutes: createWorkspaceRoutes(workspace)
  };
}
