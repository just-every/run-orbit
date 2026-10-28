import {createId} from '../../shared/ids';
import {recordProviderReply,type ProviderReply} from './provider-replies';
import { IngestionRepository } from '../ingestion/repository';
import {IngestionError,type SignalEvent} from '../ingestion/contracts';
export {type ProviderEvent} from './provider-events';
import {recordProviderEvent,type ProviderEvent} from './provider-events';
export class ProviderRepository {
 constructor(readonly db:D1Database){}
 async event(event:ProviderEvent,hash:string){return recordProviderEvent(this.db,event,hash);}
 async unlinkedReplies(){return (await this.db.prepare('SELECT id,sender,subject,body,occurred_at FROM unlinked_replies WHERE opportunity_id IS NULL ORDER BY occurred_at DESC LIMIT 100').all()).results;}
 async linkReply(id:string,opportunityId:string,actor:string){
  const row=await this.db.prepare('SELECT * FROM unlinked_replies WHERE id=? AND opportunity_id IS NULL').bind(id).first<{provider_event_id:string;sender:string;subject:string;body:string;occurred_at:string;message_id:string;reference_ids:string}>();
  if(!row)throw new IngestionError(409,'Reply is missing or already linked.');if(!await this.db.prepare('SELECT id FROM opportunities WHERE id=?').bind(opportunityId).first())throw new IngestionError(404,'Opportunity not found.');
  const event:SignalEvent={eventId:row.provider_event_id,type:'email.replied',subject:row.subject,occurredAt:row.occurred_at,email:row.sender,record:{type:'opportunity',id:opportunityId},data:{body:row.body,messageId:row.message_id,references:row.reference_ids,linkedBy:actor}};
  const raw=JSON.stringify(event),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw))),b=>b.toString(16).padStart(2,'0')).join('');
  const plan=await new IngestionRepository(this.db).prepare('sendgrid-replies',event,hash,raw);
  const claim=`held_deal_reply:${createId()}`;
  try{await this.db.batch([
   this.db.prepare("INSERT INTO runtime_controls(name,value) SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM unlinked_replies WHERE id=? AND opportunity_id IS NULL) THEN 'claimed' ELSE NULL END").bind(claim,id),
   ...plan.statements,this.db.prepare('UPDATE unlinked_replies SET opportunity_id=? WHERE id=? AND opportunity_id IS NULL').bind(opportunityId,id),this.db.prepare('DELETE FROM runtime_controls WHERE name=?').bind(claim)
  ]);}catch(error){if(/runtime_controls.value/.test(String(error)))throw new IngestionError(409,'Reply is missing or already resolved.');throw error;}
 }
 async reply(input:ProviderReply,hash:string){return recordProviderReply(this.db,input,hash);}
}
