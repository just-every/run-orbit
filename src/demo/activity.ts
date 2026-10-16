import type {PlatformBindings} from '../core/platform/assets';
import {IngestionRepository} from '../core/features/ingestion/repository';
import {WorkbenchRepository} from '../core/features/workbench/repository';
import {OutreachRepository} from '../core/features/workbench/outreach-repository';
import {ApprovalRepository} from '../core/features/outreach/approval-repository';
import {OutreachService} from '../core/features/outreach/service';
import {SettingsRepository} from '../core/features/settings/repository';
import {createOutboundMail} from '../core/platform/outbound-mail';
import {demoId,hash} from './records';

/** Finish the workspace's first run through the same domain operations as its owner. */
export async function seedActivity(env:PlatformBindings,owner:string,now:Date){
 const db=env.DB;
 for(const [email,name] of [['jordan@brightwork.example','Jordan Lee']]){
  if(!await db.prepare('SELECT 1 FROM operators WHERE email=?').bind(email).first())await new SettingsRepository(db).invite(email!,name!,owner);
 }
 const source=demoId(1,0),event={eventId:'demo-connection-check',type:'form.submitted',subject:'Customer activity connection checked',occurredAt:now.toISOString(),data:{test:true}};
 if(!await new IngestionRepository(db).hasEvent(source,event.eventId)){
  const raw=JSON.stringify(event);await new IngestionRepository(db).ingest(source,event,await hash(raw),raw);
 }
 for(const [index,name,subject,body] of [
  [0,'Maya','Your Thursday walkthrough','Thanks for the reply. We can review customer follow-ups together during the walkthrough.'],
  [11,'Jack','Research workflow walkthrough','Thanks for outlining the research workflow. Let’s review the handoff together in our next call.'],
 ] as const){
  const key=`orbit-demo-follow-up-${index}`;
  if(await db.prepare('SELECT 1 FROM outbound_messages WHERE idempotency_key=?').bind(key).first())continue;
  const draft=await new OutreachRepository(db).createDraft(demoId(12,index),{contactId:demoId(11,index),subject,body:`Hi ${name},\n\n${body}\n\nBest,\nAlex`},owner);
  const approval=new ApprovalRepository(db),preview=await approval.preview(draft.id,now);
  const message=await approval.approve(draft.id,1,owner,{idempotencyKey:key,quietHoursConfirmation:preview.localTime,now});
  const result=await new OutreachService(db,createOutboundMail(env)!).submit(message);
  if(result.state!=='accepted')throw new Error('The demo follow-up did not complete.');
 }
 const reply='demo-team-reply';
 if(!await db.prepare('SELECT 1 FROM signals WHERE source_id=? AND source_event_id=?').bind(`operator:${owner}`,reply).first()){
  await new WorkbenchRepository(db).recordEvent(demoId(12,0),{type:'email.replied',subject:'Maya asked to include the sales team in the walkthrough',occurredAt:now.toISOString(),eventId:reply,contactId:demoId(11,0)},owner);
 }
}
