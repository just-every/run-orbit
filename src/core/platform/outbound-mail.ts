import { sendDevelopment } from '../../base/modules/mail/src/development/index.mjs';
import { sendSendGrid, SendGridSendError } from '../../base/modules/mail/src/sendgrid-email/index.mjs';
export interface OutboundMail {
 send(input:{id:string;recipient_email:string;subject:string;body:string;message_id?:string;reference_ids?:string;idempotency_key?:string}):Promise<{providerMessageId:string|null}>;
 lookup?(idempotencyKey:string):Promise<{providerMessageId:string}|undefined>;
}
export interface OutreachEnvironment { RER_DEMO?:string; DB?:D1Database; MAIL_FROM?: string; SENDGRID_API_KEY?: string; SENDGRID_UNSUBSCRIBE_GROUP_ID?:string; MAIL_REPLY_TO?:string; SENDGRID_WEBHOOK_PUBLIC_KEY?:string }
export function createOutboundMail(env:OutreachEnvironment):OutboundMail|undefined {
 const demo = env.RER_DEMO === '1';
 if(!demo&&!env.SENDGRID_UNSUBSCRIBE_GROUP_ID&&!env.MAIL_REPLY_TO)return undefined;
 const missing=(['SENDGRID_API_KEY','MAIL_FROM','SENDGRID_UNSUBSCRIBE_GROUP_ID','MAIL_REPLY_TO'] as const).filter(name=>!env[name]?.trim());
 if(!demo&&missing.length)throw new Error(`Customer outreach requires ${missing.join(', ')}.`);
 if(!demo&&(!Number.isInteger(Number(env.SENDGRID_UNSUBSCRIBE_GROUP_ID))||Number(env.SENDGRID_UNSUBSCRIBE_GROUP_ID)<=0))throw new Error('SENDGRID_UNSUBSCRIBE_GROUP_ID must be a positive integer.');
 return {
  async send(message){
   if(demo){const result=await sendDevelopment({provider:'development',mode:'development'},{deliveryId:message.idempotency_key??message.id,from:env.MAIL_FROM??'Orbit Demo <demo@demo.invalid>',to:[message.recipient_email],subject:message.subject,text:message.body});return {providerMessageId:result.providerMessageId};}
   const groupId=Number(env.SENDGRID_UNSUBSCRIBE_GROUP_ID);
   if(!demo&&(!Number.isInteger(groupId)||groupId<=0||!env.MAIL_REPLY_TO))throw new SendGridSendError('rejected','SENDGRID_UNSUBSCRIBE_GROUP_ID and MAIL_REPLY_TO are required before customer outreach.');
   return sendSendGrid({apiKey:env.SENDGRID_API_KEY!,message:{from:env.MAIL_FROM!,to:[message.recipient_email],subject:message.subject,text:message.body,deliveryId:message.idempotency_key??message.id,replyTo:env.MAIL_REPLY_TO,asmGroupId:groupId,subscriptionTracking:false,customArgs:{rer_product:'orbit'},headers:{'Message-ID':message.message_id??`<${message.id}@orbit.local>`,...(message.reference_ids?{'References':message.reference_ids,'In-Reply-To':message.reference_ids}:{})}}});
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
export function submissionOutcome(error:unknown):'failed'|'delivery-unknown'{return error instanceof SendGridSendError&&error.outcome!=='ambiguous'?'failed':'delivery-unknown';}
export function transientSubmission(error:unknown){return error instanceof SendGridSendError&&error.outcome==='rate_limited';}
