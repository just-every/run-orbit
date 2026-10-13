import type {ActorContext,DependencyRef,SqlStatement} from '../../shared/expansion-contracts';
export interface AnalyticsSourcePort {traceStatements(ctx:ActorContext,sources:readonly {ref:DependencyRef;fields:string[]}[]):Promise<SqlStatement[]>}
