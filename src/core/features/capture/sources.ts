import {createId} from '../../shared/ids';
import {audit} from '../records/shared';
import type {SourceSecurity} from '../../platform/source-security';
import {CaptureError,CaptureProviderError,FILE_SOURCE_ID,type CaptureItem,type CaptureScope,type CaptureSourceAdapter} from './contracts';
import {readItem} from './facts';
import {intake,type CaptureSource} from './intake';

export interface CaptureSummary {captured:number;unlinked:number;replayed:number;conflicts:number;attached:number;stopped:number;bounces:number;proposals:number;skipped:number;skipReasons:Record<string,number>}
const emptySummary=():CaptureSummary=>({captured:0,unlinked:0,replayed:0,conflicts:0,attached:0,stopped:0,bounces:0,proposals:0,skipped:0,skipReasons:{}});

/** Register a source: a signal source for its signals and a capture source for its state. */
async function register(db:D1Database,input:{id:string;adapter:string;name:string;scope:CaptureScope},connection:string,at:string){
 return [
  db.prepare("INSERT INTO signal_sources(id,name,type,enabled,created_at,updated_at) VALUES(?,?,'capture',1,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,enabled=1,updated_at=excluded.updated_at").bind(input.id,input.name,at,at),
  db.prepare(`INSERT INTO capture_sources(id,adapter,name,scope_json,state,connection_id,connected_at,created_at,updated_at) VALUES(?,?,?,?,'connected',?,?,?,?)
   ON CONFLICT(id) DO UPDATE SET adapter=excluded.adapter,name=excluded.name,scope_json=excluded.scope_json,state='connected',connection_id=excluded.connection_id,connected_at=excluded.connected_at,disconnected_at=NULL,last_error=NULL,last_error_at=NULL,updated_at=excluded.updated_at`)
   .bind(input.id,input.adapter,input.name,JSON.stringify(input.scope),connection,at,at,at),
 ];
}
export async function ensureFileSource(db:D1Database){
 const existing=await db.prepare('SELECT id,name,state,connection_id FROM capture_sources WHERE id=?').bind(FILE_SOURCE_ID).first<CaptureSource&{state:string}>();
 if(existing)return existing;
 const at=new Date().toISOString();
 await db.batch(await register(db,{id:FILE_SOURCE_ID,adapter:'file',name:'Mail and calendar files',scope:{mail:{folders:['Files the operator adds']},calendars:['Files the operator adds']}},'files',at));
 return {id:FILE_SOURCE_ID,name:'Mail and calendar files',state:'connected',connection_id:'files'};
}
/** Connect a provider adapter with its credential. The credential is sealed and never leaves the installation. */
export async function connectSource(db:D1Database,input:{id:string;adapter:string;name:string;scope:CaptureScope;credential:string},security:SourceSecurity,actor:string){
 if(!/^capture-[a-z0-9-]{1,60}$/.test(input.id)||input.id===FILE_SOURCE_ID)throw new CaptureError(400,'Choose a capture source ID.');
 const at=new Date().toISOString(),connection=createId();
 await db.batch([...await register(db,input,connection,at),
  db.prepare('INSERT INTO capture_credentials(source_id,ciphertext,updated_at) VALUES(?,?,?) ON CONFLICT(source_id) DO UPDATE SET ciphertext=excluded.ciphertext,updated_at=excluded.updated_at').bind(input.id,await security.seal(input.credential),at),
  audit(db,actor,'capture.connected','capture_source',input.id,{adapter:input.adapter,scope:input.scope})]);
}
/** Disconnecting stops intake at once, deletes the credential and keeps what was already captured. */
export async function disconnectSource(db:D1Database,id:string,actor:string){
 const at=new Date().toISOString();
 const [result]=await db.batch([
  db.prepare("UPDATE capture_sources SET state='disconnected',connection_id=NULL,cursor=NULL,disconnected_at=?,updated_at=? WHERE id=? AND state<>'disconnected'").bind(at,at,id),
  db.prepare('DELETE FROM capture_credentials WHERE source_id=?').bind(id),
  db.prepare("UPDATE signal_sources SET enabled=0,updated_at=? WHERE id=? AND type='capture'").bind(at,id),
  audit(db,actor,'capture.disconnected','capture_source',id),
 ]);
 if(result!.meta.changes!==1)throw new CaptureError(409,'This source is already disconnected or does not exist.');
 return {disconnected:true};
}
export async function listSources(db:D1Database){
 return (await db.prepare(`SELECT c.id,c.adapter,c.name,c.scope_json,c.state,c.last_success_at,c.last_error,c.last_error_at,c.captured_count,c.skipped_count,c.connected_at,c.disconnected_at,
   (SELECT count(*) FROM capture_credentials k WHERE k.source_id=c.id) AS has_credential,
   (SELECT count(*) FROM capture_proposals p JOIN signals s ON s.id=p.signal_id WHERE s.source_id=c.id AND p.status='pending') AS proposals_waiting
   FROM capture_sources c ORDER BY c.created_at,c.id`).all<Record<string,unknown>&{scope_json:string}>()).results.map(({scope_json,...row})=>({...row,scope:JSON.parse(scope_json)}));
}

/** Read every fact in the items and commit each through intake. Stops at once when the source is disconnected. */
export async function captureItems(db:D1Database,source:CaptureSource,items:CaptureItem[],options:{includeUnknown:boolean},summary=emptySummary()){
 for(const item of items)for(const read of await readItem(item)){
  if('skip' in read){summary.skipped++;summary.skipReasons[read.skip]=(summary.skipReasons[read.skip]??0)+1;continue;}
  let outcome;
  try{outcome=await intake(db,source,read.fact,options);}
  catch(error){if(/NOT NULL constraint failed: runtime_controls/.test(String(error)))throw new CaptureError(409,'This source was disconnected; intake stopped.');throw error;}
  if(outcome.result==='skipped'){summary.skipped++;summary.skipReasons[outcome.reason]=(summary.skipReasons[outcome.reason]??0)+1;}
  else if(outcome.result==='replayed')summary.replayed++;
  else if(outcome.result==='conflict')summary.conflicts++;
  else if(outcome.result==='unlinked')summary.unlinked++;
  else{summary.captured++;summary.proposals+=outcome.proposals;summary.stopped+=outcome.stopped;if(outcome.attached)summary.attached++;if(outcome.bounce)summary.bounces++;}
 }
 if(summary.skipped)await db.prepare('UPDATE capture_sources SET skipped_count=skipped_count+?,updated_at=? WHERE id=?').bind(summary.skipped,new Date().toISOString(),source.id).run();
 return summary;
}

/**
 * Pull pages from a provider adapter. The cursor is stored after a page's items
 * commit; a crash before that re-reads the page and replay identity keeps it from
 * duplicating anything. A revoked grant stops intake and shows its error; an
 * outage records its error and changes nothing else.
 */
export async function syncSource(db:D1Database,id:string,adapter:CaptureSourceAdapter,security:SourceSecurity,options:{maxPages?:number}={}){
 const source=await db.prepare('SELECT id,name,state,cursor,connection_id FROM capture_sources WHERE id=?').bind(id).first<CaptureSource&{state:string;cursor:string|null}>();
 if(!source)throw new CaptureError(404,'Capture source not found.');
 if(source.state==='disconnected')throw new CaptureError(409,'This source is disconnected.');
 if(source.state==='error')throw new CaptureError(409,'Reconnect this source to resume intake.');
 const sealed=await db.prepare('SELECT ciphertext FROM capture_credentials WHERE source_id=?').bind(id).first<{ciphertext:string}>();
 if(!sealed)throw new CaptureError(409,'This source has no stored credential; reconnect it.');
 const credential=await security.open(sealed.ciphertext),summary=emptySummary(),current=()=>`id=? AND connection_id IS ? AND state<>'disconnected'`;
 await db.prepare(`UPDATE capture_sources SET state='syncing',updated_at=? WHERE ${current()}`).bind(new Date().toISOString(),id,source.connection_id).run();
 let cursor=source.cursor;
 try{
  for(let page=0;page<(options.maxPages??20);page++){
   const result=await adapter.pull(cursor,credential);
   await captureItems(db,source,result.items,{includeUnknown:false},summary);
   const at=new Date().toISOString();
   await db.prepare(`UPDATE capture_sources SET cursor=?,last_success_at=?,last_error=NULL,last_error_at=NULL,updated_at=? WHERE ${current()}`).bind(result.cursor,at,at,id,source.connection_id).run();
   cursor=result.cursor;if(!result.more)break;
  }
 }catch(error){
  const at=new Date().toISOString();
  if(error instanceof CaptureProviderError){
   await db.prepare(`UPDATE capture_sources SET state=?,last_error=?,last_error_at=?,updated_at=? WHERE ${current()}`).bind(error.code==='revoked'?'error':'connected',error.code==='revoked'?`Access was revoked: ${error.message} Reconnect to resume.`:`Provider unavailable: ${error.message}`,at,at,id,source.connection_id).run();
   return {...summary,halted:error.code};
  }
  await db.prepare(`UPDATE capture_sources SET state='connected',last_error=?,last_error_at=?,updated_at=? WHERE ${current()}`).bind('Intake stopped before finishing; the next sync resumes from the last stored cursor.',at,at,id,source.connection_id).run();
  throw error;
 }
 await db.prepare(`UPDATE capture_sources SET state='connected',updated_at=? WHERE ${current()} AND state='syncing'`).bind(new Date().toISOString(),id,source.connection_id).run();
 return summary;
}
