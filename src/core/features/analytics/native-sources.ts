import type {ActorContext,DependencyRef,SqlStatement} from '../../shared/expansion-contracts';
import {AccessService} from '../access/service';
import {graphReadPolicy} from '../access/query-policy';
import {entriesGrantSql} from '../access/grant-entries';
import {check} from '../access/errors';
import type {AnalyticsSourcePort} from './sources';
import {nativePopulation} from './sales-population';
import type {SalesPeriod} from './sales-period';
/** Set-based source guards avoid one network query per row in complete report populations. */
export class NativeAnalyticsSources implements AnalyticsSourcePort{
 constructor(readonly access:AccessService){}
 /** `lineage` proves the exact revisions a result was computed from; `current` proves that the
  * viewer may read each source and field now, as a saved result reopens after its sources changed. A source marked
  * `entries` also needs the viewer's live RECORD-017 grant to that record's notes, calls, meetings and tasks. */
 async traceStatements(c:ActorContext,sources:readonly {ref:DependencyRef;fields:string[];entries?:boolean}[],mode:'lineage'|'current'='lineage'):Promise<SqlStatement[]>{
  const policy=await graphReadPolicy(this.access,c),statements:SqlStatement[]=[];
  for(let offset=0;offset<sources.length;offset+=250){const chunk=sources.slice(offset,offset+250);for(const source of chunk){check(source.ref.workspaceId===c.workspaceId&&source.ref.tenantId===c.tenantId,'Source is outside workspace scope.');check(Number.isSafeInteger(source.ref.revision)&&source.ref.revision>0&&Number.isSafeInteger(source.ref.dataEpoch)&&source.ref.dataEpoch!>0,'Source revision and epoch must be explicit.');}
   const id=crypto.randomUUID(),field=policy.field('requested.value'),lineage=mode==='lineage'?" OR r.revision IS NOT json_extract(source.value,'$.ref.revision') OR r.data_epoch IS NOT json_extract(source.value,'$.ref.dataEpoch')":'';
   statements.push({sql:`INSERT INTO access_write_guards VALUES(?,CASE WHEN NOT EXISTS(SELECT 1 FROM json_each(?) source LEFT JOIN graph_records r ON r.id=json_extract(source.value,'$.ref.id') AND r.workspace_id=? AND r.tenant_id=? AND r.kind=json_extract(source.value,'$.ref.type') WHERE r.id IS NULL OR r.retired_into_id IS NOT NULL${lineage} OR NOT ${policy.row.sql} OR EXISTS(SELECT 1 FROM json_each(source.value,'$.fields') requested WHERE NOT ${field.sql})) THEN 1 ELSE 0 END)`,bindings:[id,JSON.stringify(chunk),c.workspaceId,c.tenantId,...policy.row.bindings,...field.bindings]},{sql:'DELETE FROM access_write_guards WHERE id=?',bindings:[id]});
   const granted=chunk.filter(source=>source.entries);
   if(granted.length){check(c.principal.kind==='operator','Entry grants belong to operators.');const guard=crypto.randomUUID();statements.push({sql:`INSERT INTO access_write_guards VALUES(?,CASE WHEN NOT EXISTS(SELECT 1 FROM json_each(?) source WHERE NOT ${entriesGrantSql('?',"json_extract(source.value,'$.ref.type')","json_extract(source.value,'$.ref.id')")}) THEN 1 ELSE 0 END)`,bindings:[guard,JSON.stringify(granted),c.principal.operatorId]},{sql:'DELETE FROM access_write_guards WHERE id=?',bindings:[guard]});}
  }
  return statements;
 }
 /** REPORT-001's native rows for one period, read as one statement whose result also fences a save. */
 salesPopulation(period:SalesPeriod){return nativePopulation(this.access.db,period);}
}
