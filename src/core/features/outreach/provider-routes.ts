import {boundedRequestBody,RequestBodyTooLarge} from '../../platform/bounded-request-body';
import {signedMailRateLimit,rejectedMailRateLimit} from '../../platform/mail-event-rate-limit';
import { verifyRelayRequest } from '../../../base/sendgrid-event-relay/crypto';
import { Hono } from 'hono';
import { z } from 'zod';
import { verifyMailWebhook } from '../../platform/mail-webhook-security';
import { payloadHash } from '../../platform/source-security';
import {replyPayloadHash} from './reply-payload';
import {replyHeaders} from './reply-headers';
import {replySender} from './reply-sender';
import { ProviderRepository } from './provider-repository';
import {recordVerifiedDeliveryEvent} from './delivery-outcomes';
const event=z.object({sg_event_id:z.string().min(1),event:z.string().min(1),timestamp:z.number().finite().nonnegative(),email:z.string(),sg_message_id:z.string().optional(),rer_delivery_id:z.string().optional(),rer_product:z.string().optional(),reason:z.string().optional(),type:z.string().optional()}).passthrough();
export function createMailEventRoutes(db:D1Database,keys:{eventKey?:string;parseKey?:string;relaySecret?:string}){
 const app=new Hono(),repository=new ProviderRepository(db);
 app.onError((_error,c)=>c.json({error:'Mail event storage is unavailable; replay it.'},503));
 app.post('/:kind',async c=>{
  const reject=async(status:401|403|413,error:string)=>(await rejectedMailRateLimit(db,c.req.raw))??c.json({error},status);
  const kind=c.req.param('kind'),key=kind==='sendgrid'?keys.eventKey:kind==='reply'?keys.parseKey:kind==='relay'?keys.relaySecret:undefined;if(!key)return reject(403,'Mail signature key is not configured.');
  const limit=kind==='reply'?262144:1048576;
  const declared=c.req.header('Content-Length');
  if(declared!==undefined&&/^\d+$/.test(declared)&&Number(declared)>limit)return reject(413,'Mail event exceeds payload limit.');
  // Metadata can reject early; only counted wire bytes can authorize a payload.
  let raw:Uint8Array<ArrayBuffer>;
  try{raw=new Uint8Array(await boundedRequestBody(c.req.raw,limit));}
  catch(error){if(error instanceof RequestBodyTooLarge)return reject(413,'Mail event exceeds payload limit.');throw error;}
  const valid=kind==='relay'?await verifyRelayRequest({secret:key,timestamp:c.req.header('x-rer-mail-timestamp'),signature:c.req.header('x-rer-mail-signature'),rawBody:raw}):await verifyMailWebhook(key,raw.buffer,c.req.header('X-Twilio-Email-Event-Webhook-Timestamp')??'',c.req.header('X-Twilio-Email-Event-Webhook-Signature')??'');
  if(!valid)return reject(401,'Mail signature is invalid or expired.');
  const limited=await signedMailRateLimit(db);if(limited)return limited;
  try{
   if(kind==='sendgrid'||kind==='relay'){
    let decoded:unknown;try{decoded=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));}catch{return c.json({error:'Invalid SendGrid event payload.'},400);}
    const input=z.array(event).max(1000).safeParse(decoded);if(!input.success)return c.json({error:'Invalid SendGrid event payload.'},400);
    for(const item of input.data)await repository.event(item,await payloadHash(JSON.stringify(item)));
    await recordVerifiedDeliveryEvent(db);
   }else{
    const form=await new Request(c.req.url,{method:'POST',headers:{'content-type':c.req.header('content-type')??''},body:raw}).formData();
    const headers=replyHeaders(form),from=form.getAll('from');
    const sender=from.length===1&&typeof from[0]==='string'?replySender(from[0]):null;
    if(!sender||!headers||(headers.sender!==undefined&&headers.sender!==sender))return c.json({error:'One consistent reply sender, Message-ID and valid Date are required.'},400);
    const {messageId,references,occurredAt,automatic}=headers,subject=String(form.get('subject')??''),body=String(form.get('text')??'');
    const input={id:messageId,sender,subject,body,messageId,references,occurredAt,automatic};await repository.reply(input,await replyPayloadHash(form));
   }return c.json({accepted:true});
  }catch{return c.json({error:'Mail event could not be persisted; replay it.'},503);}
 });return app;
}
