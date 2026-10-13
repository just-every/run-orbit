import type {ActorContext,Json,MetricSnapshot} from '../../shared/expansion-contracts';
import {GraphRecords} from '../graph/repository';
import {domainEventStatements} from '../effects/event-statements';
import {AccessError} from '../access/errors';
import type {AnalyticsMetrics} from './metrics';

const recordTypes:Record<string,string>={company_id:'company',contact_id:'contact',opportunity_id:'opportunity'};

/** Page authorized name projections rather than issuing one query per group. */
export async function groupRecordNames(metrics:AnalyticsMetrics,context:ActorContext,groupBy:string|undefined,snapshot:MetricSnapshot){
 const labels=new Map<string,string>(),targets=new Map<string,string>(),typesById=new Map<string,Set<string>>();
 if(!groupBy||(!recordTypes[groupBy]&&groupBy!=='id'))return {labels,proofs:[]};
 for(const ref of snapshot.inputs){const types=typesById.get(ref.id)??new Set<string>();types.add(ref.type);typesById.set(ref.id,types);}
 for(const value of snapshot.values.groups as Record<string,Json>[]){
  const id=value.group;if(typeof id!=='string')continue;
  const types=groupBy==='id'?[...typesById.get(id)??[]]:[recordTypes[groupBy]];
  if(types.length!==1)throw new AccessError('prerequisite','The grouped record type is ambiguous.');
  targets.set(id,types[0]);
 }
 const graph=new GraphRecords(metrics.store.db,metrics.store.access,domainEventStatements),sources=[];
 for(const type of new Set(targets.values())){
  const field=type==='opportunity'?'title':'name';let cursor:string|undefined;
  do{
   const page=await graph.scanRecords(context,{types:[type],query:'',fields:[field],filters:{},limit:1000,...(cursor?{cursor}:{})});
   if(page.incomplete)throw new AccessError('prerequisite','Report group names are incomplete.');
   for(let record of page.items){
    if(targets.get(record.ref.id)!==type)continue;
    let fields=[field];
    if(type==='contact'&&!record.fields.name){fields=['email'];record=await graph.getRecord(context,record.ref,fields);}
    const name=record.fields[fields[0]];
    if(typeof name!=='string'||!name.trim())throw new AccessError('prerequisite','A report record name is unavailable.');
    labels.set(record.ref.id,name);sources.push({ref:record.ref,fields});
   }
   cursor=page.nextCursor??undefined;
  }while(cursor);
 }
 if(labels.size!==targets.size)throw new AccessError('permission','One or more grouped record names are unavailable to you.');
 if(!metrics.sources)throw new AccessError('prerequisite','Native source authority is required.');
 return {labels,proofs:await metrics.sources.traceStatements(context,sources)};
}
