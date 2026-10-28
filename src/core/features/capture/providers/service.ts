import {sourceConnectionAccess,sourcePollAccess} from '../source-access';
import {reconcileWritebacks} from './writeback-reconcile';
import {audit} from '../../records/shared';
import type {AuthenticatedOperator} from '../../identity';
import {createId} from '../../../shared/ids';
import type {SourceSecurity} from '../../../platform/source-security';
import {CaptureError,CaptureProviderError,type CaptureScope,type CaptureSourceAdapter} from '../contracts';
import {syncSource} from '../sources';
import {providerId,type ProviderFetch} from './config';
import {leaseSource,providerSession,type ProviderSource} from './session';
import {googleMail,googleCalendar,googleOptions,validateGoogleScope} from './google';
import {microsoftPage,microsoftOptions,validateMicrosoftScope} from './microsoft';
interface Progress{turn:number;done:string[];parts:Record<string,any>}
export function sourceAdapter(source:ProviderSource,session:ReturnType<typeof providerSession>):CaptureSourceAdapter{
 const scope=JSON.parse(source.scope_json) as CaptureScope,tasks=[...(scope.mail?.folders??[]).map(id=>({kind:'mail' as const,id})),...(scope.calendars??[]).map(id=>({kind:'calendar' as const,id}))];
 return {adapter:source.adapter,scope,async pull(raw){
  if(!tasks.length)throw new CaptureError(409,'Choose the labels, folders or calendars to read first.');
  const progress:Progress=raw?JSON.parse(raw):{turn:0,done:[],parts:{}};
  if(progress.done.length===tasks.length)progress.done=[];
  let task=tasks[progress.turn%tasks.length]!;
  while(progress.done.includes(`${task.kind}:${task.id}`)){progress.turn=(progress.turn+1)%tasks.length;task=tasks[progress.turn]!;}
  const key=`${task.kind}:${task.id}`,cursor=progress.parts[key]??{};
  const result=source.adapter==='google'?(task.kind==='mail'?await googleMail(session,task.id,cursor):await googleCalendar(session,task.id,cursor,scope)):await microsoftPage(session,task.kind,task.id,cursor,scope);
  progress.parts[key]=result.cursor;if(!result.more)progress.done.push(key);progress.turn=(progress.turn+1)%tasks.length;
  return {items:result.items,cursor:JSON.stringify(progress),more:progress.done.length<tasks.length};
 }};
}
export async function readProviderSource(db:D1Database,id:string){
 const source=await db.prepare('SELECT id,name,adapter,scope_json,state,connection_id,cursor FROM capture_sources WHERE id=?').bind(id).first<ProviderSource>();
 if(!source)throw new CaptureError(404,'Capture source not found.');providerId(source.adapter);
 if(source.state==='disconnected'||!source.connection_id)throw new CaptureError(409,'This source is disconnected.');
 if(source.state==='error')throw new CaptureError(409,'Reconnect this source to resume intake.');
 return source;
}
async function withProvider<T>(db:D1Database,id:string,security:SourceSecurity,fetcher:ProviderFetch,run:(source:ProviderSource,session:ReturnType<typeof providerSession>)=>Promise<T>){
 const source=await readProviderSource(db,id),lease=await leaseSource(db,id),session=providerSession(db,source,lease,security,fetcher);
 try{return await run(source,session);}catch(error){
  if(error instanceof CaptureProviderError)await db.prepare(`UPDATE capture_sources SET state=?,last_error=?,last_error_at=?,updated_at=? WHERE id=? AND connection_id IS ? AND EXISTS(SELECT 1 FROM capture_locks WHERE source_id=? AND lease=? AND expires_at>?)`).bind(error.code==='revoked'?'error':'connected',error.code==='revoked'?`${error.authorizationAttention?'Authorization requires attention':'Access was revoked'}: ${error.message} Reconnect to resume.`:'Provider unavailable: Try again later.',new Date().toISOString(),new Date().toISOString(),id,source.connection_id,id,lease,Date.now()).run();
  throw error;
 }finally{await db.prepare('DELETE FROM capture_locks WHERE source_id=? AND lease=?').bind(id,lease).run();}
}
export function providerOptions(db:D1Database,id:string,security:SourceSecurity,fetcher:ProviderFetch,continuation?:string){return withProvider(db,id,security,fetcher,(source,session)=>source.adapter==='google'?googleOptions(session,continuation):microsoftOptions(session,continuation));}
export function selectScope(db:D1Database,id:string,scope:CaptureScope,security:SourceSecurity,fetcher:ProviderFetch,actor:AuthenticatedOperator){return withProvider(db,id,security,fetcher,async(source,session)=>{
 const accessFences=await sourceConnectionAccess(db,actor,id);await db.batch(accessFences);
 if((scope.calendars?.length??0)>0&&!scope.calendarWindow)throw new CaptureError(400,'Choose a fixed start and end date for calendars.');
 if(source.adapter==='google')await validateGoogleScope(session,scope);else await validateMicrosoftScope(session,scope);
 await session.check();
 const fence=[...accessFences,db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'capture_scope_fence',NULL WHERE NOT EXISTS(SELECT 1 FROM capture_sources WHERE id=? AND connection_id IS ? AND state IN('connected','syncing'))").bind(id,source.connection_id)];
 const results=await db.batch([...fence,db.prepare(`UPDATE capture_sources SET scope_json=?,cursor=NULL,connection_id=?,last_error=NULL,last_error_at=NULL,updated_at=? WHERE id=? AND connection_id IS ? AND state IN('connected','syncing')`).bind(JSON.stringify(scope),createId(),new Date().toISOString(),id,source.connection_id),db.prepare('DELETE FROM capture_oauth WHERE source_id=?').bind(id),audit(db,actor.operatorId,'capture.scope_changed','capture_source',id,{scope})]);
 if(results[fence.length]!.meta.changes!==1)throw new CaptureError(409,'The provider connection changed. Choose its scope again.');
 return {saved:true,scope};
 });}
export async function syncProvider(db:D1Database,id:string,security:SourceSecurity,fetcher:ProviderFetch=fetch,maxPages=4){
 await sourcePollAccess(db,id);
 const source=await readProviderSource(db,id),scope=JSON.parse(source.scope_json) as CaptureScope;
 if(!(scope.mail?.folders?.length||scope.calendars?.length))throw new CaptureError(409,'Choose the labels, folders or calendars to read first.');
 const result=await syncSource(db,id,(current,lease)=>sourceAdapter(current,providerSession(db,current,lease,security,fetcher)),security,{maxPages});
 if(!('halted' in result))await withProvider(db,id,security,fetcher,(current,session)=>reconcileWritebacks(db,current,session));
 return result;
}
export async function pollProviders(db:D1Database,security:SourceSecurity|undefined){
 if(!security)return;
 if(await db.prepare("SELECT 1 FROM runtime_controls WHERE name='archive_import'").first())return;
 await db.prepare('DELETE FROM capture_oauth WHERE expires_at<?').bind(Date.now()).run();
 const sources=(await db.prepare(`SELECT id FROM capture_sources WHERE adapter IN('google','microsoft') AND state IN('connected','syncing') AND EXISTS(SELECT 1 FROM capture_credentials WHERE source_id=capture_sources.id) AND (json_array_length(scope_json,'$.mail.folders')>0 OR json_array_length(scope_json,'$.calendars')>0) ORDER BY updated_at,id LIMIT 4`).all<{id:string}>()).results;
 for(const source of sources){try{await syncProvider(db,source.id,security,fetch,1);}catch{/* Durable status records provider failures; contention waits until the next minute. */}}
}
