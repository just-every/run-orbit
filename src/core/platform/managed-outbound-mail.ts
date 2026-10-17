import { createMailSender } from '../../base/modules/mail/src/sender.mjs';
import { MailValidationError } from '../../base/modules/mail/src/core/errors.mjs';
import type { OutboundMail, OutreachEnvironment } from './outbound-mail';

export class ManagedMailError extends Error {
 constructor(readonly status:'rejected'|'rate_limited'|'uncertain') {
  super(status==='rejected'?'Managed mail rejected this submission.':status==='rate_limited'?'Managed mail is rate limited.':'Managed mail acceptance is uncertain; reconcile before resending.');
 }
}

/** Base owns relay serialization; Orbit keeps the saved approval and durable send claim. */
export function createManagedOutboundMail(env:OutreachEnvironment,messageIdDomain?:string):OutboundMail {
 return {
  provider:'rer',
  messageIdDomain,
  async send(message){
   try{
    const sender=createMailSender({provider:'rer',mode:'production',apiKey:env.MAIL_API_KEY,relayUrl:env.MAIL_RELAY_URL});
    const deliveryId=message.idempotency_key??message.id;
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(deliveryId));
    const messageKey=`orbit:${Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('')}`;
    // RER assigns the RFC Message-ID; later sends reference the receipt saved by settlement.
    const result=await sender.send({deliveryId,messageKey,from:env.MAIL_FROM!,to:[message.recipient_email],subject:message.subject,text:message.body,
     ...(message.reference_ids?{headers:{References:message.reference_ids,'In-Reply-To':message.reference_ids.trim().split(/ +/).at(-1)!}}:{})});
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
