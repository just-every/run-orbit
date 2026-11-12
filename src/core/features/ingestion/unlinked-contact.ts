import {RecordsRepository} from '../records/repository';
import {RecordError,timeline} from '../records/shared';
import {eventSchema,IngestionError,type SignalEvent} from './contracts';
import {IngestionRepository} from './repository';
import {isTestEvent} from '../signals/test-events';

/** Create and link in one commit: captured evidence never grants contact permission. */
export async function createContactFromSignal(db:D1Database,signalId:string,actor:string){
 const signal=await db.prepare(`SELECT s.payload_json,s.source_event_id,s.type,s.subject,s.occurred_at
  FROM signals s JOIN unlinked_signals u ON u.signal_id=s.id WHERE s.id=? AND u.resolved_at IS NULL`).bind(signalId).first<{payload_json:string;source_event_id:string;type:string;subject:string;occurred_at:string}>();
 if(!signal)throw new IngestionError(409,'Event is already linked or missing.');
 const event={...JSON.parse(signal.payload_json),eventId:signal.source_event_id,type:signal.type,subject:signal.subject,occurredAt:signal.occurred_at} as SignalEvent;
 if(isTestEvent(event))throw new IngestionError(409,'Source connection tests cannot become customer evidence.');
 if(['page.viewed','chat.started','content.downloaded'].includes(event.type)&&!event.identityBasis)throw new IngestionError(409,'A source-held visitor identity basis is required.');
 const checked=eventSchema.safeParse(event);
 if(!checked.success||!checked.data.email)throw new IngestionError(400,'This event needs a valid sender email to create a contact.');
 const name=typeof event.data?.name==='string'?event.data.name:checked.data.email;
 try{
  const prepared=await new RecordsRepository(db).prepareSave('contact',{name,email:checked.data.email,contactability:'do_not_contact'},actor,undefined,{ordinaryEdit:true});
  const at=new Date().toISOString(),id=prepared.id;
  await db.batch([
   db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'unlinked_contact_current',NULL WHERE NOT EXISTS(SELECT 1 FROM unlinked_signals WHERE signal_id=? AND resolved_at IS NULL)").bind(signalId),
   ...prepared.statements,
   ...timeline(db,actor,'contact',id,'contactability.started',{contactability:'do_not_contact',reason:'captured_evidence',signalId,text:'Created as Do not contact. Captured evidence is not permission to email.'}),
   ...await new IngestionRepository(db).linkStatements(signalId,event,[{type:'contact',id,basis:'Operator created a contact from this event'}],actor,at,'operator','operator.review'),
   db.prepare('UPDATE unlinked_signals SET resolved_at=? WHERE signal_id=?').bind(at,signalId),
  ]);
  return {id};
 }catch(error){
  if(error instanceof RecordError)throw new IngestionError(error.status===429?503:error.status,error.message);
  if(/runtime_controls.value|UNIQUE|RECORD_IDENTITY_CONFLICT/.test(String(error)))throw new IngestionError(409,'The event or contact changed. Reload before creating a contact.');
  throw error;
 }
}
