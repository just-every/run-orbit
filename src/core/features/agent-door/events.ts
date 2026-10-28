import type { PlatformBindings } from '../../platform/assets';
import type { AgentEvent } from '../../../base/modules/agent-door/types.ts';
import { orbitPeople } from './people';
/** The queue's native change ID is the retained door event ID. Import/restore
 * custody is excluded from portability, and draining never starts a provider. */
export async function flushNativeChanges(b:PlatformBindings){
 const rows=(await b.DB.prepare('SELECT sequence,id,type,uri,actor,sponsor,at FROM orbit_native_changes ORDER BY sequence LIMIT 200').all<{sequence:number;id:string;type:string;uri:string;actor:string|null;sponsor:string|null;at:string}>()).results;
 for(const row of rows){
  let actor:AgentEvent['actor'];
  if(row.actor)actor={kind:'agent',...JSON.parse(row.actor)};
  else{
   const uri=new URL(row.uri),parts=uri.pathname.split('/').filter(Boolean);let personId=row.sponsor;
   if(!personId&&uri.hostname==='records')personId=(await b.DB.prepare('SELECT t.actor_id FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE r.record_type=? AND r.record_id=? ORDER BY t.recorded_at DESC,t.id DESC LIMIT 1').bind(parts[0],parts[1]).first<{actor_id:string}>())?.actor_id??null;
   if(!personId&&uri.hostname==='drafts')personId=(await b.DB.prepare('SELECT author_id AS id FROM drafts WHERE id=?').bind(parts[0]).first<{id:string}>())?.id??null;
   if(!personId&&uri.hostname==='outreach')personId=(await b.DB.prepare('SELECT operator_id AS id FROM outbound_messages WHERE id=?').bind(parts[0]).first<{id:string}>())?.id??null;
   if(!personId&&uri.hostname==='operations')personId=(await b.DB.prepare('SELECT actor_id AS id FROM handoff_tasks WHERE id=?').bind(parts[0]).first<{id:string}>())?.id??null;
   const person=personId?await orbitPeople(b).person(personId):null;
   if(!person){await b.DB.prepare('DELETE FROM orbit_native_changes WHERE id=?').bind(row.id).run();continue;}
   actor={kind:'person',person:{id:person.id,name:person.name}};
  }
  const event:AgentEvent={id:row.id,type:row.type,uri:row.uri,actor,at:row.at};
  await b.DB.batch([b.DB.prepare('INSERT OR IGNORE INTO agent_door_events(id,uri,event) VALUES(?,?,?)').bind(row.id,row.uri,JSON.stringify(event)),b.DB.prepare('DELETE FROM orbit_native_changes WHERE id=?').bind(row.id)]);
 }
}
