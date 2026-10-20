import {AccessService} from '../access/service';
import {AccessError,deny} from '../access/errors';
import {isFullOperator} from '../access/identity-class';
import {sha256} from '../access/mutations';
import {OperationsStore} from '../operations/store';
import {domainEventStatements} from '../effects/event-statements';
import {createId} from '../../shared/ids';
import type {ActorContext,SqlStatement} from '../../shared/expansion-contracts';
import {calculateForecast} from './model';
import type {ForecastState,ForecastPeriod,ForecastPreview,ForecastSnapshot,ForecastSnapshotMetadata,ForecastReview,StageRuleInput,DealForecastInput,QuotaInput,StageRule,DealInput,ForecastQuota,NativeForecastDeal} from './types';

interface RevisionRow {id:string;kind:'stage'|'deal'|'quota';target_key:string;subject_id:string;revision:number;body_json:string;actor_id:string;actor_name:string;reason:string;reviewed_at:string}
interface Loaded {state:ForecastState;clock:number;classStamp:string;staleDays:number;references:{kind:string;id:string}[]}
const classStampSql="COALESCE((SELECT group_concat(operator_id,'|') FROM (SELECT operator_id FROM access_collaborators ORDER BY operator_id)),'')";
export class ForecastRepository {
 readonly access:AccessService;readonly store:OperationsStore;
 constructor(readonly db:D1Database){this.access=new AccessService(db);this.store=new OperationsStore(db,this.access,domainEventStatements);}
 async permit(context:ActorContext,owner=false){
  const current=await this.access.refreshContext(context);
  if(current.principal.kind!=='operator'||!await isFullOperator(this.db,current.principal.operatorId))deny('Forecasts require a current full operator.');
  await this.access.authorize(current,owner?'forecast.configure':'forecast.read',{...current,type:'forecast',id:'*'},[]);
  if(owner){const actor=current.principal.operatorId;if(!await this.db.prepare("SELECT 1 FROM operators WHERE id=? AND status='active' AND setup_owner=1").bind(actor).first())deny('Only the installation owner configures forecasts until TEAM-005 adds administrators.');this.access.addDependencyFences(current,this.store.guard("EXISTS(SELECT 1 FROM operators WHERE id=? AND status='active' AND setup_owner=1)",[actor]),'forecast-owner');}
  return current;
 }
 private async load(context:ActorContext):Promise<Loaded>{
  const checks=this.access.fence(context,'read').map(s=>this.db.prepare(s.sql).bind(...s.bindings));
  let results:D1Result[];
  try{results=await this.db.batch([...checks,
   this.db.prepare('SELECT revision FROM forecast_source_clock WHERE id=1'),
   this.db.prepare('SELECT id,name FROM pipeline_stages ORDER BY position,id'),
   this.db.prepare("SELECT o.id,o.display_name AS name,o.setup_owner FROM operators o WHERE o.status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators c WHERE c.operator_id=o.id) ORDER BY o.display_name,o.id"),
   this.db.prepare('SELECT r.*,o.display_name AS actor_name FROM forecast_revisions r LEFT JOIN operators o ON o.id=r.actor_id WHERE r.workspace_id=? ORDER BY r.kind,r.target_key,r.revision').bind(context.workspaceId),
   this.db.prepare('SELECT * FROM opportunities ORDER BY id'),
   this.db.prepare("SELECT stale_interval_days,currency FROM workspace_settings WHERE id='workspace'"),
   this.db.prepare("SELECT 'contact' AS kind,contact_id AS id FROM opportunity_contacts UNION SELECT 'company',company_id FROM opportunities WHERE company_id IS NOT NULL"),
   this.db.prepare(`SELECT ${classStampSql} AS value`)
  ]);}catch(error){if(/CHECK constraint failed/.test(String(error)))throw new AccessError('permission','Authority changed before the forecast read.');throw error;}
  const rows=results.slice(checks.length),clock=(rows[0].results[0] as {revision:number}|undefined)?.revision;
  if(clock===undefined)throw new AccessError('prerequisite','Forecast source tracking is not initialized.');
  const settings=rows[5].results[0] as {stale_interval_days:number;currency:string}|undefined;
  if(!settings||settings.currency!=='USD')throw new AccessError('prerequisite','Forecasts require the workspace USD configuration.');
  const operators=rows[2].results as {id:string;name:string;setup_owner:number}[],reviews=rows[3].results as unknown as RevisionRow[];
  const history:ForecastReview[]=reviews.map(row=>({id:row.id,kind:row.kind,targetKey:row.target_key,subjectId:row.subject_id,revision:row.revision,body:JSON.parse(row.body_json),actorId:row.actor_id,actorName:row.actor_name??'Former operator',reason:row.reason,reviewedAt:row.reviewed_at}));
  const latest=new Map<string,ForecastReview>();for(const review of history)latest.set(`${review.kind}:${review.targetKey}`,review);
  const stageRules:StageRule[]=[],dealInputs:DealInput[]=[],quotas:ForecastQuota[]=[];
  for(const review of latest.values()){
   const attribution={id:review.id,actorId:review.actorId,reason:review.reason,reviewedAt:review.reviewedAt,revision:review.revision};
   if(review.kind==='stage')stageRules.push({...review.body as StageRuleInput,...attribution});
   else if(review.kind==='deal')dealInputs.push({...review.body as DealForecastInput,...attribution,dealId:review.subjectId});
   else quotas.push({...review.body as QuotaInput,...attribution});
  }
  const deals=rows[4].results as unknown as NativeForecastDeal[];
  const state:ForecastState={canManage:operators.some(o=>o.id===(context.principal.kind==='operator'?context.principal.operatorId:'')&&o.setup_owner===1),stages:rows[1].results as {id:string;name:string}[],operators:operators.map(({id,name})=>({id,name})),stageRules,dealInputs,quotas,deals,reviewHistory:history};
  const references=[...rows[6].results as {kind:string;id:string}[],...deals.map(d=>({kind:'opportunity',id:d.id})),...operators.map(o=>({kind:'operator',id:o.id})),...history.flatMap(r=>[{kind:'operator',id:r.actorId},...(r.kind==='deal'?[{kind:'opportunity',id:r.subjectId}]:r.kind==='quota'?[{kind:'operator',id:r.subjectId}]:[])])];
  return {state,clock,classStamp:(rows[7].results[0] as {value:string}).value,staleDays:settings.stale_interval_days,references:[...new Map(references.map(r=>[`${r.kind}:${r.id}`,r])).values()]};
 }
 async read(context:ActorContext){return (await this.load(await this.permit(context))).state;}
 private async revise(context:ActorContext,kind:RevisionRow['kind'],targetKey:string,subjectId:string,input:StageRuleInput|DealForecastInput|QuotaInput,guard:SqlStatement[]){
  const current=await this.permit(context,true),actor=current.principal.kind==='operator'?current.principal.operatorId:'',id=createId(),now=new Date().toISOString();
  const sql:SqlStatement={sql:'INSERT INTO forecast_revisions(id,workspace_id,kind,target_key,subject_id,revision,body_json,actor_id,reason,reviewed_at) SELECT ?,?,?,?,?,COALESCE(MAX(revision),0)+1,?,?,?,? FROM forecast_revisions WHERE workspace_id=? AND kind=? AND target_key=?',bindings:[id,current.workspaceId,kind,targetKey,subjectId,JSON.stringify(input),actor,input.reason,now,current.workspaceId,kind,targetKey]};
  await this.store.commit(current,`forecast.${kind}.reviewed`,id,1,[...guard,sql],{kind,targetKey});
  return {id};
 }
 async setStage(context:ActorContext,input:StageRuleInput){return this.revise(context,'stage',input.stageId,input.stageId,input,this.store.guard('EXISTS(SELECT 1 FROM pipeline_stages WHERE id=?)',[input.stageId]));}
 async setDeal(context:ActorContext,id:string,input:DealForecastInput){return this.revise(context,'deal',id,id,input,this.store.guard('EXISTS(SELECT 1 FROM opportunities WHERE id=?)',[id]));}
 async setQuota(context:ActorContext,input:QuotaInput){return this.revise(context,'quota',`${input.operatorId}:${input.period}:${input.startDate}`,input.operatorId,input,this.store.guard("EXISTS(SELECT 1 FROM operators o WHERE o.id=? AND o.status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators c WHERE c.operator_id=o.id))",[input.operatorId]));}
 private async reviewed(loaded:Loaded,period:ForecastPeriod){return sha256(JSON.stringify({period,clock:loaded.clock,classStamp:loaded.classStamp,state:loaded.state,staleDays:loaded.staleDays}));}
 async preview(context:ActorContext,period:ForecastPeriod):Promise<ForecastPreview>{const current=await this.permit(context),loaded=await this.load(current);return {reviewHash:await this.reviewed(loaded,period),result:calculateForecast(loaded.state,period,new Date().toISOString(),loaded.staleDays)};}
 async saveSnapshot(context:ActorContext,period:ForecastPeriod,reviewHash:string):Promise<ForecastSnapshot>{
  const current=await this.permit(context,true),loaded=await this.load(current),hash=await this.reviewed(loaded,period);
  if(hash!==reviewHash)throw new AccessError('conflict','Forecast inputs changed after preview. Preview and review the current forecast.');
  const asOf=new Date().toISOString(),id=createId(),actorId=current.principal.kind==='operator'?current.principal.operatorId:'',result=calculateForecast(loaded.state,period,asOf,loaded.staleDays);
  const snapshot:ForecastSnapshot={id,...period,asOf,actorId,reviewHash:hash,result};
  const references=JSON.stringify(loaded.references);
  await this.store.commit(current,'forecast.snapshot.created',id,1,[...this.store.guard(`EXISTS(SELECT 1 FROM forecast_source_clock WHERE id=1 AND revision=?) AND ${classStampSql}=?`,[loaded.clock,loaded.classStamp]),{sql:'INSERT INTO forecast_snapshots VALUES(?,?,?,?,?,?,?,?)',bindings:[id,current.workspaceId,period.from,period.through,asOf,actorId,hash,JSON.stringify(snapshot)]},{sql:"INSERT INTO forecast_snapshot_records(snapshot_id,kind,record_id) SELECT ?,json_extract(value,'$.kind'),json_extract(value,'$.id') FROM json_each(?)",bindings:[id,references]}],{from:period.from,through:period.through,reviewHash:hash});
  return snapshot;
 }
 async snapshots(context:ActorContext){const current=await this.permit(context);return {snapshots:(await this.store.mutations.read<ForecastSnapshotMetadata>(current,'SELECT id,from_date AS "from",through_date AS through,as_of AS asOf,actor_id AS actorId,review_hash AS reviewHash FROM forecast_snapshots WHERE workspace_id=? ORDER BY as_of DESC,id DESC',[current.workspaceId])).results};}
 async snapshot(context:ActorContext,id:string):Promise<ForecastSnapshot>{const current=await this.permit(context),row=(await this.store.mutations.read<{body_json:string}>(current,'SELECT body_json FROM forecast_snapshots WHERE workspace_id=? AND id=?',[current.workspaceId,id])).results[0];if(!row)throw new AccessError('validation','Forecast snapshot not found.');return JSON.parse(row.body_json);}
}
