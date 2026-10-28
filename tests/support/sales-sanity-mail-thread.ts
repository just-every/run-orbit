import {salesRecordMail} from './sales-sanity-record-mail';
import assert from 'node:assert/strict';
import {createId} from '../../src/core/shared/ids';
import {payloadHash} from '../../src/core/platform/source-security';
import {OutreachRepository} from '../../src/core/features/workbench/outreach-repository';
import {ApprovalRepository} from '../../src/core/features/outreach/approval-repository';
import type {SalesMailJourney} from './sales-sanity-mail-workspace';
export async function followCustomerThread({db,context,fixture,sign}:SalesMailJourney){
 const {ProviderRepository}=await import('../../src/core/features/outreach/provider-repository');const f=await fixture(),outreach=new OutreachRepository(db),approval=new ApprovalRepository(db),provider=new ProviderRepository(db);
 const draft=await outreach.createDraft(f.opportunityId,{contactId:f.contactId,subject:'Same subject',body:'Reviewed'},f.actor);
 const message=await approval.approve(draft.id,1,f.actor,{now:new Date('2032-01-05T10:00:00Z'),scheduledAt:'2032-01-05T11:00:00Z'});
 const reply={id:createId(),sender:f.email,subject:'Same subject',body:'Customer reply',messageId:`<${createId()}@customer.example>`,references:message.message_id,occurredAt:f.at};
 await provider.reply(reply,await payloadHash(JSON.stringify(reply)));await provider.reply(reply,await payloadHash(JSON.stringify(reply)));
 assert.equal((await approval.message(message.id)).state,'cancelled');const count=await db.prepare('SELECT COUNT(*) AS n FROM signals WHERE source_event_id=?').bind(reply.id).first<{n:number}>();assert.equal(count?.n,1);
 const unmatched={...reply,id:createId(),messageId:`<${createId()}@customer.example>`,references:''};await provider.reply(unmatched,await payloadHash(JSON.stringify(unmatched)));
 const row=(await provider.unlinkedReplies()).find(row=>row.subject==='Same subject'&&row.sender===f.email);assert.ok(row);
 assert.equal(await db.prepare('SELECT id FROM signals WHERE source_event_id=?').bind(unmatched.id).first(),null);
 await provider.linkReply(String(row.id),f.opportunityId,f.actor);assert.ok(await db.prepare('SELECT id FROM signals WHERE source_event_id=?').bind(unmatched.id).first());await assert.rejects(provider.linkReply(String(row.id),f.opportunityId,f.actor));await salesRecordMail(context);
}
