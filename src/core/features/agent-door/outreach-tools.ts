import { z } from 'zod';
import type { ToolDefinition, ToolContext } from '../../../base/modules/agent-door/types.ts';
import { ToolRefusal } from '../../../base/modules/agent-door/index.ts';
import type { PlatformBindings } from '../../platform/assets';
import { createOutboundMail } from '../../platform/outbound-mail';
import { ApprovalRepository } from '../outreach/approval-repository';
import { OutreachService } from '../outreach/service';
import { renderDraft } from '../drafts/render';
import { define, id, standard } from './tools';
import { agentDatabase, full } from './native';
const body=async(c:ToolContext,draftId:string)=>{await full(c);return renderDraft(c.db,draftId,c.person.id);};
export function outreachTools(bindings:PlatformBindings):ToolDefinition[]{
 const mail=()=>{const value=createOutboundMail(bindings);if(!value)throw new ToolRefusal('provider_unavailable');return value;};
 const external=async(a:{id:string},c:ToolContext)=>{const {draft}=await body(c,a.id);return[{class:'external' as const,facts:{measure:1,counterparty:'known' as const}}];};
 const summary=async(a:{id:string;scheduledAt?:string},c:ToolContext)=>{const {review}=await body(c,a.id);return{target:{id:a.id},recipients:[review.recipientEmail],items:[review.subject,review.body,`Render ${review.reviewHash}`,`Sender ${c.actor.label}`,...(a.scheduledAt?[`Schedule ${a.scheduledAt}`]:[])]};};
 return [
 define('outreach','send',z.object({id}),{description:'Submit the exact saved rendered customer message under company policy, preserving current recipient consent, replies, native quotas and one-attempt uncertainty.',readOnly:false,classes:['external'],clauses:['OUT-001','OUT-004','OUT-005','OUT-007'],classify:external,summary,
 async run(a,c){const rendered=await body(c,a.id),db=await agentDatabase(c),transport=mail(),approval=new ApprovalRepository(db);const message=await approval.approve(a.id,rendered.draft.revision,c.person.id,{agentReviewHash:rendered.review.reviewHash,idempotencyKey:crypto.randomUUID(),messageIdDomain:transport.messageIdDomain,optOutTransport:transport.provider!=='rer',optOutOrigin:transport.optOutOrigin});const result=await new OutreachService(db,transport).submit(message);return result;}}),
 define('outreach','schedule',z.object({id,scheduledAt:z.iso.datetime()}),{description:'Schedule exact customer content. The final worker must re-admit the saved agent, sponsor, consent and current policy before submission.',readOnly:false,classes:['external'],clauses:['OUT-008','OUT-004','OUT-007'],classify:external,summary,
 async run(a,c){const rendered=await body(c,a.id),db=await agentDatabase(c),transport=mail();const message=await new ApprovalRepository(db).approve(a.id,rendered.draft.revision,c.person.id,{agentReviewHash:rendered.review.reviewHash,scheduledAt:a.scheduledAt,idempotencyKey:crypto.randomUUID(),messageIdDomain:transport.messageIdDomain,optOutTransport:transport.provider!=='rer',optOutOrigin:transport.optOutOrigin});return{id:message.id,state:message.state,scheduledAt:message.scheduled_at};}}),
 define('outreach','cancel',z.object({id}),{description:'Cancel a native scheduled customer message before dispatch.',readOnly:false,classes:['standard'],clauses:['OUT-008'],async summary(a,c){await full(c);const m=await new ApprovalRepository(c.db).message(a.id);return{target:{id:m.id},recipients:[m.recipient_email],items:[m.subject,'Cancel scheduled submission']};},async run(a,c){await new ApprovalRepository(await agentDatabase(c)).cancel(a.id,c.person.id);return{id:a.id,state:'cancelled'};}}),
 define('outreach','reconcile',z.object({id}),{description:'Read the provider acceptance of an uncertain native delivery intent, under the original agent custody. This never resubmits mail.',readOnly:false,classes:['external'],clauses:['OUT-007'],
 async classify(_a,c){await full(c);return[{class:'external',facts:{measure:1,counterparty:'known'}}];},
 async summary(a,c){await full(c);const m=await new ApprovalRepository(c.db).message(a.id);return{target:{id:m.id},items:['Query provider acceptance for the original delivery ID; never resend']};},
 async run(a,c){const m=await new ApprovalRepository(c.db).message(a.id),job=await c.db.prepare('SELECT principal FROM orbit_agent_work WHERE message_id=?').bind(a.id).first<{principal:string}>(),original=job?JSON.parse(job.principal):null;if(!original||original.person.id!==c.person.id||original.agent.id!==c.agent.id||original.consent!==c.consent||original.clientId!==c.clientId||!(['reconciling','delivery-unknown'].includes(m.state)||(m.state==='queued'&&m.claimed_at!==null&&Date.parse(m.claimed_at)<Date.now()-120000)))throw new ToolRefusal('native_conflict');const db=await agentDatabase(c);await new OutreachService(db,mail()).reconcile(new Date(),50,a.id);return{id:a.id,state:(await new ApprovalRepository(db).message(a.id)).state};}}),
 define('outreach','dispatch',z.object({id}),{description:'Admit a previously scheduled native message under current authority and company policy; an unknown provider result is never resent.',readOnly:false,classes:['external'],clauses:['OUT-008','OUT-007'],
 async classify(a,c){await full(c);const m=await new ApprovalRepository(c.db).message(a.id);return external({id:m.draft_id},c);},
 async summary(a,c){const m=await new ApprovalRepository(c.db).message(a.id);return summary({id:m.draft_id},c);},
 async run(a,c){const m=await new ApprovalRepository(c.db).message(a.id);const job=await c.db.prepare('SELECT principal FROM orbit_agent_work WHERE message_id=?').bind(a.id).first<{principal:string}>();const original=job?JSON.parse(job.principal):null;if(m.operator_id!==c.person.id||m.state!=='scheduled'||!original||original.person.id!==c.person.id||original.agent.id!==c.agent.id||original.consent!==c.consent||original.clientId!==c.clientId)throw new ToolRefusal('native_conflict');const db=await agentDatabase(c);await new OutreachService(db,mail()).dispatchDue(new Date(),50,a.id);const after=await new ApprovalRepository(db).message(a.id);return{id:a.id,state:after.state};}})
 ];
}
