import type {ActorContext,DependencyRef,SqlStatement} from '../../shared/expansion-contracts';
import type {SalesPeriod} from './sales-period';
import type {NativePopulation} from './sales-population';
/** Report sources. Graph records are proven by set-based guards. REPORT-001's stage movements, notes, calls, meetings,
 * reviewed messages and their outcomes, tasks and signed bookings are read as one population per period and reach a viewer
 * only through the graph records they name; `entries` also proves a collaborator's RECORD-017 grant to a record's entries. */
export interface AnalyticsSourcePort {
 traceStatements(ctx:ActorContext,sources:readonly {ref:DependencyRef;fields:string[];entries?:boolean}[],mode?:'lineage'|'current'):Promise<SqlStatement[]>;
 salesPopulation(period:SalesPeriod):Promise<NativePopulation>;
}
