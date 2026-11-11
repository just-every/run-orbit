import {defineTool,ToolRefusal,type ToolContext} from '../../../base/modules/agent-door/index.ts';
import {DraftsRepository} from '../drafts/repository';
import {renderDraft,requireRendered} from '../drafts/render';
import {ApprovalRepository} from '../outreach/approval-repository';
import {draftMailDatabase} from '../outreach/record-mail-storage';
import {draftOptOut} from '../outreach/opt-out';
import {OutreachService} from '../outreach/service';
import {WorkbenchError} from '../workbench/repository';
import {createOutboundMail,senderDomain,agentSenderName} from '../../platform/outbound-mail';
import type {PlatformBindings} from '../../platform/assets';
import {payloadHash} from '../../platform/source-security';
import {fullSeller} from './evidence';
import {agentDatabase} from './native-access';
import {nativeRecords,objectSchema,outputSchema,string} from './records';

// These native facts are also fenced in the approval transaction. An address
// typed over a saved contact is never promoted to a known counterparty.
const recipientSql=`SELECT json_object('id',c.id,'email',c.email,'name',c.name,'contactability',c.contactability,
 'companyId',co.id,'companyName',co.name,'companyDomain',co.primary_domain,
 'operators',json((SELECT json_group_array(email) FROM (SELECT email FROM operators WHERE status='active' ORDER BY id))),
 'freeDomains',json(w.free_mail_domains_json)) AS value
 FROM drafts d JOIN contacts c ON c.id=d.recipient_contact_id LEFT JOIN companies co ON co.id=c.company_id
 CROSS JOIN workspace_settings w WHERE d.id=? AND w.id='workspace'`;

/** The read door exposes a send revision, never a send permission. */
export async function savedMessage(bindings:PlatformBindings,id:string,person:{id:string;name:string},agent?:{name:string}) {
 const db=await draftMailDatabase(bindings.DB,id),draft=await new DraftsRepository(bindings.DB).findDraft(id);
 if(!draft)throw new ToolRefusal('resource_unavailable');
 const rendered=await renderDraft(db,id,person.id),mail=createOutboundMail(bindings);
 const optOut=await draftOptOut(db,id,mail?.provider!=='rer'||Boolean(mail.optOutOrigin));
 const recipient=await db.prepare(recipientSql).bind(id).first<{value:string}>();
 if(!recipient)throw new ToolRefusal('resource_unavailable');
 const facts=JSON.parse(recipient.value),email=draft.recipientEmail.trim().toLowerCase(),domain=email.split('@')[1];
 const ownDomains=[senderDomain(bindings.MAIL_FROM),senderDomain(bindings.MAIL_REPLY_TO),senderDomain(bindings.OWNER_EMAIL)]
  .filter((value):value is string=>Boolean(value)&&!facts.freeDomains.includes(value));
 const internal=facts.operators.some((value:string)=>value.trim().toLowerCase()===email)||ownDomains.includes(domain);
 const known=facts.email?.trim().toLowerCase()===email||Boolean(domain&&facts.companyDomain?.toLowerCase().replace(/^www\./,'')===domain);
 const counterparty:'internal'|'known'|'new'=internal?'internal':known?'known':'new';
 const snapshot={draftRevision:draft.revision,isStale:draft.isStale,recipient:JSON.parse(recipient.value),
  render:rendered.review,optOut,ownDomains,transport:mail?.provider??null,sender:agent?agentSenderName(agent.name,person.name):null};
 return {draft,rendered,optOut,mail,counterparty,recipientValue:recipient.value,revision:await payloadHash(JSON.stringify(snapshot))};
}

async function nativeMessage<T>(work:()=>Promise<T>):Promise<T> {
 try{return await work();}catch(error){
  if(error instanceof WorkbenchError)throw new ToolRefusal([403,404].includes(error.status)?'resource_unavailable':error.status===409?'revision_conflict':'native_unavailable',error.message,{reason:error.message});
  if(/runtime_controls.value/.test(String(error)))throw new ToolRefusal('revision_conflict');
  throw error;
 }
}

export function messageTools(bindings:PlatformBindings) {
 const current=async(args:Record<string,unknown>,ctx:ToolContext)=>{
  await fullSeller(bindings,ctx);
  return nativeMessage(()=>savedMessage(bindings,String(args.id),ctx.person,ctx.agent));
 };
 return [defineTool({name:'orbit.messages.send',title:'Send an exact saved customer message',
  description:'Send one saved one-to-one draft through native Workbench checks. Read its sendRevision first. Company policy may hold it for the sponsor; caller confirmations supply no approval.',
  scope:'messages:send',readOnly:false,classes:['external'],clauses:['SURFACE-009'],untrusted:true,
  inputSchema:objectSchema({id:string,send_revision:{type:'string',pattern:'^[a-f0-9]{64}$'},scheduled_at:{type:'string',format:'date-time'}},['id','send_revision']),outputSchema,revisionType:'string',
  revision:async(args,ctx)=>(await current(args,ctx)).revision,
  target:args=>({kind:'draft',id:String(args.id)}),
  classify:async(args,ctx,completed)=>{
   await fullSeller(bindings,ctx);
   if(completed)return [...completed];
   return [{class:'external',facts:{measure:1,counterparty:(await current(args,ctx)).counterparty}}];
  },
  summary:async(args,ctx)=>{
   const saved=await current(args,ctx),schedule=args.scheduled_at?await new ApprovalRepository(await draftMailDatabase(bindings.DB,saved.draft.id)).preview(saved.draft.id,new Date(ctx.now()),String(args.scheduled_at)):null;
   return {target:{id:saved.draft.id,name:saved.rendered.review.subject},recipients:[saved.draft.recipientEmail],
    items:[saved.rendered.review.subject,saved.rendered.review.body,`Sender: ${agentSenderName(ctx.agent.name,ctx.person.name)}`,
     `Saved revision: ${saved.draft.revision}`,
     `Merge review: ${saved.rendered.review.reviewed?'reviewed':'required'}`,
     `Opt-out: ${saved.optOut.carries?'link included':'no link'}; ${saved.optOut.setting?'on':'off'} by default; removal ${saved.optOut.removalAllowed?'allowed':'forbidden'}; ${saved.optOut.choice??'no exception'}; transport ${saved.optOut.transport?'supports links':'cannot carry links'}; ${saved.optOut.reply?'reply in an existing thread':'new message'}${saved.optOut.refusal?'; '+saved.optOut.refusal:''}`,...(args.scheduled_at?[`Requested schedule: ${args.scheduled_at}`,`Scheduled time: ${schedule&&'scheduledAt' in schedule?schedule.scheduledAt:''} (${schedule&&'scheduledLocalTime' in schedule?schedule.scheduledLocalTime:''})`]:[])]};
  },
  run:async(args,ctx)=>nativeMessage(async()=>{
   const saved=await current(args,ctx);
   if(saved.revision!==args.send_revision)throw new ToolRefusal('revision_conflict');
   if(!saved.mail)throw new ToolRefusal('native_unavailable',undefined,{reason:'Configure customer mail in Settings.'});
   if(!saved.mail.senderName)throw new ToolRefusal('sender_unavailable',undefined,{reason:'This mail transport cannot name the agent for the person as the outside sender.'});
   requireRendered(saved.rendered.review);
   const {access,actor}=await nativeRecords(bindings,ctx);
   const db=await draftMailDatabase(agentDatabase(bindings.DB,access,actor,ctx),saved.draft.id);
   const message=await new ApprovalRepository(db).approve(saved.draft.id,saved.draft.revision,ctx.person.id,{
    idempotencyKey:ctx.operationId,...(args.scheduled_at?{scheduledAt:String(args.scheduled_at)}:{}),now:new Date(ctx.now()),messageIdDomain:saved.mail.messageIdDomain,
    optOutTransport:saved.mail.provider!=='rer'||Boolean(saved.mail.optOutOrigin),optOutOrigin:saved.mail.optOutOrigin,
    senderName:agentSenderName(ctx.agent.name,ctx.person.name),attribution:{preparedBy:ctx.actor,approvers:ctx.approvers},expectedRenderHash:saved.rendered.review.reviewHash,expectedOptOut:saved.optOut,
    guards:[db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'message_recipient_changed',NULL WHERE COALESCE((${recipientSql}),'')<>?`).bind(saved.draft.id,saved.recipientValue)],
   });
   if(message.state==='scheduled'){ctx.emit('message.scheduled',`orbit://drafts/${saved.draft.id}`,{messageId:message.id,state:message.state});return {result:{id:message.id,contactId:saved.draft.recipientContactId,state:message.state,scheduledAt:message.scheduled_at}};}
   if(message.state==='draft')return {result:{id:message.id,contactId:saved.draft.recipientContactId,state:message.state,reason:message.failure,retryAfter:message.next_attempt_at}};
   // Keep the native recipient identity in retained outcomes so contact erasure
   // retires this call and its replay alias with the existing artifact matcher.
   const result={...await new OutreachService(db,saved.mail).submit(message),contactId:saved.draft.recipientContactId};
   ctx.emit('message.submitted',`orbit://drafts/${saved.draft.id}`,{messageId:message.id,state:result.state});
   return {result,resources:[{uri:`orbit://drafts/${saved.draft.id}`,name:'Saved message and outcome'}]};
  }),
 })];
}
