import {reportOwners,type ReportOwner} from './record-owners';
import {snapshotStatements,hydrateSnapshot} from './snapshot-storage';
import {reportMeasurement} from './measurement';
import {labelReportGroups} from './group-labels';
import {reportValue} from './report-format';
import type {AnalyticsSourcePort} from './sources';
import {isSalesBody,salesDefinition,type SalesDefinition} from './sales-definition';
import {SalesReports,isSalesSnapshot} from './sales-report';
import {visibleSql,type Audience} from './report-shares';
import type {SalesView} from './sales-view';
import {z} from 'zod';
import {sha256} from '../access/mutations';
import {AccessError} from '../access/errors';
import {OperationsStore} from '../operations/store';
import type {ActorContext,DependencyRef,MetricSnapshot,SqlStatement} from '../../shared/expansion-contracts';
export const metricDefinition=z.object({name:z.string().min(1).max(120),description:z.string().min(1).max(2000),aggregation:z.enum(['count','sum','mean','ratio']),unit:z.string().min(1).max(50),sourceTypes:z.array(z.string().min(1)).min(1).max(50),sourceOperation:z.string().regex(/^[a-z_.]+$/),sourceFields:z.array(z.string()).max(100),currency:z.string().regex(/^[A-Z]{3}$/).nullable(),missingPolicy:z.literal('incomplete'),lateArrival:z.literal('recompute'),attributionModel:z.enum(['none','first_touch','last_touch','linear']),attributionWindowDays:z.number().int().min(1).max(730),filters:z.record(z.string(),z.union([z.string(),z.number(),z.null()])).optional(),groupBy:z.string().optional(),valueField:z.string().optional(),denominatorField:z.string().optional(),dateField:z.enum(['created_at','updated_at','expected_close_at']).optional()}).strict();
export type MetricDefinition=z.infer<typeof metricDefinition>;
/** A native metric snapshot pins its definition and exact permitted CRM inputs. */
export class AnalyticsMetrics {
 readonly sales:SalesReports;
 constructor(readonly store:OperationsStore,readonly sources?:AnalyticsSourcePort){this.sales=new SalesReports(this);}
 async permit(ctx:ActorContext,operation:string,id='*'){ctx=await this.store.access.refreshContext(ctx);await this.store.access.authorize(ctx,operation,{...ctx,type:'analytics',id},[]);return ctx;}
 /** Count/sum/mean/ratio definitions over native CRM fields, or REPORT-001 sales suite definitions. A new report records its
  * sharing; a later version of a shared report belongs to whoever manages that sharing. */
 async define(ctx:ActorContext,id:string,version:number,input:unknown,sharing?:{audience:Audience;operatorIds:string[]}){
  ctx=await this.permit(ctx,'analytics.define',id);let body:MetricDefinition|SalesDefinition;
  if(isSalesBody(input)){body=salesDefinition.parse(input);await this.sales.validate(body);if(body.recordOwnerType)await reportOwners(this,ctx,[]);}
  else{body=metricDefinition.parse(input);if(body.currency!==null||body.attributionModel!=='none'||body.sourceOperation!=='graph.read'||body.sourceTypes.some(type=>!['contact','company','opportunity'].includes(type)))throw new AccessError('validation','Reports use native CRM fields, without FX or attribution.');}
  if(!/^[a-z0-9_-]{1,100}$/.test(id)||!Number.isSafeInteger(version)||version<1)throw new AccessError('validation','A stable definition ID and positive version are required.');
  const share=await this.sales.shares.read(ctx,id);if(version>1&&share.stored&&!await this.sales.shares.canManage(ctx,share))throw new AccessError('permission','Only the report owner or the installation owner saves a new version of this report.');
  const shares=version===1?this.sales.shares.createStatements(ctx,id,sharing?.audience,sharing?await this.sales.shares.named(ctx,sharing.audience,sharing.operatorIds):[]):this.sales.shares.fence(ctx,id);
  await this.store.commit(ctx,'analytics.define',id,version,[...this.store.guard('COALESCE((SELECT max(version) FROM analytics_definitions WHERE workspace_id=? AND id=?),0)=?',[ctx.workspaceId,id,version-1]),{sql:'INSERT INTO analytics_definitions VALUES(?,?,?,?,?,?)',bindings:[id,ctx.tenantId,ctx.workspaceId,version,JSON.stringify(body),new Date().toISOString()]},...shares]);return {id,version,definition:body};}
 async definition(ctx:ActorContext,id:string,version:number){const row=await this.store.db.prepare('SELECT body_json FROM analytics_definitions WHERE workspace_id=? AND id=? AND version=?').bind(ctx.workspaceId,id,version).first<{body_json:string}>();if(!row)throw new AccessError('validation','Metric definition does not exist.');return metricDefinition.parse(JSON.parse(row.body_json));}
 async sourceProofs(ctx:ActorContext,definition:MetricDefinition,refs:DependencyRef[]){if(!this.sources)throw new AccessError('prerequisite','Native source authority is required.');for(const ref of refs)if(!definition.sourceTypes.includes(ref.type))throw new AccessError('validation','Source type does not match its definition.');const fields=[...new Set([...definition.sourceFields,...[definition.valueField,definition.denominatorField,definition.groupBy,definition.dateField].filter((field):field is string=>Boolean(field)),...Object.keys(definition.filters??{})])];return this.sources.traceStatements(ctx,refs.map(ref=>({ref,fields}))); }
 async checkSources(ctx:ActorContext,proofs:SqlStatement[]){const statements=[...this.store.access.fence(ctx),...proofs];if(statements.length)try{await this.store.db.batch(statements.map(s=>this.store.db.prepare(s.sql).bind(...s.bindings)));}catch(error){if(/CHECK constraint failed/.test(String(error)))throw new AccessError('conflict','Report sources or permissions changed.');throw error;}}

 private async calculate(ctx:ActorContext,id:string,version:number,from:string,through:string){
  ctx=await this.permit(ctx,'analytics.read',id);const shared=await this.sales.shares.assertVisible(ctx,id),definition=await this.definition(ctx,id,version);
  const {nativeMetricPopulation}=await import('./report-population');
  const {snapshot,proofs}=await nativeMetricPopulation(this,ctx,id,version,definition,from,through);
  return {ctx,snapshot,sourceProofs:[...shared,...proofs]};
 }
 private async reviewHash(context:ActorContext,snapshot:MetricSnapshot & {sourceLineageVersion:1}){
  return sha256(JSON.stringify({
   definitionId:snapshot.definitionId,definitionVersion:snapshot.definitionVersion,
   scope:{tenantId:context.tenantId,workspaceId:context.workspaceId,principal:context.principal,policyEpoch:context.policyEpoch},
   from:snapshot.from,through:snapshot.through,watermark:snapshot.watermark,inputs:snapshot.inputs,
   values:snapshot.values,sourceOwners:(snapshot as MetricSnapshot&{sourceOwners?:ReportOwner[]}).sourceOwners,incompleteReasons:snapshot.incompleteReasons,fxSnapshots:snapshot.fxSnapshots,
  }));
 }
 async preview(ctx:ActorContext,id:string,version:number,from:string,through:string){
  const result=await this.calculate(ctx,id,version,from,through);
  const reviewHash=await this.reviewHash(result.ctx,result.snapshot);
  await this.checkSources(result.ctx,result.sourceProofs);
  return {...result.snapshot,reviewHash};
 }
 async compute(ctx:ActorContext,id:string,version:number,from:string,through:string,_requestedWatermark?:string,expectedReviewHash?:string){
  const result=await this.calculate(ctx,id,version,from,through);
  await this.store.access.authorize(result.ctx,'analytics.snapshot',{...result.ctx,type:'analytics',id},[]);
  if(expectedReviewHash&&expectedReviewHash!==await this.reviewHash(result.ctx,result.snapshot))throw new AccessError('conflict','Report inputs changed after preview. Review a fresh preview before saving.');
  await this.store.commit(result.ctx,'analytics.snapshot',result.snapshot.id,1,[...result.sourceProofs,...snapshotStatements(result.snapshot)]);
  return result.snapshot;
 }
 /** A saved sales result reopens under the viewer's access now; any other saved result keeps its exact lineage fence. */
 async read(ctx:ActorContext,id:string):Promise<MetricSnapshot|SalesView>{ctx=await this.permit(ctx,'analytics.read',id);const row=await this.store.db.prepare('SELECT body_json FROM analytics_snapshots WHERE id=? AND workspace_id=?').bind(id,ctx.workspaceId).first<{body_json:string}>();if(!row)throw new AccessError('validation','Snapshot not found.');const snapshot:MetricSnapshot & {sourceLineageVersion?:number;sourceFields?:string[];sourceOwners?:ReportOwner[]}=await hydrateSnapshot(this.store.db,row.body_json);if(isSalesSnapshot(snapshot))return this.sales.read(ctx,snapshot);if(snapshot.sourceLineageVersion!==1)throw new AccessError('prerequisite','This legacy snapshot lacks verifiable historical source lineage and cannot be read. Recompute this snapshot only to create a separate result; it does not repair this retained record or unblock backup.');const definition=await this.definition(ctx,snapshot.definitionId,snapshot.definitionVersion);const proofs=[...await this.sales.shares.assertVisible(ctx,snapshot.definitionId),...await this.sourceProofs(ctx,{...definition,sourceFields:[...new Set([...definition.sourceFields,...(snapshot.sourceFields??[])])]},snapshot.inputs)];
  if(snapshot.sourceOwners){const currentOwners=await reportOwners(this,ctx,snapshot.inputs);proofs.push(...currentOwners.proofs);}
  if(!snapshot.measurement){
   const workspace=await this.store.db.prepare("SELECT currency FROM workspace_settings WHERE id='workspace'").first<{currency:string}>();
   if(!workspace)throw new AccessError('prerequisite','Workspace currency is unavailable.');
   snapshot.measurement=reportMeasurement(definition,workspace.currency,Object.hasOwn(snapshot,'population'));
  }
  snapshot.values.unit=snapshot.measurement.unit;
  snapshot.values.formattedValue=reportValue(snapshot);
  proofs.push(...await labelReportGroups(this,ctx,definition,snapshot));
  await this.checkSources(ctx,proofs);return snapshot;
 }
 /** Reports this viewer may open: workspace-wide, their own, named for them, or every report for the installation owner. */
 async list(ctx:ActorContext){ctx=await this.permit(ctx,'analytics.read');const rows=(await this.store.db.prepare(`SELECT d.id,d.version,d.body_json,d.created_at FROM analytics_definitions d WHERE d.workspace_id=?1 AND ${visibleSql('d.id')} ORDER BY d.created_at DESC LIMIT 100`).bind(ctx.workspaceId,ctx.principal.kind==='operator'?ctx.principal.operatorId:'').all()).results;await this.checkSources(ctx,[]);return rows;}
 async listSnapshots(ctx:ActorContext,id:string,version:number){
  ctx=await this.permit(ctx,'analytics.read',id);
  const body=await this.store.db.prepare('SELECT body_json FROM analytics_definitions WHERE workspace_id=? AND id=? AND version=?').bind(ctx.workspaceId,id,version).first<string>('body_json');
  if(body&&isSalesBody(JSON.parse(body)))return this.sales.history(ctx,id,version);
  const shared=await this.sales.shares.assertVisible(ctx,id),definition=await this.definition(ctx,id,version);
  const rows=(await this.store.db.prepare('SELECT id FROM analytics_snapshots WHERE tenant_id=? AND workspace_id=? AND definition_id=? AND definition_version=? ORDER BY created_at DESC,id DESC LIMIT 20').bind(ctx.tenantId,ctx.workspaceId,id,version).all<{id:string}>()).results;
  const items:MetricSnapshot[]=[];let unavailable=0;
  const proofs:SqlStatement[]=[...shared];
  for(const row of rows){
   let snapshot:MetricSnapshot;
   try{snapshot=await this.read(ctx,row.id) as MetricSnapshot;}catch(error){
    // Only explicitly unverifiable legacy lineage is unavailable; access failure must abort disclosure.
    if(error instanceof AccessError&&error.code==='prerequisite'){unavailable+=1;continue;}
    throw error;
   }
   await this.store.access.authorize(ctx,'analytics.read',{...ctx,type:'analytics',id:row.id},[]);
   proofs.push(...await this.sourceProofs(ctx,definition,snapshot.inputs));
   items.push(snapshot);
  }
  // Fence the whole accumulated response, including empty lists, at its outer boundary.
  await this.checkSources(ctx,proofs);
  return {items,unavailable};
 }
}
