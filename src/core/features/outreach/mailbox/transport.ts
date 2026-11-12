import type {OutboundMail,OutboundMailBinding} from '../../../platform/outbound-mail';
import type {SourceSecurity} from '../../../platform/source-security';
import {defaultProviderFetch,hasSendScope,type ProviderFetch} from '../../capture/providers/config';
import {leaseSource,providerSession,type ProviderSource} from '../../capture/providers/session';
import {messageMailDatabase} from '../record-mail-storage';
import {MailboxSendError,retryAfter} from './errors';
import {gmailLookup,gmailSend} from './gmail';
export interface MailboxConfig{security?:SourceSecurity;origin?:string;fetcher?:ProviderFetch}
/** Every send resolves its immutable approval binding, including after a restart. */
export function mailboxTransportResolver(db:D1Database,installation:OutboundMail|undefined,config:MailboxConfig):OutboundMail|undefined{
 if(!config.security)return installation;
 const security=config.security,fetcher=config.fetcher??defaultProviderFetch;
 const facade:OutboundMail={...installation,send:installation?.send??(async()=>{throw new MailboxSendError('Configure an installation sender or choose an authorized mailbox.','failed');}),async resolve(message){
  if(!message.mailbox_source_id){if(!installation)throw new MailboxSendError('The installation sender is unavailable. Choose a mailbox in a new review.','failed');return installation;}
  return bound(message);
 }};
 function bound(message:OutboundMailBinding):OutboundMail{
  return {provider:'gmail',optOutOrigin:config.origin,messageIdDomain:message.mailbox_address?.split('@')[1],async send(input){return operate(message,async(request,scoped)=>{
   const claim=await scoped.prepare("UPDATE outbound_messages SET mailbox_submission_claimed=1 WHERE id=? AND state='queued' AND mailbox_submission_claimed=-1").bind(message.id).run();
   if(claim.meta.changes!==1)throw new MailboxSendError('This approval already attempted submission. Reconcile its Sent copy before any new send.','delivery-unknown');
   try{
    const previous=input.reference_ids?await scoped.prepare("SELECT provider_thread_id FROM outbound_messages WHERE message_id=? AND mailbox_source_id=? AND mailbox_address=? AND state IN('accepted','delivered')").bind(input.reference_ids,message.mailbox_source_id,message.mailbox_address).first<string>('provider_thread_id'):null;
    const result=await gmailSend(request,input,message.mailbox_address!,previous??undefined);
    await scoped.prepare('UPDATE outbound_messages SET provider_thread_id=? WHERE id=?').bind(result.providerThreadId,message.id).run();return result;
   }catch(error){if(error instanceof MailboxSendError&&error.outcome==='deferred')await scoped.prepare('UPDATE outbound_messages SET mailbox_submission_claimed=0 WHERE id=?').bind(message.id).run();throw error;}
  });},async lookup(){return operate(message,async(request,scoped)=>{const result=await gmailLookup(request,message.message_id);if(result)await scoped.prepare('UPDATE outbound_messages SET provider_thread_id=? WHERE id=?').bind(result.providerThreadId,message.id).run();return result;},true);}};
 }
 async function operate<T>(message:OutboundMailBinding,run:(request:(url:string,init?:RequestInit)=>Promise<Response>,scoped:D1Database)=>Promise<T>,reconciling=false){
  const scoped=await messageMailDatabase(db,message.id);
  const source=await db.prepare("SELECT id,name,adapter,scope_json,state,connection_id,cursor FROM capture_sources WHERE id=?").bind(message.mailbox_source_id).first<ProviderSource>();
  const auth=await db.prepare("SELECT * FROM mailbox_send_authorizations WHERE source_id=? AND connection_id=? AND mailbox_address=? AND operator_id=? AND state='authorized'").bind(message.mailbox_source_id,message.mailbox_connection_id,message.mailbox_address,message.operator_id).first<{retry_at:string|null}>();
  if(!auth||!source||source.connection_id!==message.mailbox_connection_id||!['connected','syncing'].includes(source.state))throw new MailboxSendError('Mailbox sending is paused or disconnected. No other identity or transport was used.','failed');
  if(source.adapter!=='google')throw new MailboxSendError('Microsoft draft creation requires a separate permission decision. No message was sent.','failed');
  if(!reconciling&&auth.retry_at&&Date.parse(auth.retry_at)>Date.now())throw new MailboxSendError('This mailbox is deferred until '+auth.retry_at+'. Other mailboxes can continue.','deferred',auth.retry_at);
  if(!reconciling){
   const rows=(await db.prepare("SELECT claimed_at FROM outbound_messages WHERE mailbox_provider='google' AND mailbox_address=? AND mailbox_submission_claimed=1 AND claimed_at>? UNION ALL SELECT claimed_at FROM record_mail_outbound_messages WHERE mailbox_provider='google' AND mailbox_address=? AND mailbox_submission_claimed=1 AND claimed_at>? ORDER BY claimed_at").bind(message.mailbox_address,new Date(Date.now()-60000).toISOString(),message.mailbox_address,new Date(Date.now()-60000).toISOString()).all<{claimed_at:string}>()).results;
   if(rows.length>=4)throw new MailboxSendError('This mailbox reached its sending pace. Other senders can continue.','deferred',new Date(Date.parse(rows[rows.length-4]!.claimed_at)+60000).toISOString());
  }
  let lease:string;
  try{lease=await leaseSource(db,source.id);}catch{throw new MailboxSendError('This mailbox is busy reading. Sending is deferred briefly.','deferred',new Date(Date.now()+30000).toISOString());}
  const session=providerSession(db,source,lease,security,fetcher);
  let accepted=false;
  try{
   const credential=await session.credential();
   if(!credential.sendConsent||!hasSendScope(source.adapter,credential.scope))throw new MailboxSendError('Send permission is absent or revoked. Reauthorize this mailbox before sending.','failed');
   const check=async()=>{await session.check();if(!await db.prepare("SELECT 1 FROM mailbox_send_authorizations WHERE source_id=? AND connection_id=? AND operator_id=? AND state='authorized'").bind(source.id,source.connection_id,message.operator_id).first())throw new MailboxSendError('Send authorization was revoked. No alternate transport was used.','failed');};
   const request=async(url:string,init:RequestInit={})=>{
    await check();const token=await session.credential();if(!token.sendConsent||!hasSendScope(source.adapter,token.scope))throw new MailboxSendError('The provider no longer grants send permission.','failed');await check();
    let response:Response;try{response=await fetcher(url,{...init,method:init.method??'GET',redirect:'error',headers:{'content-type':'application/json',authorization:'Bearer '+token.accessToken},signal:AbortSignal.timeout(20000)});}catch{throw new MailboxSendError('Mailbox delivery is unresolved. Orbit will reconcile Sent without resending.','delivery-unknown');}
    if(response.status===429){const at=retryAfter(response);await response.body?.cancel();await db.prepare('UPDATE mailbox_send_authorizations SET retry_at=? WHERE provider=? AND mailbox_address=?').bind(at,source.adapter,message.mailbox_address).run();if(accepted)throw new MailboxSendError('Sent readback is deferred; delivery remains unresolved without resending.','delivery-unknown');throw new MailboxSendError('This mailbox is deferred until '+at+' by the provider.','deferred',at);}
    if(response.status===401||response.status===403){await response.body?.cancel();await db.prepare("UPDATE mailbox_send_authorizations SET state='paused' WHERE source_id=? AND connection_id=?").bind(source.id,source.connection_id).run();throw new MailboxSendError('The provider refused mailbox authority. Reauthorize in Settings.',accepted?'delivery-unknown':'failed');}
    if(init.method==='POST'&&response.ok)accepted=true;
    return response;
   };
   const profile=await request('https://gmail.googleapis.com/gmail/v1/users/me/profile'),value=await profile.json() as any;
   if(!profile.ok||String(value.emailAddress??'').toLowerCase()!==message.mailbox_address)throw new MailboxSendError('The sending mailbox no longer matches the reviewed identity.','failed');
   return await run(request,scoped);
  }finally{await db.prepare('DELETE FROM capture_locks WHERE source_id=? AND lease=?').bind(source.id,lease).run();}
 }
 return facade;
}
