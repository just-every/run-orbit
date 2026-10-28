import type {AuthenticatedOperator} from '../identity';
import {privatePaths,coversPrivatePath} from '../access/field-policy';
import {AccessService} from '../access/service';
import {RecordError} from '../records/shared';
import {salesProfile,teamIds,teamMembers,type SalesProfile} from '../teams/policy';
import {salesOperationAllowed} from '../teams/permissions';
import {salesCanRead,salesCanEdit,salesRowPolicy,salesScopedFieldPolicy,salesFieldAllowed} from '../teams/record-access';
import type {ImportPlan,D1Sql,TargetEffect} from '../../../modules/import-kit/d1/index';
import {sql,type NativeValue} from './targets';
import type {StopValue} from './targets-stop';
const refused=()=>new RecordError(403,'This import contains records, owners or fields outside your current sales permissions.');
const nativeKind=(kind:string)=>kind==='deal'?'opportunity':kind;
function fields(value:NativeValue){const selected=Object.keys(value.row);if(typeof value.row.custom_fields_json==='string')for(const name of Object.keys(JSON.parse(value.row.custom_fields_json)))selected.push('custom_fields_json.'+name);return selected;}
/** A plan is private to its actor, but its authority is always the actor's current authority. */
export class ImportAdmission {
 profile:SalesProfile|null=null;
 epoch=0;
 guards:D1Sql[]=[];
 constructor(readonly db:D1Database,readonly actor:AuthenticatedOperator){}
 async begin(){
  const access=new AccessService(this.db),workspace=await access.originalWorkspace(),context=await access.resolveOperatorContext(this.actor,workspace.workspaceId,crypto.randomUUID());
  this.profile=await salesProfile(this.db,this.actor.operatorId);this.epoch=context.policyEpoch;this.guards=[];
  if(this.profile&&!salesOperationAllowed(this.profile,'import'))throw refused();
  await access.authorize(context,'import',{...workspace,type:'legacy',id:'*'},[]);
 }
 predicate(){return sql(`EXISTS(SELECT 1 FROM access_workspaces WHERE id='workspace' AND policy_epoch=?)${this.guards.map(g=>` AND (${g.sql})`).join('')}`,this.epoch,...this.guards.flatMap(g=>g.params??[]));}
 async plan(plan:ImportPlan,write=false){
  const profile=this.profile;if(!profile)return;
  const effects=plan.entries.flatMap(e=>e.effects),candidates=new Map<string,TargetEffect>();
  for(const effect of effects)if(['contact','company','deal'].includes(effect.targetKind))candidates.set(nativeKind(effect.targetKind)+':'+effect.targetId,effect);
  const ownTeams=await teamIds(this.db,this.actor.operatorId),allowedOwners=new Set(profile.scope==='assigned'?[this.actor.operatorId]:(await Promise.all(ownTeams.map(id=>teamMembers(this.db,id)))).flat());
  const required=new Map<string,{kind:string;id:string;fields:Set<string>;write:boolean;owner?:string|null}>(),privateNotes:string[]=[];
  const require=(kind:string,id:string,names:string[],edit=false)=>{const key=kind+':'+id,item=required.get(key)??{kind,id,fields:new Set<string>(),write:false,owner:undefined};names.forEach(f=>item.fields.add(f));item.write||=edit;required.set(key,item);};
  for(const effect of effects){const value=effect.value as unknown as NativeValue,kind=nativeKind(effect.targetKind);
   if(['contact','company','opportunity'].includes(kind)){
    require(kind,effect.targetId,fields(value),write);
    if(value.row.company_id)require('company',value.row.company_id,['id']);
    if(kind==='opportunity')for(const link of value.links)require('contact',link.contact_id,['id']);
   }else if(kind==='reference'){
    const reference=value.row;if(['contact','company','deal'].includes(reference.record_kind))require(nativeKind(reference.record_kind),reference.record_id,reference.record_kind==='contact'?['id','email']:reference.record_kind==='company'?['id','primary_domain']:['id']);
   }else if(kind==='suppression'){
    for(const contact of (effect.value as unknown as StopValue).contacts)require('contact',contact.id,['email','contactability'],write);
   }else if(kind==='note'){
    privateNotes.push(effect.targetId);
    for(const link of value.links)require(link.record_type,link.record_id,['payload_json'],write);
   }
  }
  if(write&&effects.length&&profile.role==='read-only')throw refused();
  
  for(const item of required.values()){
   const names=[...item.fields],existing=await this.db.prepare("SELECT COALESCE((SELECT own.owner_id FROM record_ownership own WHERE own.record_type=graph_records.kind AND own.record_id=graph_records.id),json_extract(fields_json,'$.owner_id'),owner_id) AS owner FROM graph_records WHERE workspace_id='workspace' AND kind=? AND id=? AND retired_into_id IS NULL").bind(item.kind,item.id).first<{owner:string|null}>();
   if(existing){item.owner=existing.owner;if(!await (item.write?salesCanEdit:salesCanRead)(this.db,this.actor.operatorId,item.kind,item.id,names))throw refused();}
   else{
    const candidate=candidates.get(item.kind+':'+item.id);if(!candidate)throw refused();
    const value=candidate.value as unknown as NativeValue,owner=item.kind==='opportunity'?value.row.owner_id:value.ownership?.owner_id;
    item.owner=owner??null;
    if(profile.scope!=='all'&&(!owner||!allowedOwners.has(owner)))throw refused();
    if(names.some(field=>!salesFieldAllowed(profile,field)))throw refused();
    const schema=await this.db.prepare("SELECT fields_json FROM schema_types WHERE workspace_id='workspace' AND name=?").bind(item.kind).first<{fields_json:string}>();
    if(names.some(field=>privatePaths(field,JSON.parse(schema?.fields_json??'{}'),value.row).some(path=>!profile.fields.some(grant=>coversPrivatePath(grant,path)))))throw refused();
    if(owner){const active=await this.db.prepare("SELECT 1 FROM operators o WHERE id=? AND status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators x WHERE x.operator_id=o.id)").bind(owner).first();if(!active)throw refused();}
   }
  }
  // These predicates run before and after each native kit transaction, including undo.
  const row=await salesRowPolicy(this.db,this.actor.operatorId),field=await salesScopedFieldPolicy(this.db,this.actor.operatorId,'requested.value');
  this.guards.push(sql(`NOT EXISTS(SELECT 1 FROM json_each(?) item JOIN graph_records r ON r.workspace_id='workspace' AND r.kind=json_extract(item.value,'$.kind') AND r.id=json_extract(item.value,'$.id') WHERE COALESCE((SELECT own.owner_id FROM record_ownership own WHERE own.record_type=r.kind AND own.record_id=r.id),json_extract(r.fields_json,'$.owner_id'),r.owner_id) IS NOT json_extract(item.value,'$.owner') OR NOT (${row.sql}) OR EXISTS(SELECT 1 FROM json_each(item.value,'$.fields') requested WHERE NOT (${field.sql})))`,JSON.stringify([...required.values()].map(r=>({kind:r.kind,id:r.id,fields:[...r.fields],owner:r.owner??null}))),...row.bindings,...field.bindings));
  if(privateNotes.length){if(await this.db.prepare("SELECT 1 FROM entry_privacy WHERE source='entry' AND entry_id IN(SELECT value FROM json_each(?)) AND author_id<>?").bind(JSON.stringify(privateNotes),this.actor.operatorId).first())throw refused();this.guards.push(sql("NOT EXISTS(SELECT 1 FROM entry_privacy WHERE source='entry' AND entry_id IN(SELECT value FROM json_each(?)) AND author_id<>?)",JSON.stringify(privateNotes),this.actor.operatorId));}
 }
 async assertCurrent(){const p=this.predicate();if(!(await this.db.prepare(`SELECT (${p.sql}) AS ok`).bind(...p.params??[]).first<{ok:number}>())?.ok)throw refused();}
}
