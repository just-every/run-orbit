import {outreachInstructions} from '../../app/mounts/assistance';
import {RecordMailRepository,type MailRecordKind} from '../outreach/record-mail-repository';
import {WorkbenchError} from '../workbench/repository';
export interface RecordDraftInput {kind:MailRecordKind;recordId:string;contactId:string;opportunityId:string|null}
/** The saved JSON is both the operator's disclosure and the provider's complete input. */
export async function recordDraftPreview(db:D1Database,input:RecordDraftInput){
 const context=await new RecordMailRepository(db).context(input.kind,input.recordId);
 const recipient=context.contacts.find(contact=>contact.id===input.contactId);
 if(!recipient?.email||recipient.contactability!=='contactable')throw new WorkbenchError(409,'Choose a contactable recipient on this record.');
 if(input.opportunityId&&!context.deals.some(deal=>deal.id===input.opportunityId&&deal.contactId===input.contactId))throw new WorkbenchError(409,'Choose a current open deal for this recipient.');
 const contact=await db.prepare('SELECT * FROM contacts WHERE id=?').bind(input.contactId).first<any>();
 const [company,workspace,signals,messages,timeline]=await Promise.all([
  contact.company_id?db.prepare('SELECT * FROM companies WHERE id=?').bind(contact.company_id).first():null,
  db.prepare('SELECT name,currency FROM workspace_settings LIMIT 1').first(),
  db.prepare("SELECT DISTINCT s.* FROM signals s JOIN signal_links l ON l.signal_id=s.id WHERE (l.record_type='contact' AND l.record_id=?) OR (l.record_type='company' AND l.record_id=?) ORDER BY s.id").bind(contact.id,contact.company_id).all<any>(),
  db.prepare("SELECT id,subject,body,state,created_at FROM outbound_messages WHERE contact_id=? AND state IN('accepted','delivered','bounced') UNION ALL SELECT id,subject,body,state,created_at FROM record_mail_outbound_messages WHERE contact_id=? AND state IN('accepted','delivered','bounced') ORDER BY created_at,id").bind(contact.id,contact.id).all<any>(),
  db.prepare("SELECT DISTINCT t.* FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE ((r.record_type='contact' AND r.record_id=?) OR (r.record_type='company' AND r.record_id=?)) AND (t.kind='signal.recorded' OR t.kind='message.accepted' OR t.kind='outbound.archived') ORDER BY t.occurred_at,t.id").bind(contact.id,contact.company_id).all<any>()
 ]);
 const evidence=[{id:contact.id,type:'contact',fields:contact},...(company?[{id:String(company.id),type:'company',fields:company}]:[]),...signals.results.map(signal=>({id:signal.id,type:signal.type,fields:signal})),...messages.results.map(message=>({id:message.id,type:'exchanged-message',fields:message}))];
 return {instructions:outreachInstructions,feature:'draft',origin:{kind:input.kind,id:input.recordId},dealLink:input.opportunityId,record:context.record,workspace,contact,company,evidence,messages:messages.results,timeline:timeline.results};
}
export const recordPreviewKey=(id:string)=>`record_ai_preview:${id}`;
export async function saveRecordPreview(db:D1Database,id:string,actor:string,input:RecordDraftInput,preview:unknown){
 await db.prepare('INSERT INTO runtime_controls(name,value) VALUES(?,?)').bind(recordPreviewKey(id),JSON.stringify({actor,input,preview})).run();
}
export async function readRecordPreview(db:D1Database,id:string,actor:string){
 const value=await db.prepare('SELECT value FROM runtime_controls WHERE name=?').bind(recordPreviewKey(id)).first<string>('value');
 if(!value)throw new WorkbenchError(409,'The request preview was used or is unavailable.');
 const saved=JSON.parse(value) as {actor:string;input:RecordDraftInput;preview:Awaited<ReturnType<typeof recordDraftPreview>>};
 if(saved.actor!==actor)throw new WorkbenchError(409,'The request preview is unavailable.');return {...saved,value};
}
