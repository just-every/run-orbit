import type { AgentDoorOptions, Principal, ResourceContext, ToolContext } from '../../../base/modules/agent-door/types.ts';
import { ToolRefusal } from '../../../base/modules/agent-door/index.ts';
import { bearer, currentGrant } from '../delegation/authority';
import { authenticateApi, apiScope, type ApiCredential } from '../api/authority';
import { scoped, hash, type Grant } from '../delegation/protocol';
import { systemClock } from '../../platform/clock';
const mapped=(type:string,row:Grant|ApiCredential)=>type==='delegation'
 ? [...(JSON.parse((row as Grant).scopes_json).includes('crm.evidence.read')?['orbit.records.read','orbit.handoffs.read','orbit.signals.read']:[]),...(JSON.parse((row as Grant).scopes_json).includes('crm.handoff.write')?['orbit.handoffs.write']:[])]
 : [...(JSON.parse((row as ApiCredential).operations_json).includes('deal.read')?['orbit.records.read']:[]),...(JSON.parse((row as ApiCredential).operations_json).some((v:string)=>v==='deal.create'||v==='deal.update')?['orbit.records.write']:[])];
async function fingerprint(type:string,row:Grant|ApiCredential){const value=type==='delegation'?['principal_id','client_id','account_id','scopes_json','targets_json','expires_at','token_hash']:['installation_id','principal_id','operations_json','records_json','fields_json','verifier','expires_at','revision'];return hash(JSON.stringify(value.map(key=>(row as unknown as Record<string,unknown>)[key])));}
export const localCredentials=(db:D1Database):NonNullable<AgentDoorOptions['localCredentials']>=>async request=>{
 try{
  const isApi=request.headers.get('authorization')?.startsWith('Bearer orbit_api_'),row=isApi?await authenticateApi(db,request,systemClock):await bearer(db,request),type=isApi?'api':'delegation',scopes=mapped(type,row);
  const clientId=`${type}:${row.id}:${await fingerprint(type,row)}`;
  return{sponsor:{id:row.principal_id},agent:{id:`${type}:${row.id}`,name:isApi?'Orbit API client':'Delegated sales client',specialist:'sales rep'},scopes,clientId};
 }catch{return null;}
};
export async function localState(db:D1Database,principal:Pick<Principal,'clientId'|'person'>){
 if(!principal.clientId?.startsWith('api:')&&!principal.clientId?.startsWith('delegation:'))return null;
 const [type,id,digest]=principal.clientId.split(':');
 try{
  const row=type==='delegation'?await currentGrant(db,id):await db.prepare("SELECT a.* FROM api_credentials a WHERE a.id=? AND a.revoked_at IS NULL AND a.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now') AND EXISTS(SELECT 1 FROM delegation_installation i WHERE i.id=a.installation_id) AND EXISTS(SELECT 1 FROM operators o WHERE o.id=a.principal_id AND o.status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=o.id))").bind(id).first<ApiCredential>();
  if(!row||row.principal_id!==principal.person.id||await fingerprint(type,row)!==digest)throw new Error();
  return{type,row};
 }catch{throw new ToolRefusal('unauthenticated');}
}
export const currentScopes=(db:D1Database):NonNullable<AgentDoorOptions['currentScopes']>=>async principal=>{
 try{const state=await localState(db,principal);return state?mapped(state.type,state.row):principal.scopes;}catch{return[];}
};
export async function localFence(name:string,args:Record<string,unknown>,ctx:ToolContext|ResourceContext){
 const state=await localState(ctx.db,ctx);if(!state)return;
 if(state.type==='delegation'){
  const target=typeof args.target==='string'?args.target:typeof args.id==='string'?`${args.kind==='contact'?'contacts':args.kind==='company'?'companies':args.kind==='opportunity'?'opportunities':'signals'}/${args.id}`:null;
  if(!target)throw new ToolRefusal('native_permission');
  scoped(state.row as Grant,target,name==='orbit.handoffs.upsert'?'crm.handoff.write':'crm.evidence.read');
 }else{
  if(args.kind!=='opportunity'&&args.kind!==undefined)throw new ToolRefusal('native_permission');
  const operation=name==='orbit.records.create'?'deal.create':name==='orbit.records.update'?'deal.update':'deal.read';
  apiScope(state.row as ApiCredential,operation,typeof args.id==='string'?args.id:undefined,Array.isArray(args.fields)?args.fields as string[]:Object.keys((args.patch??args.fields??{}) as object));
 }
}
