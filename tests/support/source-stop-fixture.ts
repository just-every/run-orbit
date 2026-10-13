import assert from 'node:assert/strict';
import { launchFixture } from './launch-fixture';
import { IngestionRepository } from '../../src/core/features/ingestion/repository';
import { OutreachRepository } from '../../src/core/features/workbench/outreach-repository';
import { ApprovalRepository } from '../../src/core/features/outreach/approval-repository';
import { OutreachService } from '../../src/core/features/outreach/service';
import { createId } from '../../src/core/shared/ids';
import { payloadHash } from '../../src/core/platform/source-security';
import type { SignalEvent } from '../../src/core/features/ingestion/contracts';

export async function sourceStopFixture(){
 const f=await launchFixture(),source=createId(),at=new Date().toISOString(),ingestion=new IngestionRepository(f.db);
 await f.db.prepare("INSERT INTO signal_sources(id,name,type,enabled,created_at,updated_at) VALUES(?,'Mailbox stop source','signed_webhook',1,?,?)").bind(source,at,at).run();
 const event=(input:Partial<SignalEvent>):SignalEvent=>({eventId:createId(),type:'email.unsubscribed',subject:'Source mailbox stop',occurredAt:at,...input});
 async function prepare(input:SignalEvent){const raw=JSON.stringify(input);return ingestion.prepare(source,input,await payloadHash(raw),raw);}
 async function ingest(input:SignalEvent){const raw=JSON.stringify(input);return ingestion.ingest(source,input,await payloadHash(raw),raw);}
 async function schedule(contactId:string,opportunityId:string){
  const draft=await new OutreachRepository(f.db).createDraft(opportunityId,{contactId,subject:'Reviewed subject',body:'Reviewed body'},f.actor);
  const message=await new ApprovalRepository(f.db).approve(draft.id,1,f.actor,{now:new Date('2030-01-07T09:00:00Z'),scheduledAt:'2030-01-07T10:00:00Z'});
  return {draftId:draft.id,messageId:message.id};
 }
 async function stopped(contactId:string,work:{draftId:string;messageId:string}){
  assert.equal((await f.records.detail('contact',contactId)).record.contactability,'do_not_contact');
  assert.equal((await f.db.prepare('SELECT is_stale FROM drafts WHERE id=?').bind(work.draftId).first())!.is_stale,1);
  assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(work.messageId).first())!.state,'cancelled');
  const message=await new ApprovalRepository(f.db).message(work.messageId);
  await assert.rejects(new OutreachRepository(f.db).createDraft(message.opportunity_id,{contactId,subject:'New work',body:'Must stay blocked'},f.actor),/must not be contacted/);
  let sends=0;await new OutreachService(f.db,{send:async()=>{sends++;throw new Error('Stopped mailbox reached sender');}}).dispatchDue(new Date('2030-01-07T10:00:00Z'));assert.equal(sends,0);
  await assert.rejects(new ApprovalRepository(f.db).approve(work.draftId,1,f.actor,{now:new Date('2030-01-07T09:00:00Z'),scheduledAt:'2030-01-07T11:00:00Z'}),/no longer permitted/);
 }
 return {...f,source,event,prepare,ingest,schedule,stopped};
}
