import { createManagedOutboundMail, ManagedMailError } from './managed-outbound-mail';
import { validateRerConfig } from '../../base/modules/mail/src/adapters/rer/contract.mjs';
import { sendDevelopment } from '../../base/modules/mail/src/development/index.mjs';
import { sendSendGrid, SendGridSendError } from '../../base/modules/mail/src/sendgrid-email/index.mjs';
export interface OutboundMail {
 provider?:'rer'|'sendgrid'|'development';
 send(input:{id:string;recipient_email:string;subject:string;body:string;message_id?:string;reference_ids?:string;idempotency_key?:string;opt_out?:boolean}):Promise<{providerMessageId:string|null;messageId?:string}>;
 lookup?(idempotencyKey:string):Promise<{providerMessageId:string}|undefined>;
 /** The sender's domain, so each Message-ID names a real domain instead of a placeholder. */
 messageIdDomain?:string;
}
export interface OutreachEnvironment { RER_DEMO?:string; DB?:D1Database; MAIL_PROVIDER?:string; MAIL_RELAY_URL?:string; MAIL_API_KEY?:string; MAIL_FROM?: string; SENDGRID_API_KEY?: string; SENDGRID_UNSUBSCRIBE_GROUP_ID?:string; MAIL_REPLY_TO?:string; SENDGRID_WEBHOOK_PUBLIC_KEY?:string }
/** The four settings customer mail needs, in the order Settings → Customer mail sender sets them. */
export const customerMailSettings=['SENDGRID_API_KEY','MAIL_FROM','MAIL_REPLY_TO','SENDGRID_UNSUBSCRIBE_GROUP_ID'] as const;
export interface CustomerMailStatus {provider?:'rer'|'sendgrid';present:number;total:number;missing:string[];problem:string|null}
/** Which customer-mail settings this installation holds, by name only. Customer mail turns on only when all are present and valid. */
export function customerMailStatus(env:OutreachEnvironment):CustomerMailStatus{
 const managed=env.MAIL_PROVIDER==='rer',settings=managed?['MAIL_FROM','MAIL_RELAY_URL','MAIL_API_KEY'] as const:customerMailSettings;
 const missing=settings.filter(name=>!env[name]?.trim()),group=env.SENDGRID_UNSUBSCRIBE_GROUP_ID?.trim();
 let problem=!managed&&group&&!/^[1-9]\d*$/.test(group)?'SENDGRID_UNSUBSCRIBE_GROUP_ID must be the number in SendGrid’s Group ID column.':null;
 if(managed&&env.MAIL_RELAY_URL?.trim())try{validateRerConfig({relayUrl:env.MAIL_RELAY_URL});}catch{problem='MAIL_RELAY_URL must be the assigned HTTPS relay URL.';}
 return {provider:managed?'rer':'sendgrid',present:settings.length-missing.length,total:settings.length,missing,problem};
}
/** Customer mail, or undefined until every setting is present: a partly configured installation keeps running and says what is missing. */
export function createOutboundMail(env:OutreachEnvironment):OutboundMail|undefined {
 const demo = env.RER_DEMO === '1';
 if(!demo){const status=customerMailStatus(env);if(status.missing.length||status.problem)return undefined;}
 if(!demo&&env.MAIL_PROVIDER==='rer')return createManagedOutboundMail(env,senderDomain(env.MAIL_FROM));
 return {
  provider:demo?'development':'sendgrid',
  messageIdDomain:senderDomain(env.MAIL_FROM),
  async send(message){
   if(demo){const result=await sendDevelopment({provider:'development',mode:'development'},{deliveryId:message.idempotency_key??message.id,from:env.MAIL_FROM??'Orbit Demo <demo@demo.invalid>',to:[message.recipient_email],subject:message.subject,text:message.body});return {providerMessageId:result.providerMessageId};}
   // OUT-020: the unsubscribe group brings SendGrid's List-Unsubscribe headers and its footer links together, or neither; a message approved before OUT-020 keeps the group.
   const groupId=Number(env.SENDGRID_UNSUBSCRIBE_GROUP_ID);
   return sendSendGrid({apiKey:env.SENDGRID_API_KEY!,message:{from:await senderWithName(env.MAIL_FROM!,env.DB),to:[message.recipient_email],subject:message.subject,text:message.body,deliveryId:message.idempotency_key??message.id,replyTo:env.MAIL_REPLY_TO,...(message.opt_out===false?{}:{asmGroupId:groupId}),subscriptionTracking:false,customArgs:{rer_product:'orbit'},headers:{'Message-ID':message.message_id??`<${message.id}@${senderDomain(env.MAIL_FROM)}>`,...(message.reference_ids?{'References':message.reference_ids,'In-Reply-To':message.reference_ids}:{})}}});
  },
  async lookup(id){
   const url=new URL('https://api.sendgrid.com/v3/messages');url.searchParams.set('limit','10');url.searchParams.set('query',`unique_args['rer_delivery_id']="${id.replace(/["\\]/g,'')}"`);
   const response=await fetch(url,{redirect:'manual',headers:{authorization:`Bearer ${env.SENDGRID_API_KEY}`},signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw new Error(`SendGrid Email Activity lookup failed (${response.status}); configure Email Activity API access.`);
   const data=await response.json() as {messages?:Array<{msg_id?:string;status?:string}>};
   const accepted=data.messages?.find(row=>['processed','delivered','not_delivered'].includes(row.status??''));
   return accepted?.msg_id?{providerMessageId:accepted.msg_id}:undefined;
  }
 };
}
/** Customers see the business name from first-run setup beside a bare MAIL_FROM address; a MAIL_FROM that names itself is kept. */
async function senderWithName(from:string,db?:D1Database){
 if(from.includes('<')||!db)return from;
 const row=await db.prepare("SELECT name FROM workspace_settings WHERE id='workspace'").first<{name:string|null}>();
 const name=row?.name?.replace(/[<>"\\\r\n]/g,'').trim();
 return name?`"${name}" <${from.trim()}>`:from;
}
/** The domain of MAIL_FROM, plain or as `Name <address>`. */
export function senderDomain(from:string|undefined){return /@([a-z0-9.-]+\.[a-z]{2,})>?\s*$/i.exec(from?.trim()??'')?.[1]?.toLowerCase();}
export function submissionOutcome(error:unknown):'failed'|'delivery-unknown'{return error instanceof ManagedMailError?error.status==='uncertain'?'delivery-unknown':'failed':error instanceof SendGridSendError&&error.outcome!=='ambiguous'?'failed':'delivery-unknown';}
export function transientSubmission(error:unknown){return error instanceof ManagedMailError?error.status==='rate_limited':error instanceof SendGridSendError&&error.outcome==='rate_limited';}
