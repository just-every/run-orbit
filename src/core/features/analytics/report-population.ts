import type {ActorContext,DependencyRef,Json,MetricSnapshot} from '../../shared/expansion-contracts';
import {GraphRecords} from '../graph/repository';
import {domainEventStatements} from '../effects/event-statements';
import {AccessError} from '../access/errors';
import type {AnalyticsMetrics,MetricDefinition} from './metrics';
import {reportMeasurement} from './measurement';
import {labelReportGroups} from './group-labels';
import {reportValue} from './report-format';
import {reportOwners,ownerKey,type ReportOwner} from './record-owners';
export async function nativeMetricPopulation(metrics:AnalyticsMetrics,c:ActorContext,id:string,version:number,definition:MetricDefinition,from:string,through:string){
 const fromInstant=Date.parse(from),throughInstant=Date.parse(through);if(!Number.isFinite(fromInstant)||!Number.isFinite(throughInstant)||fromInstant>=throughInstant)throw new AccessError('validation','Choose a valid report period.');
 const dateField=definition.dateField??'created_at';
 const fields=[...new Set([...definition.sourceFields,...Object.keys(definition.filters??{}),...[definition.valueField,definition.denominatorField,definition.groupBy,dateField].filter((f):f is string=>Boolean(f))])];
 const graph=new GraphRecords(metrics.store.db,metrics.store.access,domainEventStatements),refs:DependencyRef[]=[],groups=new Map<string,{n:number;sum:number;denominator:number;missing:number;records:{type:string;id:string}[]}>();const needsOwners=fields.includes('owner_id')&&definition.sourceTypes.some(type=>type==='contact'||type==='company'),sourceOwners:ReportOwner[]=[],ownerProofs=[] as import('../../shared/expansion-contracts').SqlStatement[];let cursor:string|undefined,pages=0,invalidDates=0;
 const scanFilters={...definition.filters};if(needsOwners)delete scanFilters.owner_id;
 do{const page=await graph.scanRecords(c,{types:definition.sourceTypes,query:'',fields,filters:scanFilters,limit:1000,...(cursor?{cursor}:{})});if(page.incomplete)throw new AccessError('prerequisite','CRM population is incomplete.');pages++;
  if(needsOwners){const ownership=await reportOwners(metrics,c,page.items.map(record=>record.ref));sourceOwners.push(...ownership.items);ownerProofs.push(...ownership.proofs);for(const record of page.items)if(record.ref.type==='contact'||record.ref.type==='company')record.fields.owner_id=ownership.owners.get(ownerKey(record.ref))!;}
  for(const record of page.items){if(needsOwners&&Object.hasOwn(definition.filters??{},'owner_id')&&record.fields.owner_id!==definition.filters!.owner_id)continue;const date=record.fields[dateField],instant=typeof date==='string'?Date.parse(date):NaN;if(!Number.isFinite(instant)){invalidDates++;continue;}if(instant<fromInstant||instant>=throughInstant)continue;refs.push(record.ref);const group=definition.groupBy?record.fields[definition.groupBy]??null:'All records',key=JSON.stringify(group),state=groups.get(key)??{n:0,sum:0,denominator:0,missing:0,records:[]};state.n++;state.records.push({type:record.ref.type,id:record.ref.id});
   const value=definition.valueField?record.fields[definition.valueField]:null,denominator=definition.denominatorField?record.fields[definition.denominatorField]:null;
   if(typeof value==='number')state.sum+=value;else if(definition.aggregation!=='count')state.missing++;
   if(typeof denominator==='number')state.denominator+=denominator;else if(definition.aggregation==='ratio')state.missing++;if(!Number.isFinite(state.sum)||!Number.isFinite(state.denominator))throw new AccessError('validation','The report calculation exceeds the supported numeric range.');groups.set(key,state);
  }cursor=page.nextCursor??undefined;
 }while(cursor);
 const rows=[...groups].sort(([a],[b])=>a.localeCompare(b)).map(([group,state])=>({group:JSON.parse(group) as Json,...state,value:definition.aggregation==='count'?state.n:definition.aggregation==='sum'?state.sum:definition.aggregation==='mean'?(state.n-state.missing?state.sum/(state.n-state.missing):null):(state.denominator?state.sum/state.denominator:null)}));
 const n=refs.length,sum=rows.reduce((n,row)=>n+row.sum,0),denominator=rows.reduce((n,row)=>n+row.denominator,0),missing=rows.reduce((n,row)=>n+row.missing,0);
 if(!Number.isFinite(sum)||!Number.isFinite(denominator))throw new AccessError('validation','The report calculation exceeds the supported numeric range.');
 const value=definition.aggregation==='count'?n:definition.aggregation==='sum'?sum:definition.aggregation==='mean'?(n-missing?sum/(n-missing):null):(denominator?sum/denominator:null);
 if(value!==null&&!Number.isFinite(value)||rows.some(row=>row.value!==null&&!Number.isFinite(row.value)))throw new AccessError('validation','The report calculation exceeds the supported numeric range.');
 const included=new Set(refs.map(ownerKey));
 const snapshot:MetricSnapshot&{sourceLineageVersion:1;sourceFields:string[];sourceOwners?:ReportOwner[]}={sourceLineageVersion:1,sourceFields:fields,...(needsOwners?{sourceOwners:sourceOwners.filter(owner=>included.has(ownerKey(owner)))}:{}),id:crypto.randomUUID(),definitionId:id,definitionVersion:version,scope:{tenantId:c.tenantId,workspaceId:c.workspaceId},from,through,asOf:new Date().toISOString(),watermark:'native-transaction-fenced',inputs:refs,values:{value,n,denominator,missing,groups:rows,unit:definition.unit,pages,invalidDates,formula:definition.aggregation==='mean'?'sum / non-null numeric values':definition.aggregation==='ratio'?'sum / sum of denominators':definition.aggregation},incompleteReasons:[...(invalidDates?[`${invalidDates} native records have an unavailable date and are excluded from this period.`]:[]),...(missing?['Null or nonnumeric values are disclosed as missing.']:[]),...(!n?['No native records matched the selected period and filters.']:[]),...(definition.aggregation==='ratio'&&!denominator?['The denominator is zero; the ratio has no value.']:[])],fxSnapshots:[]};
 const currency=await metrics.store.db.prepare("SELECT currency FROM workspace_settings WHERE id='workspace'").first<{currency:string}>();
 if(!currency)throw new AccessError('prerequisite','Workspace currency is unavailable.');
 snapshot.measurement=reportMeasurement(definition,currency.currency);
 snapshot.values.unit=snapshot.measurement.unit;
 snapshot.values.formattedValue=reportValue(snapshot);
 return{snapshot,proofs:[...ownerProofs,...await metrics.sourceProofs(c,{...definition,sourceFields:fields},refs),...await labelReportGroups(metrics,c,definition,snapshot),...metrics.store.guard("EXISTS(SELECT 1 FROM workspace_settings WHERE id='workspace' AND currency=?)",[currency.currency])]};
}
