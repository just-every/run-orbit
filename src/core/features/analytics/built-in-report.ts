import {snapshotStatements} from './snapshot-storage';
import {reportMeasurement} from './measurement';
import type { ActorContext, DependencyRef, MetricSnapshot, GraphPort, SqlStatement } from '../../shared/expansion-contracts';
import { AccessError } from '../access/errors';
import { sha256 } from '../access/mutations';
import type { AnalyticsMetrics, MetricDefinition } from './metrics';

export const OPEN_OPPORTUNITIES_REPORT_ID = 'open-opportunities';
export const OPEN_OPPORTUNITIES_DEFINITION: MetricDefinition = {
  name: 'Open opportunities',
  description: 'Count open opportunities returned by the current authorized CRM search. Closed, won, and lost opportunities are outside this report.',
  aggregation: 'count',
  unit: 'open opportunities',
  sourceTypes: ['opportunity'],
  sourceOperation: 'graph.read',
  sourceFields: ['lifecycle'],
  currency: null,
  missingPolicy: 'incomplete',
  lateArrival: 'recompute',
  attributionModel: 'none',
  attributionWindowDays: 30,
};

export interface BuiltInReportPage {
  pages: number;
  records: number;
  startedAt: string;
  completedAt: string;
}

export interface BuiltInReportSnapshot extends MetricSnapshot {
  sourceLineageVersion: 1;
  reviewHash: string;
  population: BuiltInReportPage;
}

function sameDefinition(value: unknown): boolean {
  return JSON.stringify(value) === JSON.stringify(OPEN_OPPORTUNITIES_DEFINITION);
}

export async function ensureOpenOpportunitiesDefinition(metrics: AnalyticsMetrics, context: ActorContext) {
  const items = await metrics.list(context);
  const existing = (items as Array<{ id: string; version: number; body_json: string }>).filter(item => item.id === OPEN_OPPORTUNITIES_REPORT_ID);
  const exact = existing.find(item => sameDefinition(JSON.parse(item.body_json)));
  if (exact) return { id: exact.id, version: exact.version, created: false };
  if (existing.length) throw new AccessError('conflict', 'The built-in report identifier is already used by a different definition. Choose a different report name or review that definition.');
  const result = await metrics.define(context, OPEN_OPPORTUNITIES_REPORT_ID, 1, OPEN_OPPORTUNITIES_DEFINITION);
  return { id: result.id, version: result.version, created: true };
}

async function assertDefinition(metrics: AnalyticsMetrics, context: ActorContext, version: number) {
  const definition = await metrics.definition(context, OPEN_OPPORTUNITIES_REPORT_ID, version);
  if (!sameDefinition(definition)) throw new AccessError('conflict', 'The saved definition no longer matches the built-in report. Refresh its definition before continuing.');
  return definition;
}

async function currentOpenOpportunityInputs(context: ActorContext, graph: Pick<GraphPort,'searchRecords'>) {
  const startedAt = new Date().toISOString();
  const refs: DependencyRef[] = [];
  let cursor: string | undefined;
  let pages = 0;
  const seen = new Set<string>();
  do {
    const page = await graph.searchRecords(context, {
      types: ['opportunity'],
      query: '',
      fields: ['lifecycle'],
      filters: { lifecycle: 'open' },
      limit: 100,
      ...(cursor ? { cursor } : {}),
    });
    pages += 1;
    if (page.incomplete) throw new AccessError('prerequisite', 'The CRM did not confirm a complete page. No report preview was produced.');
    if (page.watermark !== String(context.policyEpoch)) throw new AccessError('conflict', 'Workspace access changed while the report population was loading. Refresh and preview again.');
    refs.push(...page.items.map(item => item.ref));
    cursor = page.nextCursor ?? undefined;
    if (cursor && seen.has(cursor)) throw new AccessError('conflict', 'The CRM returned a repeated page cursor. Refresh and preview again.');
    if (cursor) seen.add(cursor);
  } while (cursor);
  return { refs, population: { pages, records: refs.length, startedAt, completedAt: new Date().toISOString() } };
}

async function sourceProofs(metrics: AnalyticsMetrics, context: ActorContext, definition: MetricDefinition, refs: DependencyRef[]): Promise<SqlStatement[]> {
  return metrics.sourceProofs(context, definition, refs);
}

function reviewHash(context: ActorContext, version: number, refs: DependencyRef[], population: BuiltInReportPage) {
  return sha256(JSON.stringify({
    tenantId: context.tenantId,
    workspaceId: context.workspaceId,
    principal: context.principal,
    policyEpoch: context.policyEpoch,
    definitionId: OPEN_OPPORTUNITIES_REPORT_ID,
    definitionVersion: version,
    refs: refs.map(ref => [ref.type, ref.id, ref.revision, ref.dataEpoch ?? null]),
    population: { pages: population.pages, records: population.records },
  }));
}

export async function previewOpenOpportunities(metrics: AnalyticsMetrics, graph: Pick<GraphPort,'searchRecords'>, context: ActorContext, version: number): Promise<BuiltInReportSnapshot> {
  context = await metrics.permit(context, 'analytics.read', OPEN_OPPORTUNITIES_REPORT_ID);
  const definition = await assertDefinition(metrics, context, version);
  const { refs, population } = await currentOpenOpportunityInputs(context, graph);
  const proofs = await sourceProofs(metrics, context, definition, refs);
  const snapshot: BuiltInReportSnapshot = {
    sourceLineageVersion: 1,
    id: `preview-${crypto.randomUUID()}`,
    definitionId: OPEN_OPPORTUNITIES_REPORT_ID,
    definitionVersion: version,
    scope: { tenantId: context.tenantId, workspaceId: context.workspaceId },
    from: population.startedAt,
    through: population.completedAt,
    asOf: population.completedAt,
    watermark: 'native-transaction-fenced',
    inputs: refs,
    values: {
      value: refs.length,
      n: refs.length,
      denominator: null,
      unit: OPEN_OPPORTUNITIES_DEFINITION.unit,
    },
    incompleteReasons: [
      ...(refs.length ? [] : ['No open opportunities were returned by the current authorized CRM search.']),
    ],
    fxSnapshots: [],
    measurement: reportMeasurement(definition,null,true),
    reviewHash: await reviewHash(context, version, refs, population),
    population,
  };
  await metrics.checkSources(context, proofs);
  return snapshot;
}

export async function saveOpenOpportunities(metrics: AnalyticsMetrics, graph: Pick<GraphPort,'searchRecords'>, context: ActorContext, version: number, expectedReviewHash: string): Promise<BuiltInReportSnapshot> {
  context = await metrics.permit(context, 'analytics.read', OPEN_OPPORTUNITIES_REPORT_ID);
  await metrics.store.access.authorize(context, 'analytics.snapshot', { ...context, type: 'analytics', id: OPEN_OPPORTUNITIES_REPORT_ID }, []);
  const definition = await assertDefinition(metrics, context, version);
  const { refs, population } = await currentOpenOpportunityInputs(context, graph);
  const hash = await reviewHash(context, version, refs, population);
  if (hash !== expectedReviewHash) throw new AccessError('conflict', 'The permitted opportunity population changed after preview. Review a fresh preview before saving.');
  const proofs = await sourceProofs(metrics, context, definition, refs);
  const id = crypto.randomUUID();
  const snapshot: BuiltInReportSnapshot = {
    sourceLineageVersion: 1,
    id,
    definitionId: OPEN_OPPORTUNITIES_REPORT_ID,
    definitionVersion: version,
    scope: { tenantId: context.tenantId, workspaceId: context.workspaceId },
    from: population.startedAt,
    through: population.completedAt,
    asOf: population.completedAt,
    watermark: 'native-transaction-fenced',
    inputs: refs,
    values: {
      value: refs.length,
      n: refs.length,
      denominator: null,
      unit: OPEN_OPPORTUNITIES_DEFINITION.unit,
    },
    incompleteReasons: [
      ...(refs.length ? [] : ['No open opportunities were returned by the current authorized CRM search.']),
    ],
    fxSnapshots: [],
    measurement: reportMeasurement(definition,null,true),
    reviewHash: hash,
    population,
  };
  await metrics.store.commit(context, 'analytics.snapshot', id, 1, [
    ...proofs,
    ...metrics.store.guard('EXISTS(SELECT 1 FROM analytics_definitions WHERE tenant_id=? AND workspace_id=? AND id=? AND version=? AND body_json=?)', [context.tenantId, context.workspaceId, OPEN_OPPORTUNITIES_REPORT_ID, version, JSON.stringify(definition)]),
    ...snapshotStatements(snapshot),
  ]);
  return snapshot;
}
