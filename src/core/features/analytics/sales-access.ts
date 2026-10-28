import type {ActorContext,DependencyRef,Json,SqlStatement} from '../../shared/expansion-contracts';
import {GraphRecords} from '../graph/repository';
import {graphReadPolicy} from '../access/query-policy';
import {isFullOperator,fullOperatorFence} from '../access/identity-class';
import {entriesGrantSql} from '../access/grant-entries';
import {AccessError} from '../access/errors';
import type {AnalyticsSourcePort} from './sources';
import type {GraphRef,SalesRow} from './sales-rows';

/** What one viewer may read now, resolved through graphReadPolicy and RECORD-023 entry grants. */
export interface ViewerAccess{
 full:boolean;operatorId:string;
 deals:Map<string,{ref:DependencyRef;values:Record<string,Json>;fields:Set<string>}>;
 records:Map<string,{ref:DependencyRef;name:string|null}>;
 entries:Set<string>;
 operatorNames:Map<string,string>|null;
}
const keyOf=(ref:GraphRef)=>`${ref.type}:${ref.id}`;

export async function viewerAccess(graph:GraphRecords,c:ActorContext,refs:GraphRef[]):Promise<ViewerAccess>{
 if(c.principal.kind!=='operator')throw new AccessError('permission','This surface requires a native session.');
 const operatorId=c.principal.operatorId,full=await isFullOperator(graph.db,operatorId),deals:ViewerAccess['deals']=new Map();
 // Every deal the viewer may read, with only the fields they may read: the same scanner and fences as every report.
 let cursor:string|undefined;
 do{const page=await graph.scanRecords(c,{types:['opportunity'],query:'',fields:[],filters:{},limit:1000,...(cursor?{cursor}:{})});if(page.incomplete)throw new AccessError('prerequisite','The deal population is incomplete.');for(const item of page.items)deals.set(item.ref.id,{ref:item.ref,values:item.fields,fields:new Set(Object.keys(item.fields))});cursor=page.nextCursor??undefined;}while(cursor);
 refs=[...refs,...[...deals.values()].flatMap(deal=>typeof deal.values.company_id==='string'?[{type:'company' as const,id:deal.values.company_id}]:[])];
 const records:ViewerAccess['records']=new Map(),policy=await graphReadPolicy(graph.access,c),name=policy.field("'name'");
 for(const [id,deal] of deals)records.set(`opportunity:${id}`,{ref:deal.ref,name:typeof deal.values.title==='string'&&deal.values.title.trim()?deal.values.title:null});
 for(const type of ['contact','company'] as const){
  const ids=[...new Set(refs.filter(ref=>ref.type===type).map(ref=>ref.id))];
  for(let offset=0;offset<ids.length;offset+=400){
   const rows=(await graph.read<{id:string;revision:number;data_epoch:number;name:string|null}>(c,`SELECT r.id,r.revision,r.data_epoch,CASE WHEN ${name.sql} THEN json_extract(r.fields_json,'$.name') END AS name FROM graph_records r WHERE r.tenant_id=? AND r.workspace_id=? AND r.kind=? AND r.retired_into_id IS NULL AND r.id IN(SELECT value FROM json_each(?)) AND ${policy.row.sql}`,[...name.bindings,c.tenantId,c.workspaceId,type,JSON.stringify(ids.slice(offset,offset+400)),...policy.row.bindings])).results;
   for(const row of rows)records.set(`${type}:${row.id}`,{ref:{tenantId:c.tenantId,workspaceId:c.workspaceId,type,id:row.id,revision:row.revision,dataEpoch:row.data_epoch},name:typeof row.name==='string'&&row.name.trim()?row.name:null});
  }
 }
 const entries=new Set<string>();
 if(!full){
  const candidates=[...new Set(refs.map(keyOf))].filter(key=>records.has(key));
  for(let offset=0;offset<candidates.length;offset+=400){
   const rows=(await graph.read<{kind:string;id:string}>(c,`SELECT r.kind,r.id FROM graph_records r WHERE r.tenant_id=? AND r.workspace_id=? AND r.retired_into_id IS NULL AND (r.kind||':'||r.id) IN(SELECT value FROM json_each(?)) AND ${entriesGrantSql('?','r.kind','r.id')}`,[c.tenantId,c.workspaceId,JSON.stringify(candidates.slice(offset,offset+400)),operatorId])).results;
   for(const row of rows)entries.add(`${row.kind}:${row.id}`);
  }
 }
 // Operator names need workspace settings access, as for every report: collaborators see per-person groups withheld.
 const operatorNames=full?new Map((await graph.db.prepare('SELECT id,display_name FROM operators').all<{id:string;display_name:string}>()).results.map(row=>[row.id,row.display_name])):null;
 if(full)graph.access.addDependencyFences(c,fullOperatorFence(c),'native-class');
 return {full,operatorId,deals,records,entries,operatorNames};
}

/** Rows the viewer may see now, with each fact kept only while its deal fields are readable. Unlinked rows, messages and
 * bookings need full access; nothing about a hidden row is kept, counted or labelled. */
export function applyAccess(access:ViewerAccess,rows:SalesRow[]):SalesRow[]{
 const visible:SalesRow[]=[];
 for(const row of rows){
  if((row.full||!row.refs.length)&&!access.full)continue;
  if(!row.refs.every(ref=>access.records.has(keyOf(ref))))continue;
  if(row.entries&&!access.full&&!access.entries.has(keyOf(row.entries)))continue;
  const fields=row.dealId?access.deals.get(row.dealId)?.fields:undefined;
  if(row.needs?.some(field=>!fields?.has(field)))continue;
  const facts={...row.facts};
  for(const [fact,needs] of Object.entries(row.governed??{}))if(needs.some(field=>!fields?.has(field)))delete facts[fact];
  visible.push({...row,facts});
 }
 return visible;
}

/** Set-based proof for the rows used: graph sources and fields (exact revisions when saving), and live entry grants. */
export async function accessProofs(sources:AnalyticsSourcePort,c:ActorContext,access:ViewerAccess,rows:SalesRow[],mode:'lineage'|'current'):Promise<SqlStatement[]>{
 const used=new Map<string,{ref:DependencyRef;fields:Set<string>;entries:boolean}>();
 for(const row of rows){
  for(const ref of row.refs){const record=access.records.get(keyOf(ref));if(!record)throw new AccessError('permission','A report source is unavailable to you.');const entry=used.get(keyOf(ref))??{ref:record.ref,fields:new Set<string>(),entries:false};if(row.entries&&!access.full&&keyOf(row.entries)===keyOf(ref))entry.entries=true;used.set(keyOf(ref),entry);}
  if(row.dealId&&used.has(`opportunity:${row.dealId}`)){const entry=used.get(`opportunity:${row.dealId}`)!;for(const field of row.needs??[])entry.fields.add(field);for(const [fact,needs] of Object.entries(row.governed??{}))if(Object.hasOwn(row.facts,fact))for(const field of needs)entry.fields.add(field);}
 }
 return sources.traceStatements(c,[...used.values()].map(entry=>({ref:entry.ref,fields:[...entry.fields],...(entry.entries?{entries:true}:{})})),mode);
}
