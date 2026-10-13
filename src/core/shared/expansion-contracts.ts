/** Admitted native report, collaborator and fixed-publication statement contracts. */
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type Principal =
  | { kind: 'operator'; operatorId: string; sessionId: string }
  | { kind: 'service'; principalId: string; credentialId: string; custodianId: string }
  | { kind: 'guest'; principalId: string; grantId: string };
export interface Scope { tenantId: string; workspaceId: string }
export interface ActorContext extends Scope { principal: Principal; requestId: string; policyEpoch: number }
export interface NativeOperator { sessionId: string; operatorId: string; email: string; displayName: string }
export interface ResourceRef extends Scope { type: string; id: string; revision?: number }
export interface DependencyRef extends ResourceRef { revision: number; dataEpoch?: number }
export interface Page<T> { items: T[]; nextCursor: string | null; watermark: string; incomplete: boolean }
export type DomainErrorCode = 'validation' | 'conflict' | 'permission' | 'policy' | 'prerequisite' | 'transient' | 'uncertain';
export interface PageInput { cursor?: string; limit: number }
export interface AccessDecision { allowedFields: string[]; policyEpoch: number; dependencies: DependencyRef[] }
export interface AccessPort {
  resolveOperatorContext(operator: NativeOperator, workspaceId: string, requestId: string): Promise<ActorContext>;
  refreshContext(context: ActorContext): Promise<ActorContext>;
  authorize(context: ActorContext, operation: string, resource: ResourceRef, fields: readonly string[]): Promise<AccessDecision>;
  listWorkspaces(operator: NativeOperator): Promise<Array<Scope & { name: string }>>;
}
export interface AppVariables { operator: NativeOperator; actor: ActorContext }
export interface AppEnvironment { Variables: AppVariables }
export interface FxSnapshot { id: string; source: string; observedAt: string; from: string; to: string; rate: string; policyVersion: string }
export interface RecordProjection { ref: DependencyRef; kind: string; fields: Record<string, Json>; fieldVersions: Record<string, number> }
export interface GraphPort {
  getRecord(context: ActorContext, record: ResourceRef, fields: readonly string[]): Promise<RecordProjection>;
  searchRecords(context: ActorContext, input: PageInput & { types: string[]; query: string; fields: string[]; filters: Record<string, Json> }): Promise<Page<RecordProjection>>;
}
export interface DomainEvent {
  schemaVersion: 1; eventId: string; tenantId: string; workspaceId?: string;
  aggregateType: string; aggregateId: string; aggregateVersion: number; kind: string;
  occurredAt: string; receivedAt: string; actor: Principal; correlationId: string;
  causationId?: string; sourceRef?: string; payloadRef: string; accessEpoch: number;
}
export interface ReportMeasurement {
  periodKind: 'record-date' | 'current-population'; dateField: string | null;
  filters: Record<string, Json>; groupBy: string | null;
  missingPolicy: 'incomplete'; missingHandling: string;
  aggregation: string; valueField: string | null; unit: string; currency: string | null; valueDivisor: number;
}
export interface MetricSnapshot { id: string; definitionId: string; definitionVersion: number; scope: Scope; from: string; through: string; asOf: string; watermark: string; inputs: DependencyRef[]; values: Record<string, Json>; incompleteReasons: string[]; fxSnapshots: FxSnapshot[]; measurement?: ReportMeasurement }
export type SqlValue = null | string | number | ArrayBuffer;
export interface SqlStatement { sql: string; bindings: readonly SqlValue[] }
export interface DomainAudit { id: string; scope: Scope; actor: Principal; operation: string; resource: ResourceRef; occurredAt: string; detailsRef: string; correlationId: string }
export interface DomainEventStatementBuilder {
  buildDomainEventStatements(event: DomainEvent, audit: DomainAudit): readonly SqlStatement[];
}
