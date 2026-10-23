import {measureCatalog} from '../analytics/sales-definition';
import {systemClock,type Clock} from '../../platform/clock';
import type {ActorContext} from '../../shared/expansion-contracts';
import {AccessError} from '../access/errors';
import {isFullOperator} from '../access/identity-class';
import type {AnalyticsMetrics} from '../analytics/metrics';
import type {SalesView} from '../analytics/sales-view';
import type {ForecastSnapshot} from '../forecast/types';
import {salesPeriod,salesDateRange,monthKey} from '../analytics/sales-period';
import {ForecastRepository} from '../forecast/repository';
import {dashboardSave,dashboardShare,type DashboardDefinition,type DashboardFilters,type DashboardShare,type DashboardTile} from './schema';

export type TileResult={id:string;width:number;height:number;status:'loading';name:string;version:number|string;period:string}|{id:string;width:number;height:number;status:'unavailable'}|{id:string;width:number;height:number;status:'error';message:string;name:string;version:string|number;period:string}|{id:string;width:number;height:number;status:'ready';tile:DashboardTile;notes:string[];report:SalesView|null;forecast:ForecastSnapshot|null};
type Head={owner_id:string|null;version:number;sharing_version:number;authority:number;body_json:string;share_json:string};
const actor=(c:ActorContext)=>c.principal.kind==='operator'?c.principal.operatorId:'';
const unavailable=(tile:DashboardTile):TileResult=>({id:tile.id,width:tile.width,height:1,status:'unavailable'});
/** Dashboard custody holds definitions and pointers, never a second copy of a report population. */
export class Dashboards{
 constructor(readonly metrics:AnalyticsMetrics,readonly clock:Clock=systemClock){}
 get store(){return this.metrics.store;}get db(){return this.store.db;}
 private async admin(c:ActorContext){return Boolean(await this.db.prepare("SELECT 1 FROM operators WHERE id=? AND setup_owner=1 AND status='active'").bind(actor(c)).first());}
 async head(c:ActorContext,id:string){
  c=await this.metrics.permit(c,'analytics.read');
  const h=await this.db.prepare('SELECT d.*,v.body_json,s.body_json AS share_json FROM sales_dashboards d JOIN sales_dashboard_versions v ON v.workspace_id=d.workspace_id AND v.dashboard_id=d.id AND v.version=d.version JOIN sales_dashboard_shares s ON s.workspace_id=d.workspace_id AND s.dashboard_id=d.id AND s.version=d.sharing_version WHERE d.workspace_id=? AND d.id=?').bind(c.workspaceId,id).first<Head>();
  if(!h)throw new AccessError('permission','Dashboard unavailable.');
  const share=JSON.parse(h.share_json) as DashboardShare,manage=h.owner_id===actor(c)||await this.admin(c),grant=share.grants.find(g=>g.operatorId===actor(c));
  if(!manage&&(!h.authority||!(share.audience==='workspace'||share.audience==='named'&&grant)))throw new AccessError('permission','Dashboard unavailable.');
  await this.metrics.checkSources(c,this.store.guard('EXISTS(SELECT 1 FROM sales_dashboards WHERE workspace_id=? AND id=? AND version=? AND sharing_version=? AND authority=?)',[c.workspaceId,id,h.version,h.sharing_version,h.authority]));
  return {c,h,share,manage,edit:manage||Boolean(h.authority&&share.audience==='named'&&grant?.access==='edit'),definition:JSON.parse(h.body_json) as DashboardDefinition};
 }
 fence(c:ActorContext,id:string,h:Head){return this.store.guard('EXISTS(SELECT 1 FROM sales_dashboards WHERE workspace_id=? AND id=? AND version=? AND sharing_version=? AND authority=?)',[c.workspaceId,id,h.version,h.sharing_version,h.authority]);}
 async adminChannels(c:ActorContext){if(!await this.admin(c))return [];return (await this.db.prepare("SELECT c.id,c.name FROM slack_channels c WHERE c.enabled=1 AND EXISTS(SELECT 1 FROM json_each(c.events_json) WHERE value='dashboard') AND EXISTS(SELECT 1 FROM slack_installation WHERE state='connected') ORDER BY c.name").all<{id:string;name:string}>()).results;}
 async list(c:ActorContext){
  c=await this.metrics.permit(c,'analytics.read');
  const ids=(await this.db.prepare('SELECT id FROM sales_dashboards WHERE workspace_id=? ORDER BY id').bind(c.workspaceId).all<{id:string}>()).results;
  const defaultId=await this.db.prepare('SELECT dashboard_id FROM sales_dashboard_defaults WHERE workspace_id=? AND operator_id=?').bind(c.workspaceId,actor(c)).first<string>('dashboard_id');
  const items=[];for(const {id} of ids){try{const d=await this.head(c,id);items.push({id,name:d.definition.name,version:d.h.version,isDefault:id===defaultId});}catch(e){if(!(e instanceof AccessError&&e.code==='permission'))throw e;}}
  const canDefine=await this.store.access.authorize(c,'analytics.define',{...c,type:'analytics',id:'*'},[]).then(()=>true,()=>false);
  return {items:items.sort((a,b)=>Number(b.isDefault)-Number(a.isDefault)),canDefine};
 }
 async save(c:ActorContext,id:string,input:unknown){
  const {version,definition}=dashboardSave.parse(input);let owner=actor(c),authorization:ReturnType<Dashboards['fence']>=[];
  if(version===0)c=await this.metrics.permit(c,'analytics.define');
  else{const current=await this.head(c,id);c=current.c;if(!current.edit)throw new AccessError('permission','Dashboard editing is not permitted.');owner=current.h.owner_id??actor(c);authorization=this.fence(current.c,id,current.h);if(current.h.version!==version)throw new AccessError('conflict','Dashboard changed. Reload before saving.');}
  const now=new Date().toISOString(),next=version+1,share={version:1,audience:'private',grants:[]} as DashboardShare;
  await this.store.commit(c,version===0?'analytics.define':'analytics.read',id,next,[...authorization,...this.store.guard('COALESCE((SELECT version FROM sales_dashboards WHERE workspace_id=? AND id=?),0)=?',[c.workspaceId,id,version]),{sql:'INSERT INTO sales_dashboard_versions VALUES(?,?,?,?,?,?)',bindings:[c.workspaceId,id,next,JSON.stringify(definition),actor(c),now]},...(version===0?[{sql:'INSERT INTO sales_dashboards VALUES(?,?,?,1,1,1)',bindings:[c.workspaceId,id,owner]},{sql:'INSERT INTO sales_dashboard_shares VALUES(?,?,1,?,?,?)',bindings:[c.workspaceId,id,JSON.stringify(share),actor(c),now]}]:[{sql:'UPDATE sales_dashboards SET version=? WHERE workspace_id=? AND id=?',bindings:[next,c.workspaceId,id]}])]);
  return {id,version:next};
 }
 async sharing(c:ActorContext,id:string,input?:unknown):Promise<DashboardShare&{members:{id:string;name:string;email:string;collaborator:number}[];changedAt:string;changedBy:string;timezone:string}>{
  const current=await this.head(c,id);if(!current.manage)throw new AccessError('permission','Only the dashboard owner or installation owner changes sharing.');
  if(input!==undefined){const parsed=dashboardShare.parse(input);if(parsed.version!==current.h.sharing_version)throw new AccessError('conflict','Sharing changed. Reload before saving.');const members=await this.metrics.sales.shares.members(current.c);if(parsed.grants.some(g=>!members.some(m=>m.id===g.operatorId)))throw new AccessError('validation','Choose active people only.');
   const share={...parsed,version:parsed.version+1};await this.store.commit(current.c,'analytics.read',id,share.version,[...this.fence(current.c,id,current.h),...this.store.guard('EXISTS(SELECT 1 FROM sales_dashboards WHERE workspace_id=? AND id=? AND sharing_version=?)',[c.workspaceId,id,parsed.version]),{sql:'INSERT INTO sales_dashboard_shares VALUES(?,?,?,?,?,?)',bindings:[c.workspaceId,id,share.version,JSON.stringify(share),actor(c),new Date().toISOString()]},{sql:'UPDATE sales_dashboards SET sharing_version=?,authority=1 WHERE workspace_id=? AND id=?',bindings:[share.version,c.workspaceId,id]}]);return this.sharing(c,id);
  }
  const changed=await this.db.prepare("SELECT s.created_at AS changedAt,o.display_name AS changedBy,w.timezone FROM sales_dashboard_shares s LEFT JOIN operators o ON o.id=s.actor_id CROSS JOIN workspace_settings w WHERE s.workspace_id=? AND s.dashboard_id=? AND s.version=?").bind(c.workspaceId,id,current.h.sharing_version).first<{changedAt:string;changedBy:string|null;timezone:string}>();
  return {...current.share,members:await this.metrics.sales.shares.members(current.c),changedAt:changed!.changedAt,changedBy:changed!.changedBy??'Former operator',timezone:changed!.timezone};
 }
 async setDefault(c:ActorContext,id:string,enabled:boolean){const current=await this.head(c,id);await this.store.commit(current.c,'analytics.read',id,current.h.version,[...this.fence(current.c,id,current.h),...(enabled?[{sql:'INSERT INTO sales_dashboard_defaults VALUES(?,?,?) ON CONFLICT(workspace_id,operator_id) DO UPDATE SET dashboard_id=excluded.dashboard_id',bindings:[c.workspaceId,actor(c),id]}]:[{sql:'DELETE FROM sales_dashboard_defaults WHERE workspace_id=? AND operator_id=? AND dashboard_id=?',bindings:[c.workspaceId,actor(c),id]}])]);return {default:enabled};}
 async tile(c:ActorContext,tile:DashboardTile,filters:DashboardFilters):Promise<TileResult>{
  if(tile.withdrawn)return unavailable(tile);
  let sourceReadable=false,sourceVersion:string|number=tile.version;
  try{
   if(tile.source==='forecast'){
    const repository=new ForecastRepository(this.db),saved=await repository.snapshot(c,tile.sourceId);
    // Forecast snapshots have their own erasure index and require a full operator. Live keeps the saved view's period.
    const settings=await this.db.prepare("SELECT timezone FROM workspace_settings WHERE id='workspace'").first<string>('timezone'),period=filters.dateRange?salesDateRange(filters.dateRange.from,filters.dateRange.through,settings!):salesPeriod(filters.from,filters.through,settings!);
    const forecast=tile.version==='live'?{...saved,from:period.from.slice(0,10),through:period.through.slice(0,10),result:(await repository.preview(c,{from:period.from.slice(0,10),through:period.through.slice(0,10)},filters)).result}:saved;
    const notes=tile.version==='live'?[]:['Dashboard filters not applied: this tile shows the forecast view’s saved result.'];
    return {id:tile.id,width:tile.width,height:tile.height,status:'ready',tile,notes,report:null,forecast};
   }
   await this.metrics.sales.shares.assertVisible(c,tile.sourceId);
   const row=await this.db.prepare('SELECT max(version) AS version FROM analytics_definitions WHERE workspace_id=? AND id=?').bind(c.workspaceId,tile.sourceId).first<{version:number|null}>();
   if(!row?.version)return unavailable(tile);
   const version=tile.version==='live'?row.version:tile.version;
   const definition=await this.metrics.sales.definition(c,tile.sourceId,version);sourceReadable=true;sourceVersion=version;if(!definition.measures.includes(tile.measure))return unavailable(tile);
   const notes:string[]=[],measuredNow=tile.measure==='pipeline'||tile.measure==='stage_age';
   let report:SalesView;
   if(tile.snapshotId){const result=await this.metrics.read(c,tile.snapshotId).catch(error=>{if(error instanceof AccessError&&error.code==='validation')return null;throw error;});if(!result)return unavailable(tile);if(!('kind' in result&&result.kind==='sales')||result.definitionId!==tile.sourceId||result.definitionVersion!==version)return unavailable(tile);report=result as SalesView;notes.push(`Dashboard filters not applied: this tile shows the result saved ${new Intl.DateTimeFormat('en-US',{timeZone:report.timezone,month:'short',day:'numeric',year:'numeric'}).format(new Date(report.asOf))}.`);}
   else{
    let field=filters.field?{...filters.field,name:Object.hasOwn(tile.bindings,filters.field.name)?tile.bindings[filters.field.name]!:filters.field.name}:null;if(field&&tile.measure==='bookings'){notes.push(`${field.name} filter not applied: this report's records have no ${field.name} field.`);field=null;}
    if(measuredNow)notes.push(tile.measure==='pipeline'?'Date range not applied: open pipeline is measured when computed, not over a period.':'Date range not applied: stage age is measured when computed.');
    if(tile.measure==='bookings'&&filters.ownerIds.length)notes.push('Owner filter not applied: bookings are not filtered by rep.');
    report=await this.metrics.sales.preview(c,tile.sourceId,version,filters.from,filters.through,{...filters,field});if(field)report.filters.notes.push(`${filters.field!.name}: ${field.value}${field.name!==filters.field!.name?` (report field ${field.name})`:''}.`);
   }
   report={...report,sections:report.sections.filter(s=>s.measure===tile.measure).map(section=>section.measure==='revenue'?{...section,months:section.months.filter(month=>month.key<=monthKey(Date.parse(report.asOf),report.timezone))}:section.measure==='reasons'?{...section,tables:section.tables.map(table=>({...table,groups:[...table.groups].sort((a,b)=>Number(a.label.startsWith('Lost ·'))-Number(b.label.startsWith('Lost ·')))}))}:section),late:report.late?{...report.late,sections:report.late.sections.filter(s=>s.measure===tile.measure)}:null};
   return {id:tile.id,width:tile.width,height:tile.height,status:'ready',tile,notes,report,forecast:null};
  }catch(error){if(error instanceof AccessError){if(error.code==='permission'||error.code==='validation'&&!sourceReadable)return unavailable(tile);return {id:tile.id,width:tile.width,height:tile.height,status:'error',name:measureCatalog[tile.measure].title,version:sourceVersion,period:`${filters.from} to ${filters.through}`,message:error.code==='prerequisite'?'This tile could not be computed. Try again.':'Report sources or permissions changed. Try again.'};}throw error;}
 }
 async outlineTile(c:ActorContext,tile:DashboardTile,filters:DashboardFilters):Promise<TileResult>{
  if(tile.withdrawn)return unavailable(tile);
  try{if(tile.source==='forecast'){const repository=new ForecastRepository(this.db);await repository.permit(c);const saved=await repository.snapshot(c,tile.sourceId);return {id:tile.id,width:tile.width,height:tile.height,status:'loading',name:'Forecast vs quota',version:tile.version,period:`${saved.from} to ${saved.through}`};}
   await this.metrics.sales.shares.assertVisible(c,tile.sourceId);const latest=await this.db.prepare('SELECT max(version) v FROM analytics_definitions WHERE workspace_id=? AND id=?').bind(c.workspaceId,tile.sourceId).first<number>('v');if(!latest)return unavailable(tile);const version=tile.version==='live'?latest:tile.version,definition=await this.metrics.sales.definition(c,tile.sourceId,version);return {id:tile.id,width:tile.width,height:tile.height,status:'loading',name:tile.kind==='chart'&&tile.measure==='pipeline'?'Open pipeline by stage, two pipelines':measureCatalog[tile.measure].title,version,period:`${filters.from} to ${filters.through}`};
  }catch(error){if(error instanceof AccessError)return unavailable(tile);throw error;}
 }
 async read(c:ActorContext,id:string,filters?:DashboardFilters,pending=false){
  const current=await this.head(c,id),suite=await this.metrics.sales.suite(current.c),selected=filters??current.definition.filters,tiles:TileResult[]=[];
  for(const tile of current.definition.tiles)tiles.push(await (pending?this.outlineTile(current.c,tile,selected):this.tile(current.c,tile,selected)));
  await this.head(current.c,id);
  const sourceFences=[];for(const tile of tiles){const original=current.definition.tiles.find(t=>t.id===tile.id)!;if((tile.status==='ready'||tile.status==='error')&&original.source==='report')sourceFences.push(...await this.metrics.sales.shares.assertVisible(current.c,original.sourceId));}
  await this.metrics.checkSources(current.c,sourceFences);
  const full=current.c.principal.kind==='operator'&&await isFullOperator(this.db,actor(current.c));
  const limited=!full||tiles.some(t=>t.status==='ready'&&t.report?.access.limited);
  const fieldValues=new Map<string,Set<string>>();let cursor:string|undefined;do{const page=await this.metrics.sales.graph.scanRecords(current.c,{types:['opportunity'],query:'',fields:[],filters:{},limit:1000,...(cursor?{cursor}:{})});for(const item of page.items){const custom=typeof item.fields.custom_fields_json==='string'?JSON.parse(item.fields.custom_fields_json):{};for(const [name,value] of Object.entries({...Object.fromEntries(Object.entries(item.fields).filter(([key])=>['lifecycle','band','queue_state','close_reason'].includes(key))),...custom})){if(['string','number','boolean'].includes(typeof value)&&/^[a-zA-Z][a-zA-Z0-9_]{0,80}$/.test(name)){const values=fieldValues.get(name)??new Set<string>();values.add(String(value));fieldValues.set(name,values);}}}cursor=page.nextCursor??undefined;}while(cursor);await this.metrics.checkSources(current.c,[]);
  const fields=[...fieldValues].map(([name,values])=>({name,values:[...values].sort()}));
  const owner=full?await this.db.prepare('SELECT display_name FROM operators WHERE id=?').bind(current.h.owner_id).first<string>('display_name'):null;
  const namedPeople=full&&current.share.audience==='named'?await this.metrics.sales.shares.members(current.c):[];
  const isDefault=Boolean(await this.db.prepare('SELECT 1 FROM sales_dashboard_defaults WHERE workspace_id=? AND operator_id=? AND dashboard_id=?').bind(c.workspaceId,actor(c),id).first());
  return {id,pending,name:current.definition.name,version:current.h.version,sharingVersion:current.h.sharing_version,owner,canEdit:current.edit,canManage:current.manage,isDefault,filters:selected,savedFilters:current.definition.filters,timezone:suite.timezone,currency:suite.currency,pipelines:suite.pipelines,reps:suite.reps,fields,tiles,computedAt:new Date().toISOString(),limited,access:!full?'Limited to your access: only records and fields you may read now are included, and nothing about hidden records is counted. Sharing a dashboard grants no record access.':limited?'Limited to your access now: some saved rows or fields are no longer readable, so only what you may read is shown.':'Computed from every record in this workspace; you are a full operator.',takeEveryFilter:tiles.filter(t=>t.status==='ready'&&!t.notes.length).length,unavailable:tiles.filter(t=>t.status==='unavailable').length,sharing:current.share.audience==='private'?'Private':current.share.audience==='workspace'?'Shared with everyone in the workspace who can read reports':namedPeople.length?`Shared with ${current.share.grants.map(grant=>`${namedPeople.find(person=>person.id===grant.operatorId)?.name??'Inactive person'} (${grant.access})`).join(', ')}`:'Shared with named people'};
 }
}
export type DashboardView=Awaited<ReturnType<Dashboards['read']>>;
