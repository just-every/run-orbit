import {salesRecordOwners,recordOwnerSections,matchesRecordOwner} from './sales-record-owners';
import {operatorListingPredicate} from '../identity/operator-listing';
import type {ActorContext,DependencyRef,Json,MetricSnapshot,SqlStatement} from '../../shared/expansion-contracts';
import {salesFilterValue} from './sales-filter';
import {GraphRecords} from '../graph/repository';
import {domainEventStatements} from '../effects/event-statements';
import {AccessError} from '../access/errors';
import {sha256} from '../access/mutations';
import type {AnalyticsMetrics} from './metrics';
import {snapshotStatements,hydrateSnapshot} from './snapshot-storage';
import {ReportShares} from './report-shares';
import {salesDefinition,salesSuite,type SalesDefinition} from './sales-definition';
import {salesPeriod,salesDateRange,type SalesPeriod} from './sales-period';
import {dealFacts,type NativePopulation} from './sales-population';
import {viewerAccess,applyAccess,accessProofs,type ViewerAccess} from './sales-access';
import {isFullOperator,fullOperatorFence} from '../access/identity-class';
import {citedRows,type Labels} from './sales-measures';
import {dealGoverned,type GraphRef,type SalesRow,type StageConfig} from './sales-rows';
import {salesView,lateArriving,type SalesView} from './sales-view';

/** Saved sales results keep their definition, period, currency, stage names and the exact rows behind every figure. */
export interface SalesSnapshotBody extends MetricSnapshot{kind:'sales';calculation:'sales-v1';sourceLineageVersion:1;definition:SalesDefinition;period:SalesPeriod;currency:string;stages:StageConfig[];rows:SalesRow[];reviewHash:string}
const MAX_BODY=1_800_000;
const keyOf=(ref:GraphRef)=>`${ref.type}:${ref.id}`;
export const isSalesSnapshot=(value:unknown):value is SalesSnapshotBody=>Boolean(value&&typeof value==='object'&&(value as {kind?:unknown}).kind==='sales');

export class SalesReports{
 readonly shares:ReportShares;readonly graph:GraphRecords;
 private readonly readFences=new WeakMap<SalesView,SqlStatement[]>();
 /** In-process proof only: composed reads recheck the exact source rows without serializing authority. */
 proofs(view:SalesView){return this.readFences.get(view)??[];}
 constructor(readonly metrics:AnalyticsMetrics){this.shares=new ReportShares(metrics.store);this.graph=new GraphRecords(metrics.store.db,metrics.store.access,domainEventStatements);}
 private get db(){return this.metrics.store.db;}
 private get sources(){if(!this.metrics.sources)throw new AccessError('prerequisite','Native source authority is required.');return this.metrics.sources;}
 async definition(c:ActorContext,id:string,version:number):Promise<SalesDefinition>{
  const row=await this.db.prepare('SELECT body_json FROM analytics_definitions WHERE workspace_id=? AND id=? AND version=?').bind(c.workspaceId,id,version).first<{body_json:string}>();
  if(!row)throw new AccessError('validation','Report definition does not exist.');
  const parsed=salesDefinition.safeParse(JSON.parse(row.body_json));if(!parsed.success)throw new AccessError('validation','This report is not a sales report.');return parsed.data;
 }
 /** Validate a sales definition against this workspace before it is saved. */
 async validate(definition:SalesDefinition){
  const pipelines=(await this.db.prepare('SELECT id FROM pipelines WHERE id IN(SELECT value FROM json_each(?))').bind(JSON.stringify(definition.pipelineIds)).all<{id:string}>()).results;
  if(pipelines.length!==definition.pipelineIds.length)throw new AccessError('validation','Choose pipelines that exist in this workspace.');
  const reps=(await this.db.prepare("SELECT o.id FROM operators o WHERE o.id IN(SELECT value FROM json_each(?)) AND NOT EXISTS(SELECT 1 FROM access_collaborators c WHERE c.operator_id=o.id)").bind(JSON.stringify(definition.repIds)).all<{id:string}>()).results;
  if(reps.length!==definition.repIds.length)throw new AccessError('validation','Choose reps who are operators of this workspace.');
 }
 /** Open a built-in definition: the saved version that matches it exactly, otherwise its next version. */
 async ensureBuiltIn(c:ActorContext,template:string){
  const builtIn=salesSuite.find(item=>item.id===template);if(!builtIn)throw new AccessError('validation','Unknown built-in report.');
  const versions=(await this.db.prepare('SELECT version,body_json FROM analytics_definitions WHERE workspace_id=? AND id=? ORDER BY version').bind(c.workspaceId,template).all<{version:number;body_json:string}>()).results;
  const exact=versions.find(row=>row.body_json===JSON.stringify(builtIn.definition));
  if(exact){c=await this.metrics.permit(c,'analytics.read',template);await this.metrics.checkSources(c,await this.shares.assertVisible(c,template));return {id:template,version:exact.version,created:false};}
  const saved=await this.metrics.define(c,template,(versions.at(-1)?.version??0)+1,builtIn.definition);return {id:template,version:saved.version,created:true};
 }
 private async settings(){const row=await this.db.prepare("SELECT timezone,currency FROM workspace_settings WHERE id='workspace'").first<{timezone:string;currency:string}>();if(!row)throw new AccessError('prerequisite','Workspace timezone and currency are unavailable.');return row;}
 private labels(stages:StageConfig[],access:ViewerAccess):Labels{return {stages:new Map(stages.map(stage=>[stage.id,stage])),pipelines:new Map(stages.map(stage=>[stage.pipelineId,stage.pipelineName])),operators:access.operatorNames};}
 /** One viewer's population for a period: native rows and graph deals, filtered to what they may read now. */
 private async population(c:ActorContext,definition:SalesDefinition,period:SalesPeriod,field?:{name:string;value:string}){
  const native=await this.sources.salesPopulation(period),access=await viewerAccess(this.graph,c,native.rows.flatMap(row=>row.refs)),rows:SalesRow[]=[];
  const facts=new Map([...access.deals].map(([id,deal])=>[id,dealFacts(deal.values,id,native)]));
  for(const [id,deal] of facts){const closed=typeof deal.closed_at==='string'?deal.closed_at:null;rows.push({key:`deal:${id}`,kind:'deal',id,refs:[{type:'opportunity',id}],dealId:id,governed:dealGoverned,at:closed,recordedAt:closed??(typeof deal.created_at==='string'?deal.created_at:null),facts:deal});}
  for(const row of native.rows)rows.push(this.withDeal(row,facts));
  const fieldApplied=!field||[...access.deals.values()].some(deal=>salesFilterValue(deal.values,field.name)!==null);
  const ownerPopulation=definition.recordOwnerType?await salesRecordOwners(this.metrics,c,definition.recordOwnerType,applyAccess(access,rows),access):{rows:applyAccess(access,rows),proofs:[]};
  const visible=ownerPopulation.rows.filter(row=>matchesRecordOwner(row,definition.recordOwnerIds??[])).filter(row=>!field||!fieldApplied||Boolean(row.dealId&&salesFilterValue(access.deals.get(row.dealId)?.values??{},field.name)?.value!==undefined&&String(salesFilterValue(access.deals.get(row.dealId)?.values??{},field.name)?.value)===field.value)),asOf=new Date().toISOString(),sections=recordOwnerSections(definition,period,asOf,visible,this.labels(native.stages,access)),cited=citedRows(sections);
  // A saved result keeps the rows its figures cite, with each cited movement's deal, whose owner and creation it was measured by.
  for(const row of visible)if(cited.has(row.key)&&row.kind==='movement')cited.add(`deal:${row.dealId}`);
  return {native,access,asOf,sections,fieldApplied,ownerProofs:ownerPopulation.proofs,rows:visible.filter(row=>cited.has(row.key)).map(row=>field&&fieldApplied&&row.dealId?{...row,facts:{...row.facts,dashboard_filter:field.value},governed:{...row.governed,dashboard_filter:[salesFilterValue(access.deals.get(row.dealId)?.values??{},field.name)?.sourceField??field.name]}}:row)};
 }
 /** A row linked to a deal takes the deal's pipeline (governed by its stage), and a message the deal's later win and amount. */
 private withDeal(row:SalesRow,deals:Map<string,Record<string,Json>>):SalesRow{
  const next={...row,facts:{...row.facts},governed:{...row.governed}};
  if(row.kind==='booking'){next.facts.deal_pipelines=(row.facts.deal_ids as string[]).map(id=>deals.get(id)?.pipeline_id).filter((id):id is string=>typeof id==='string');return next;}
  const deal=row.dealId?deals.get(row.dealId):undefined;if(!deal)return next;
  next.governed.pipeline_id=['stage_id'];if(deal.pipeline_id!==undefined)next.facts.pipeline_id=deal.pipeline_id;
  if(row.kind==='message'&&deal.lifecycle!==undefined&&deal.closed_at!==undefined){
   const won=deal.lifecycle==='won'&&typeof deal.closed_at==='string'&&Date.parse(deal.closed_at)>=Date.parse(row.at!);
   next.governed.won=['lifecycle','closed_at'];next.governed.value_cents=['lifecycle','closed_at','value_cents'];next.facts.won=won;
   if(won&&typeof deal.value_cents==='number')next.facts.value_cents=deal.value_cents;
   if(won)next.recordedAt=[row.recordedAt,String(deal.closed_at)].filter((value):value is string=>Boolean(value)).sort((a,b)=>Date.parse(a)-Date.parse(b)).at(-1)!;
  }
  return next;
 }
 private async hash(c:ActorContext,id:string,version:number,period:SalesPeriod,currency:string,stages:StageConfig[],rows:SalesRow[]){return sha256(JSON.stringify({tenantId:c.tenantId,workspaceId:c.workspaceId,principal:c.principal,policyEpoch:c.policyEpoch,id,version,period:[period.from,period.through,period.timezone],currency,stages,rows:rows.map(row=>[row.key,row.at,row.recordedAt,row.facts,row.recordOwners])}));}
 private async compute(c:ActorContext,id:string,version:number,fromMonth:string,throughMonth:string,filters?:{ownerIds:string[];pipelineIds:string[];field:{name:string;value:string}|null;dateRange?:{from:string;through:string}}){
  c=await this.metrics.permit(c,'analytics.read',id);const shareFence=await this.shares.assertVisible(c,id),definition=await this.definition(c,id,version),settings=await this.settings();
  // Dashboard predicates narrow the saved definition; they never replace its restrictions.
  if(filters){const intersect=(saved:string[],chosen:string[])=>!chosen.length?saved:!saved.length?chosen:saved.filter(id=>chosen.includes(id));if(definition.recordOwnerType){definition.recordOwnerIds=intersect(definition.recordOwnerIds??[],filters.ownerIds);if(filters.ownerIds.length&&!definition.recordOwnerIds.length)definition.recordOwnerIds=['no-matching-owner'];}else definition.repIds=intersect(definition.repIds,filters.ownerIds);definition.pipelineIds=intersect(definition.pipelineIds,filters.pipelineIds);if(!definition.recordOwnerType&&filters.ownerIds.length&&!definition.repIds.length)definition.repIds=['no-matching-owner'];if(filters.pipelineIds.length&&!definition.pipelineIds.length)definition.pipelineIds=['no-matching-pipeline'];}
  const period=filters?.dateRange?salesDateRange(filters.dateRange.from,filters.dateRange.through,settings.timezone):salesPeriod(fromMonth,throughMonth,settings.timezone),result=await this.population(c,definition,period,filters?.field??undefined);
  const proofs=[...shareFence,...result.ownerProofs,...await accessProofs(this.sources,c,result.access,result.rows,'lineage'),...this.metrics.store.guard("EXISTS(SELECT 1 FROM workspace_settings WHERE id='workspace' AND timezone=? AND currency=?)",[settings.timezone,settings.currency])];
  return {c,definition,period,currency:settings.currency,...result,proofs,reviewHash:await this.hash(c,id,version,period,settings.currency,result.native.stages,result.rows)};
 }
 /** The whole native population must be unchanged when the result commits, as graph sources are by their epoch and revisions. */
 private populationFence(native:NativePopulation):SqlStatement[]{
  if(native.fingerprint.value.length>MAX_BODY)throw new AccessError('validation','This period has too many source records to save as one result. Choose fewer months or pipelines.');
  return this.metrics.store.guard(`(${native.fingerprint.sql})=?`,[...native.fingerprint.bindings,native.fingerprint.value]);
 }
 async preview(c:ActorContext,id:string,version:number,fromMonth:string,throughMonth:string,filters?:{ownerIds:string[];pipelineIds:string[];field:{name:string;value:string}|null;dateRange?:{from:string;through:string}}):Promise<SalesView>{
  const result=await this.compute(c,id,version,fromMonth,throughMonth,filters);await this.metrics.checkSources(result.c,result.proofs);
  const view=salesView({id:`preview-${crypto.randomUUID()}`,saved:false,definitionId:id,definitionVersion:version,definition:result.definition,period:result.period,currency:result.currency,asOf:result.asOf,stages:result.native.stages,sections:result.sections,rows:result.rows,access:result.access,limited:!result.access.full,reviewHash:result.reviewHash,late:null});
  if(filters?.field&&!result.fieldApplied)view.filters.notes.push(`${filters.field.name} filter not applied: this report's readable records have no ${filters.field.name} field.`);
  this.readFences.set(view,[...this.metrics.store.access.fence(result.c),...result.proofs]);
  return view;
 }
 async save(c:ActorContext,id:string,version:number,fromMonth:string,throughMonth:string,expected:string):Promise<SalesView>{
  const result=await this.compute(c,id,version,fromMonth,throughMonth);
  await this.metrics.store.access.authorize(result.c,'analytics.snapshot',{...result.c,type:'analytics',id},[]);
  if(result.reviewHash!==expected)throw new AccessError('conflict','Report inputs changed after preview. Review a fresh preview before saving.');
  const inputs:DependencyRef[]=[...new Map(result.rows.flatMap(row=>row.refs).map(ref=>[keyOf(ref),result.access.records.get(keyOf(ref))!.ref])).values()];
  const snapshot:SalesSnapshotBody={kind:'sales',calculation:'sales-v1',sourceLineageVersion:1,id:crypto.randomUUID(),definitionId:id,definitionVersion:version,definition:result.definition,scope:{tenantId:result.c.tenantId,workspaceId:result.c.workspaceId},from:result.period.from,through:result.period.through,asOf:result.asOf,watermark:'native-transaction-fenced',period:result.period,currency:result.currency,stages:result.native.stages,rows:result.rows,reviewHash:result.reviewHash,inputs,values:{},incompleteReasons:[],fxSnapshots:[]};
  if(JSON.stringify(snapshot).length>MAX_BODY)throw new AccessError('validation','This result is too large to save in one record. Choose fewer months or pipelines.');
  await this.metrics.store.commit(result.c,'analytics.snapshot',snapshot.id,1,[...result.proofs,...this.populationFence(result.native),...this.metrics.store.guard('EXISTS(SELECT 1 FROM analytics_definitions WHERE workspace_id=? AND id=? AND version=? AND body_json=?)',[result.c.workspaceId,id,version,JSON.stringify(result.definition)]),...snapshotStatements(snapshot)]);
  return salesView({id:snapshot.id,saved:true,definitionId:id,definitionVersion:version,definition:result.definition,period:result.period,currency:result.currency,asOf:result.asOf,stages:result.native.stages,sections:result.sections,rows:result.rows,access:result.access,limited:!result.access.full,late:null});
 }
 /** Reopen a saved result under the viewer's access now: the original rows they may read, plus evidence recorded since. */
 async read(c:ActorContext,snapshot:SalesSnapshotBody):Promise<SalesView>{
  const shareFence=await this.shares.assertVisible(c,snapshot.definitionId),access=await viewerAccess(this.graph,c,snapshot.rows.flatMap(row=>row.refs));
  const ownerAuthority=snapshot.definition.recordOwnerType?await salesRecordOwners(this.metrics,c,snapshot.definition.recordOwnerType,applyAccess(access,snapshot.rows),access):{proofs:[]};
  const visible=applyAccess(access,snapshot.rows),complete=access.full&&visible.length===snapshot.rows.length&&visible.every((row,index)=>JSON.stringify(row.facts)===JSON.stringify(snapshot.rows[index]!.facts));
  const sections=recordOwnerSections(snapshot.definition,snapshot.period,snapshot.asOf,visible,this.labels(snapshot.stages,access)),current=await this.population(c,snapshot.definition,snapshot.period);
  const late=lateArriving(sections,current.sections,new Map(current.rows.map(row=>[row.key,row])),snapshot.asOf);
  const proofs=[...shareFence,...ownerAuthority.proofs,...current.ownerProofs,...await accessProofs(this.sources,c,access,visible,'current'),...await accessProofs(this.sources,c,current.access,current.rows,'lineage')];
  await this.metrics.checkSources(c,proofs);
  const view=salesView({id:snapshot.id,saved:true,definitionId:snapshot.definitionId,definitionVersion:snapshot.definitionVersion,definition:snapshot.definition,period:snapshot.period,currency:snapshot.currency,asOf:snapshot.asOf,stages:snapshot.stages,sections,rows:visible,access,limited:!complete,late:{sections:late,rows:current.rows,computedAt:current.asOf,access:current.access}});
  this.readFences.set(view,[...this.metrics.store.access.fence(c),...proofs]);return view;
 }
 /** Saved results of one definition version, each with its disclosed basis and the missing data this viewer may read. */
 async history(c:ActorContext,id:string,version:number){
  c=await this.metrics.permit(c,'analytics.read',id);const fence=await this.shares.assertVisible(c,id);await this.definition(c,id,version);
  const rows=(await this.db.prepare('SELECT id FROM analytics_snapshots WHERE tenant_id=? AND workspace_id=? AND definition_id=? AND definition_version=? ORDER BY created_at DESC,id DESC LIMIT 20').bind(c.tenantId,c.workspaceId,id,version).all<{id:string}>()).results;
  const snapshots:SalesSnapshotBody[]=[];for(const row of rows){const body=await this.db.prepare('SELECT body_json FROM analytics_snapshots WHERE id=?').bind(row.id).first<string>('body_json'),snapshot=body?await hydrateSnapshot(this.db,body):null;if(isSalesSnapshot(snapshot))snapshots.push(snapshot);}
  const access=await viewerAccess(this.graph,c,snapshots.flatMap(snapshot=>snapshot.rows.flatMap(row=>row.refs))),proofs:SqlStatement[]=[...fence];
  const items=[];for(const snapshot of snapshots){
   const ownerAuthority=snapshot.definition.recordOwnerType?await salesRecordOwners(this.metrics,c,snapshot.definition.recordOwnerType,applyAccess(access,snapshot.rows),access):{proofs:[]};
   const visible=applyAccess(access,snapshot.rows),view=salesView({id:snapshot.id,saved:true,definitionId:id,definitionVersion:version,definition:snapshot.definition,period:snapshot.period,currency:snapshot.currency,asOf:snapshot.asOf,stages:snapshot.stages,sections:recordOwnerSections(snapshot.definition,snapshot.period,snapshot.asOf,visible,this.labels(snapshot.stages,access)),rows:[],access,limited:!access.full||visible.length!==snapshot.rows.length,late:null});
   proofs.push(...ownerAuthority.proofs,...await accessProofs(this.sources,c,access,visible,'current'));
   items.push({kind:'sales',id:snapshot.id,asOf:snapshot.asOf,period:view.period,timezone:view.timezone,currency:view.currency,freshness:view.freshness,access:view.access,definitions:view.sections.map(section=>({measure:section.measure,title:section.title,definition:section.definition,sources:section.sources})),missing:view.missing});
  }
  await this.metrics.checkSources(c,proofs);
  return {items,unavailable:0};
 }
 async remove(c:ActorContext,id:string){
  c=await this.metrics.permit(c,'analytics.define',id);const share=await this.shares.read(c,id);if(!await this.shares.canManage(c,share))throw new AccessError('permission','Only the report owner or installation owner deletes a report.');
  await this.metrics.store.commit(c,'analytics.deleted',id,share.revision,[...this.shares.fence(c,id),{sql:'DELETE FROM analytics_snapshot_sources WHERE snapshot_id IN(SELECT id FROM analytics_snapshots WHERE workspace_id=? AND definition_id=?)',bindings:[c.workspaceId,id]},{sql:'DELETE FROM analytics_snapshots WHERE workspace_id=? AND definition_id=?',bindings:[c.workspaceId,id]},{sql:'DELETE FROM analytics_definitions WHERE workspace_id=? AND id=?',bindings:[c.workspaceId,id]},{sql:'DELETE FROM analytics_report_shares WHERE workspace_id=? AND definition_id=?',bindings:[c.workspaceId,id]}]);return {deleted:true};
 }
 async suite(c:ActorContext){
  c=await this.metrics.permit(c,'analytics.read');const settings=await this.settings(),full=c.principal.kind==='operator'&&await isFullOperator(this.db,c.principal.operatorId);
  const pipelines=(await this.db.prepare('SELECT id,name FROM pipelines ORDER BY is_default DESC,name,id').all<{id:string;name:string}>()).results;
  const reps=full?(await this.db.prepare(`SELECT o.id,o.display_name AS name FROM operators o WHERE o.status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators c WHERE c.operator_id=o.id) AND ${operatorListingPredicate('o')} ORDER BY o.display_name,o.id`).all<{id:string;name:string}>()).results:[];
  const members=full?await this.shares.members(c):[];
  const canDefine=await this.metrics.store.access.authorize(c,'analytics.define',{...c,type:'analytics',id:'*'},[]).then(()=>true,()=>false);
  await this.metrics.checkSources(c,full?fullOperatorFence(c):[]);
  return {templates:salesSuite,timezone:settings.timezone,currency:settings.currency,pipelines,reps:full?[...reps,{id:'unassigned',name:'Unassigned'}]:reps,members,canDefine};
 }
}
