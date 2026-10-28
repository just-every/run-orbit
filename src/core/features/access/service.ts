import {salesProfile} from '../teams/policy';
import {salesOperationAllowed} from '../teams/permissions';
import {salesCanRead,salesCanEdit} from '../teams/record-access';
import type {AccessPort,ActorContext,NativeOperator,ResourceRef,AccessDecision,SqlStatement} from '../../shared/expansion-contracts';
import {AccessError,deny} from './errors';
import {matches,roleAllows} from './policy';
import {privatePaths,coversPrivatePath,grantCovers} from './field-policy';
import {isFullOperator,fullOperatorFence} from './identity-class';
interface GrantRow{id:string;expires_at:string|null;resource_type:string;resource_id:string;actions_json:string;fields_json:string}
/** Native full operators and explicitly accepted collaborators share session verification, never class. */
export class AccessService implements AccessPort{
 private readonly dependencies=new WeakMap<ActorContext,Map<string,SqlStatement[]>>();
 private readonly grantFences=new WeakMap<ActorContext,Set<string>>();
 constructor(readonly db:D1Database){}
 addDependencyFences(c:ActorContext,statements:SqlStatement[],key:string){const map=this.dependencies.get(c)??new Map();map.set(key,statements);this.dependencies.set(c,map);}
 async verifySession(operatorId:string,sessionId:string){if(!await this.db.prepare("SELECT 1 FROM sessions s JOIN operators o ON o.id=s.operator_id WHERE s.id=? AND s.operator_id=? AND s.revoked_at IS NULL AND s.expires_at>? AND o.status='active'").bind(sessionId,operatorId,new Date().toISOString()).first())deny('The native session is expired or revoked.');}
 async originalWorkspace(){const row=await this.db.prepare('SELECT tenant_id,workspace_id FROM access_legacy_mapping WHERE singleton=1').first<{tenant_id:string;workspace_id:string}>();if(!row)throw new AccessError('prerequisite','Initialize the native workspace first.');return{tenantId:row.tenant_id,workspaceId:row.workspace_id};}
 async listWorkspaces(operator:NativeOperator){const scope=await this.originalWorkspace();await this.verifySession(operator.operatorId,operator.sessionId);const row=await this.db.prepare("SELECT w.name FROM access_workspaces w JOIN access_memberships m ON m.workspace_id=w.id WHERE w.id=? AND m.operator_id=? AND m.status='active'").bind(scope.workspaceId,operator.operatorId).first<{name:string}>();return row?[{...scope,name:row.name}]:[];}
 async resolveOperatorContext(operator:NativeOperator,workspaceId:string,requestId:string):Promise<ActorContext>{const scope=await this.originalWorkspace();if(scope.workspaceId!==workspaceId)deny();await this.verifySession(operator.operatorId,operator.sessionId);const row=await this.db.prepare("SELECT w.policy_epoch FROM access_workspaces w JOIN access_memberships m ON m.workspace_id=w.id WHERE w.id=? AND m.operator_id=? AND m.status='active'").bind(workspaceId,operator.operatorId).first<{policy_epoch:number}>();if(!row)deny('Accept the invitation before entering this workspace.');return{...scope,requestId,policyEpoch:row.policy_epoch,principal:{kind:'operator',operatorId:operator.operatorId,sessionId:operator.sessionId}};}
 async refreshContext(c:ActorContext):Promise<ActorContext>{if(c.principal.kind!=='operator')deny('This surface requires a native session.');const current=await this.resolveOperatorContext({operatorId:c.principal.operatorId,sessionId:c.principal.sessionId,email:'',displayName:''},c.workspaceId,c.requestId);if(current.tenantId!==c.tenantId)deny();return current;}
 async grants(c:ActorContext):Promise<GrantRow[]>{if(c.principal.kind!=='operator')deny();return(await this.db.prepare("SELECT * FROM access_grants WHERE workspace_id=? AND tenant_id=? AND subject_kind='operator' AND subject_id=? AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>?)").bind(c.workspaceId,c.tenantId,c.principal.operatorId,new Date().toISOString()).all<GrantRow>()).results;}
 async authorize(c:ActorContext,operation:string,resource:ResourceRef,fields:readonly string[]):Promise<AccessDecision>{
  const current=await this.refreshContext(c);if(current.policyEpoch!==c.policyEpoch)throw new AccessError('conflict','Permissions changed; refresh workspace context.');if(resource.tenantId!==c.tenantId||resource.workspaceId!==c.workspaceId)deny();
  if(c.principal.kind!=='operator')deny();
  if(await isFullOperator(this.db,c.principal.operatorId)){this.addDependencyFences(c,fullOperatorFence(c),'native-class');return{allowedFields:[...fields],policyEpoch:c.policyEpoch,dependencies:[]};}
  const sales=await salesProfile(this.db,c.principal.operatorId);
  if(sales){
   if(!salesOperationAllowed(sales,operation))deny('Your sales role does not permit this action.');
   if(['contact','company','opportunity'].includes(resource.type)){
    const allowed=operation==='graph.update'?await salesCanEdit(this.db,c.principal.operatorId,resource.type,resource.id,fields):await salesCanRead(this.db,c.principal.operatorId,resource.type,resource.id,fields);
    if(!allowed)deny('Record or field access is not permitted.');
   }
   return{allowedFields:[...fields],policyEpoch:c.policyEpoch,dependencies:[]};
  }
  const member=await this.db.prepare("SELECT role FROM access_memberships WHERE workspace_id=? AND operator_id=? AND status='active'").bind(c.workspaceId,c.principal.operatorId).first<{role:string}>();
  const bundle=await this.db.prepare('SELECT actions_json,fields_json FROM access_role_bundles WHERE workspace_id=? AND role=?').bind(c.workspaceId,member?.role??'guest').first<{actions_json:string;fields_json:string}>();
  let role=bundle?JSON.parse(bundle.actions_json).includes(operation):roleAllows(member?.role??'guest',operation);
  const record=await this.db.prepare('SELECT visibility,owner_id,retired_into_id,fields_json FROM graph_records WHERE workspace_id=? AND id=? AND kind=?').bind(c.workspaceId,resource.id,resource.type).first<{visibility:string;owner_id:string|null;retired_into_id:string|null;fields_json:string}>();
  if(record?.retired_into_id)deny('Record is retired.');if(record?.visibility==='restricted'&&record.owner_id!==c.principal.operatorId)role=false;
  const relevant=(await this.grants(c)).filter(g=>matches(g.resource_type,resource.type)&&matches(g.resource_id,resource.id)&&JSON.parse(g.actions_json).includes(operation));
  if(!role&&!relevant.length)deny();
  const schema=await this.db.prepare('SELECT fields_json FROM schema_types WHERE workspace_id=? AND name=?').bind(c.workspaceId,resource.type).first<{fields_json:string}>();const definitions:Record<string,{sensitivity?:string}>=JSON.parse(schema?.fields_json??'{}');
  const grantFields:string[]=relevant.flatMap(g=>JSON.parse(g.fields_json)),recordFields:Record<string,unknown>=JSON.parse(record?.fields_json??'{}');
  const allowedFields=fields.filter(field=>(role&&(!bundle||JSON.parse(bundle.fields_json).some((p:string)=>matches(p,field)))||grantFields.includes('*')||grantFields.some(granted=>grantCovers(granted,field)))&&privatePaths(field,definitions,recordFields).every(path=>grantFields.some(pattern=>coversPrivatePath(pattern,path))));
  if(allowedFields.length!==fields.length)deny('One or more requested fields are restricted.');
  const used=this.grantFences.get(c)??new Set<string>();for(const grant of relevant)used.add(grant.id);this.grantFences.set(c,used);
  return{allowedFields,policyEpoch:c.policyEpoch,dependencies:[]};
 }
 // Full native reads depend on the live native-class fence, not unrelated collaborator grants.
 // Writes and restricted reads still bind the exact policy epoch.
 fence(c:ActorContext,mode:'read'|'write'='write'):SqlStatement[]{if(c.principal.kind!=='operator')deny();const id=crypto.randomUUID(),now=new Date().toISOString(),grants=[...(this.grantFences.get(c)??[])],nativeRead=mode==='read'&&this.dependencies.get(c)?.has('native-class')===true;return[{sql:"INSERT INTO access_write_guards VALUES(?,CASE WHEN EXISTS(SELECT 1 FROM access_workspaces w JOIN access_memberships m ON m.workspace_id=w.id JOIN operators o ON o.id=m.operator_id JOIN sessions s ON s.operator_id=o.id WHERE w.id=? AND w.tenant_id=? AND (w.policy_epoch=? OR ?=1) AND m.operator_id=? AND m.status='active' AND o.status='active' AND s.id=? AND s.revoked_at IS NULL AND s.expires_at>max(?,strftime('%Y-%m-%dT%H:%M:%fZ','now'))) AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) AND (SELECT count(*) FROM access_grants WHERE id IN(SELECT value FROM json_each(?)) AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>max(?,strftime('%Y-%m-%dT%H:%M:%fZ','now'))))=? THEN 1 ELSE 0 END)",bindings:[id,c.workspaceId,c.tenantId,c.policyEpoch,nativeRead?1:0,c.principal.operatorId,c.principal.sessionId,now,JSON.stringify(grants),now,grants.length]},{sql:'DELETE FROM access_write_guards WHERE id=?',bindings:[id]},...[...(this.dependencies.get(c)?.values()??[])].flat()];}
 async authorizeLegacy(operator:NativeOperator,requestId:string,operation='legacy.read'){const scope=await this.originalWorkspace(),c=await this.resolveOperatorContext(operator,scope.workspaceId,requestId);await this.authorize(c,operation,{...scope,type:'legacy',id:'*'},[]);return c;}
}
