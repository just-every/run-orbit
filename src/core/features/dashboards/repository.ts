import type {ActorContext} from '../../shared/expansion-contracts';
import {AccessError} from '../access/errors';
import {isFullOperator} from '../access/identity-class';
import type {AnalyticsMetrics} from '../analytics/metrics';
import type {SalesView} from '../analytics/sales-view';
import type {ForecastSnapshot} from '../forecast/types';
import {ForecastRepository} from '../forecast/repository';
import {dashboardSave,dashboardShare,type DashboardDefinition,type DashboardFilters,type DashboardShare,type DashboardTile} from './schema';

export type TileResult={id:string;width:number;height:number;status:'unavailable'}|{id:string;width:number;height:number;status:'error';message:string}|{id:string;width:number;height:number;status:'ready';tile:DashboardTile;notes:string[];report:SalesView|null;forecast:ForecastSnapshot|null};
type Head={owner_id:string|null;version:number;sharing_version:number;authority:number;body_json:string;share_json:string};
const actor=(c:ActorContext)=>c.principal.kind==='operator'?c.principal.operatorId:'';
const unavailable=(tile:DashboardTile):TileResult=>({id:tile.id,width:tile.width,height:1,status:'unavailable'});
/** Dashboard custody holds definitions and pointers, never a second copy of a report population. */
export class Dashboards{
 constructor(readonly metrics:AnalyticsMetrics){}
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
 async adminChannels(c:ActorContext){if(!await this.admin(c))return [];return (await this.db.prepare("SELECT c.id,c.name FROM slack_channels c WHERE c.enabled=1 AND EXISTS(SELECT 1 FROM slack_installation WHERE state='connected') ORDER BY c.name").all<{id:string;name:string}>()).results;}
 async list(c:ActorContext){
  c=await this.metrics.permit(c,'analytics.read');
  const ids=(await this.db.prepare('SELECT id FROM sales_dashboards WHERE workspace_id=? ORDER BY id').bind(c.workspaceId).all<{id:string}>()).results;
  const defaultId=await this.db.prepare('SELECT dashboard_id FROM sales_dashboard_defaults WHERE workspace_id=? AND operator_id=?').bind(c.workspaceId,actor(c)).first<string>('dashboard_id');
  const items=[];for(const {id} of ids){try{const d=await this.head(c,id);items.push({id,name:d.definition.name,version:d.h.version,isDefault:id===defaultId});}catch(e){if(!(e instanceof AccessError&&e.code==='permission'))throw e;}}
  const canDefine=await this.store.access.authorize(c,'analytics.define',{...c,type:'analytics',id:'*'},[]).then(()=>true,()=>false);
  return {items:items.sort((a,b)=>Number(b.isDefault)-Number(a.isDefault)),canDefine};
 }
 async save(c:ActorContext,id:string,input:unknown){
  const {version,definition}=dashboardSave.parse(input);let owner=actor(c);
  if(version===0)c=await this.metrics.permit(c,'analytics.define');
  else{const current=await this.head(c,id);c=current.c;if(!current.edit)throw new AccessError('permission','Dashboard editing is not permitted.');owner=current.h.owner_id??actor(c);if(current.h.version!==version)throw new AccessError('conflict','Dashboard changed. Reload before saving.');}
  const now=new Date().toISOString(),next=version+1,share={version:1,audience:'private',grants:[]} as DashboardShare;
  await this.store.commit(c,version===0?'analytics.define':'analytics.read',id,next,[...this.store.guard('COALESCE((SELECT version FROM sales_dashboards WHERE workspace_id=? AND id=?),0)=?',[c.workspaceId,id,version]),{sql:'INSERT INTO sales_dashboard_versions VALUES(?,?,?,?,?,?)',bindings:[c.workspaceId,id,next,JSON.stringify(definition),actor(c),now]},...(version===0?[{sql:'INSERT INTO sales_dashboards VALUES(?,?,?,1,1,1)',bindings:[c.workspaceId,id,owner]},{sql:'INSERT INTO sales_dashboard_shares VALUES(?,?,1,?,?,?)',bindings:[c.workspaceId,id,JSON.stringify(share),actor(c),now]}]:[{sql:'UPDATE sales_dashboards SET version=? WHERE workspace_id=? AND id=?',bindings:[next,c.workspaceId,id]}])]);
  return {id,version:next};
 }
 async sharing(c:ActorContext,id:string,input?:unknown){
  const current=await this.head(c,id);if(!current.manage)throw new AccessError('permission','Only the dashboard owner or installation owner changes sharing.');
  if(input!==undefined){const parsed=dashboardShare.parse(input);if(parsed.version!==current.h.sharing_version)throw new AccessError('conflict','Sharing changed. Reload before saving.');const members=await this.metrics.sales.shares.members(current.c);if(parsed.grants.some(g=>!members.some(m=>m.id===g.operatorId)))throw new AccessError('validation','Choose active people only.');
   const share={...parsed,version:parsed.version+1};await this.store.commit(current.c,'analytics.read',id,share.version,[...this.store.guard('EXISTS(SELECT 1 FROM sales_dashboards WHERE workspace_id=? AND id=? AND sharing_version=?)',[c.workspaceId,id,parsed.version]),{sql:'INSERT INTO sales_dashboard_shares VALUES(?,?,?,?,?,?)',bindings:[c.workspaceId,id,share.version,JSON.stringify(share),actor(c),new Date().toISOString()]},{sql:'UPDATE sales_dashboards SET sharing_version=?,authority=1 WHERE workspace_id=? AND id=?',bindings:[share.version,c.workspaceId,id]}]);return this.sharing(c,id);
  }
  return {...current.share,members:await this.metrics.sales.shares.members(current.c)};
 }
 async setDefault(c:ActorContext,id:string,enabled:boolean){const current=await this.head(c,id);await this.store.commit(current.c,'analytics.read',id,current.h.version,enabled?[{sql:'INSERT INTO sales_dashboard_defaults VALUES(?,?,?) ON CONFLICT(workspace_id,operator_id) DO UPDATE SET dashboard_id=excluded.dashboard_id',bindings:[c.workspaceId,actor(c),id]}]:[{sql:'DELETE FROM sales_dashboard_defaults WHERE workspace_id=? AND operator_id=? AND dashboard_id=?',bindings:[c.workspaceId,actor(c),id]}]);return {default:enabled};}
 async tile(c:ActorContext,tile:DashboardTile,filters:DashboardFilters):Promise<TileResult>{
  try{
   if(tile.source==='forecast'){
    const repository=new ForecastRepository(this.db),saved=await repository.snapshot(c,tile.sourceId);
    // Forecast snapshots have their own erasure index and require a full operator. Live keeps the saved view's period.
    const forecast=tile.version==='live'?{...saved,result:(await repository.preview(c,{from:saved.from,through:saved.through})).result}:saved;
    const notes=[];if(filters.ownerIds.length)notes.push('Owner filter not applied: this forecast view keeps its saved scope.');if(filters.pipelineIds.length)notes.push('Pipeline filter not applied: this forecast view keeps its saved scope.');if(filters.field)notes.push(`${filters.field.name} filter not applied: this forecast view keeps its saved scope.`);notes.push('Dashboard filters not applied: this tile shows the forecast view’s disclosed period.');
    return {id:tile.id,width:tile.width,height:tile.height,status:'ready',tile,notes,report:null,forecast};
   }
   await this.metrics.sales.shares.assertVisible(c,tile.sourceId);
   const row=await this.db.prepare('SELECT max(version) AS version FROM analytics_definitions WHERE workspace_id=? AND id=?').bind(c.workspaceId,tile.sourceId).first<{version:number|null}>();
   if(!row?.version)return unavailable(tile);
   const version=tile.version==='live'?row.version:tile.version;
   const definition=await this.metrics.sales.definition(c,tile.sourceId,version);if(!definition.measures.includes(tile.measure))return unavailable(tile);
   const notes:string[]=[],measuredNow=tile.measure==='pipeline'||tile.measure==='stage_age';
   let report:SalesView;
   if(tile.snapshotId){const result=await this.metrics.read(c,tile.snapshotId);if(!('kind' in result&&result.kind==='sales')||result.definitionId!==tile.sourceId||result.definitionVersion!==version)return unavailable(tile);report=result as SalesView;notes.push(`Dashboard filters not applied: this tile shows the result saved ${new Intl.DateTimeFormat('en-US',{timeZone:report.timezone,month:'short',day:'numeric',year:'numeric'}).format(new Date(report.asOf))}.`);}
   else{
    let field=filters.field;if(field){const schema=await this.db.prepare("SELECT fields_json FROM schema_types WHERE name='opportunity'").first<string>('fields_json');if(!schema||!Object.hasOwn(JSON.parse(schema),field.name)){notes.push(`${field.name} filter not applied: this report's records have no ${field.name} field.`);field=null;}}
    if(measuredNow)notes.push(tile.measure==='pipeline'?'Date range not applied: open pipeline is measured when computed, not over a period.':'Date range not applied: stage age is measured when computed.');
    if(tile.measure==='bookings'&&filters.ownerIds.length)notes.push('Owner filter not applied: bookings are not filtered by rep.');
    report=await this.metrics.sales.preview(c,tile.sourceId,version,filters.from,filters.through,{...filters,field});
   }
   report={...report,sections:report.sections.filter(s=>s.measure===tile.measure)};
   return {id:tile.id,width:tile.width,height:tile.height,status:'ready',tile,notes,report,forecast:null};
  }catch(error){if(error instanceof AccessError){if(error.code==='permission'||error.code==='validation')return unavailable(tile);return {id:tile.id,width:tile.width,height:tile.height,status:'error',message:error.code==='prerequisite'?'This tile could not be computed. Try again.':'Report sources or permissions changed. Try again.'};}throw error;}
 }
 async read(c:ActorContext,id:string,filters?:DashboardFilters){
  const current=await this.head(c,id),suite=await this.metrics.sales.suite(current.c),selected=filters??current.definition.filters,tiles:TileResult[]=[];
  for(const tile of current.definition.tiles)tiles.push(await this.tile(current.c,tile,selected));
  await this.head(current.c,id);
  const full=current.c.principal.kind==='operator'&&await isFullOperator(this.db,actor(current.c));
  const limited=!full||tiles.some(t=>t.status==='ready'&&t.report?.access.limited);
  const owner=full?await this.db.prepare('SELECT display_name FROM operators WHERE id=?').bind(current.h.owner_id).first<string>('display_name'):null;
  const isDefault=Boolean(await this.db.prepare('SELECT 1 FROM sales_dashboard_defaults WHERE workspace_id=? AND operator_id=? AND dashboard_id=?').bind(c.workspaceId,actor(c),id).first());
  return {id,name:current.definition.name,version:current.h.version,sharingVersion:current.h.sharing_version,owner,canEdit:current.edit,canManage:current.manage,isDefault,filters:selected,savedFilters:current.definition.filters,timezone:suite.timezone,currency:suite.currency,pipelines:suite.pipelines,reps:suite.reps,tiles,computedAt:new Date().toISOString(),limited,access:!full?'Limited to your access: only records and fields you may read now are included, and nothing about hidden records is counted. Sharing a dashboard grants no record access.':limited?'Limited to your access now: some saved rows or fields are no longer readable, so only what you may read is shown.':'Computed from every record in this workspace; you are a full operator.',takeEveryFilter:tiles.filter(t=>t.status==='ready'&&!t.notes.length).length,unavailable:tiles.filter(t=>t.status==='unavailable').length,sharing:current.share.audience==='private'?'Private':current.share.audience==='workspace'?'Shared with everyone in the workspace who can read reports':`Shared with named people`};
 }
}
export type DashboardView=Awaited<ReturnType<Dashboards['read']>>;
