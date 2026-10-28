import { createMailSender } from '../../base/modules/mail/src/sender.mjs';
import { MailValidationError } from '../../base/modules/mail/src/core/errors.mjs';
import { attributedSender, type OutboundMail, type OutreachEnvironment } from './outbound-mail';
import { optOutOrigin, optOutPath } from '../features/outreach/opt-out-capability';

export class ManagedMailError extends Error {
 constructor(readonly status:'rejected'|'rate_limited'|'uncertain') {
  super(status==='rejected'?'Managed mail rejected this submission.':status==='rate_limited'?'Managed mail is rate limited.':'Managed mail acceptance is uncertain; reconcile before resending.');
 }
}

/** Base owns relay serialization; Orbit keeps the saved approval and durable send claim. */
export function createManagedOutboundMail(env:OutreachEnvironment,messageIdDomain?:string):OutboundMail {
 return {
  provider:'rer',
  optOutOrigin:optOutOrigin(env.AUTH_ORIGIN),
  messageIdDomain,
  async send(message){
   try{
    const sender=createMailSender({provider:'rer',mode:'production',apiKey:env.MAIL_API_KEY,relayUrl:env.MAIL_RELAY_URL});
    const url=message.opt_out_url;
    if(url&&(message.opt_out===false||!this.optOutOrigin||!new RegExp(`^${optOutPath}[a-f0-9]{64}$`).test(new URL(url).pathname)||new URL(url).origin!==this.optOutOrigin||new URL(url).search||new URL(url).hash))throw new ManagedMailError('rejected');
    if(message.opt_out===true&&!url)throw new ManagedMailError('rejected');
    const deliveryId=message.idempotency_key??message.id;
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(deliveryId));
    const messageKey=`orbit:${Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('')}`;
    // RER assigns the RFC Message-ID; later sends reference the receipt saved by settlement.
    const result=await sender.send({deliveryId,messageKey,from:message.senderLabel?attributedSender(env.MAIL_FROM!,message.senderLabel):env.MAIL_FROM!,to:[message.recipient_email],subject:message.subject,text:message.body+(url?`\n\nUnsubscribe: ${url}`:''),
     headers:{...(message.reference_ids?{References:message.reference_ids,'In-Reply-To':message.reference_ids.trim().split(/ +/).at(-1)!}:{}),...(url?{'List-Unsubscribe':`<${url}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}:{})}});
    if(result.status!=='accepted')throw new ManagedMailError(result.status==='rejected'?'rejected':result.status==='rate_limited'?'rate_limited':'uncertain');
    if(!result.providerMessageId)throw new ManagedMailError('uncertain');
    return {providerMessageId:result.providerMessageId,messageId:result.providerMessageId};
   }catch(error){
    if(error instanceof MailValidationError)throw new ManagedMailError('rejected');
    throw error;
   }
  },
 };
}
