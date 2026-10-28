import {localState} from './credentials';
import {apiScope,type ApiCredential} from '../api/authority';
import type { ToolContext, ResourceContext } from '../../../base/modules/agent-door/types.ts';
import { ToolRefusal } from '../../../base/modules/agent-door/index.ts';
import type { AgentActor } from '../identity/session';
import { version } from '../identity/store';
import { AccessService } from '../access/service';
import { isFullOperator } from '../access/identity-class';
import { domainEventStatements } from '../effects/event-statements';
import { GraphRecords } from '../graph/repository';

export const machineActor=(ctx:ToolContext):AgentActor=>({kind:'agent',operatorId:ctx.person.id,agentId:ctx.agent.id,email:ctx.person.email,displayName:ctx.person.name,devSession:false});
export async function full(ctx:Pick<ToolContext,'db'|'person'>){if(!await isFullOperator(ctx.db,ctx.person.id))throw new ToolRefusal('native_permission');}
export async function record(ctx:ToolContext|ResourceContext,kind:string,id:string,fields:string[]=[]){
 const local=await localState(ctx.db,ctx);
 if(local?.type==='api'){if(kind!=='opportunity')throw new ToolRefusal('not_found');const credential=local.row as ApiCredential;fields=fields.length?fields:JSON.parse(credential.fields_json);apiScope(credential,'deal.read',id,fields);}
 const access=new AccessService(ctx.db),c=await access.resolveAgentContext(ctx.person.id,ctx.agent.id,crypto.randomUUID());
 try{return await new GraphRecords(ctx.db,access,domainEventStatements).getRecord(c,{...c,type:kind,id},fields);}catch{throw new ToolRefusal('not_found');}
}
export async function nativeCall<T>(run:()=>Promise<T>):Promise<T>{try{return await run();}catch(e){
 if(e instanceof ToolRefusal)throw e;
 const status=(e as {status?:number}).status;
 throw new ToolRefusal(status===409?'native_conflict':status===404||status===403?'not_found':status===400?'invalid_arguments':'native_unavailable');
}}
/** Each native commit rechecks current sponsor/class and binds native history to
 * its real agent preparer. D1 executes the entire context/effect/clear batch atomically. */
export async function agentDatabase(ctx:ToolContext,{fullOperator=true}:{fullOperator?:boolean}={}):Promise<D1Database>{
 const db=ctx.db,row=await db.prepare(`SELECT ${version('o')} AS version FROM operators o WHERE o.id=? AND o.status='active'`).bind(ctx.person.id).first<{version:number}>();
 if(!row)throw new ToolRefusal('unauthenticated');
 if(fullOperator)await full(ctx);
 const prepared=new WeakMap<D1PreparedStatement,D1PreparedStatement>();
 const commit=async(statements:D1PreparedStatement[])=>{
  const guard=crypto.randomUUID();
  const result=await db.batch([
   db.prepare(`INSERT INTO access_write_guards VALUES(?,CASE WHEN EXISTS(SELECT 1 FROM operators o WHERE o.id=? AND o.status='active' AND ${version('o')}=? ${fullOperator?"AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=o.id)":''}) AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import')) AND NOT EXISTS(SELECT 1 FROM agent_door_state s WHERE s.local_paused=1 OR json_extract(s.envelope,'$.paused')=1 OR json_extract(s.envelope,'$.exp')<=unixepoch() OR EXISTS(SELECT 1 FROM json_each(s.envelope,'$.revoked.agents') WHERE value=?) OR EXISTS(SELECT 1 FROM json_each(s.envelope,'$.revoked.consents') WHERE value=?)) AND NOT EXISTS(SELECT 1 FROM agent_door_agents WHERE id=? AND revoked=1) THEN 1 ELSE 0 END)`).bind(guard,ctx.person.id,row.version,ctx.agent.id,ctx.consent??null,ctx.agent.id),
   db.prepare('INSERT INTO orbit_agent_context VALUES(1,?,?,?)').bind(JSON.stringify({...ctx.actor,approvers:ctx.approvers}),JSON.stringify({person:{id:ctx.person.id},agent:ctx.agent,scopes:ctx.scopes,consent:ctx.consent,clientId:ctx.clientId}),ctx.door),
   ...statements.map(s=>prepared.get(s)??s),
   db.prepare('DELETE FROM orbit_agent_context WHERE id=1'),db.prepare('DELETE FROM access_write_guards WHERE id=?').bind(guard)
  ]);
  return result.slice(2,2+statements.length);
 };
 const wrap=(sql:string,values:unknown[]=[]):D1PreparedStatement=>{
  // Set the machine actor before native INSERT/FTS triggers run. Attribution
  // is an immutable sidecar, avoiding a second update of native timeline text.
  if(/^\s*INSERT\s+(?:OR\s+\w+\s+)?INTO\s+timeline_entries\b/i.test(sql))sql=sql.replace("'operator'","'agent'");
  const raw=db.prepare(sql).bind(...values);
  const execute=async()=>(await commit([raw]))[0];
  const wrapped={bind:(...args:unknown[])=>wrap(sql,args),
   first:async(column?:string)=>{const row=(await execute()).results[0] as Record<string,unknown>|undefined;return column===undefined?row??null:row?.[column]??null;},
   all:execute,raw:async(options?:{columnNames?:boolean})=>{const rows=(await execute()).results as Record<string,unknown>[];return[...(options?.columnNames&&rows.length?[Object.keys(rows[0])]:[]),...rows.map(row=>Object.values(row))];},run:execute} as D1PreparedStatement;
  prepared.set(wrapped,raw);return wrapped;
 };
 return {prepare:wrap,batch:commit,exec:()=>{throw new ToolRefusal('native_permission');},dump:()=>{throw new ToolRefusal('native_permission');}} as unknown as D1Database;
}
