import {Hono} from 'hono';
import {boundedRequestBody,RequestBodyTooLarge} from '../../../platform/bounded-request-body';
import {signedMailRateLimit} from '../../../platform/mail-event-rate-limit';
import {rejectedRateLimit} from '../../../platform/public-rate-limit';
import {verifyMailWebhook} from '../../../platform/mail-webhook-security';
import type {SourceSecurity} from '../../../platform/source-security';
import {mailboxConfig} from './address';
import {MAX_FORWARDED_BYTES,receiveForwarded,recordOversized} from './receive';

export interface ForwardInbound {security?:SourceSecurity;address?:string}
const decode=(bytes:ArrayBuffer)=>new TextDecoder('utf-8').decode(bytes);

/** Cloudflare Email Routing: the Worker's email handler receives the envelope and raw message. */
export async function receiveRoutedEmail(message:ForwardableEmailMessage,db:D1Database,inbound:ForwardInbound){
 const config=mailboxConfig(inbound.address),recipients=[message.to];
 if(message.rawSize>MAX_FORWARDED_BYTES){if(!await recordOversized(db,inbound.security,config,recipients))message.setReject('Unknown address');return;}
 const outcome=await receiveForwarded(db,inbound.security,config,{recipients,raw:decode(await new Response(message.raw).arrayBuffer())});
 if(outcome.result==='refused')message.setReject(outcome.reason);
}

/**
 * SendGrid Inbound Parse with "POST the raw, full MIME message" on, signed with
 * the same SENDGRID_PARSE_PUBLIC_KEY as Orbit's reply route. Envelope recipients
 * include BCC copies, which never appear in the message headers.
 */
export function createForwardInboundRoutes(db:D1Database,inbound:ForwardInbound&{parseKey?:string}){
 const app=new Hono();
 app.onError((_error,c)=>c.json({error:'Forwarded mail could not be stored; replay it.'},503));
 app.post('/',async c=>{
  const reject=async(status:401|403|413,error:string)=>(await rejectedRateLimit(db,c.req.raw))??c.json({error},status);
  if(!inbound.parseKey)return reject(403,'Mail signature key is not configured.');
  let raw:ArrayBuffer;
  try{raw=await boundedRequestBody(c.req.raw,MAX_FORWARDED_BYTES+1024*1024);}
  catch(error){if(error instanceof RequestBodyTooLarge)return reject(413,'Forwarded mail exceeds the size limit.');throw error;}
  if(!await verifyMailWebhook(inbound.parseKey,raw,c.req.header('X-Twilio-Email-Event-Webhook-Timestamp')??'',c.req.header('X-Twilio-Email-Event-Webhook-Signature')??''))return reject(401,'Mail signature is invalid or expired.');
  const limited=await signedMailRateLimit(db);if(limited)return limited;
  const form=await new Request(c.req.url,{method:'POST',headers:{'content-type':c.req.header('content-type')??''},body:raw}).formData();
  const email=form.get('email');let envelope:{to?:unknown};
  try{envelope=JSON.parse(String(form.get('envelope')??''));}catch{return c.json({error:'The envelope is missing.'},400);}
  const recipients=Array.isArray(envelope.to)?envelope.to.filter((value):value is string=>typeof value==='string'):[];
  if(typeof email!=='string'||!recipients.length)return c.json({error:'Turn on raw MIME in Inbound Parse for this address.'},400);
  const outcome=await receiveForwarded(db,inbound.security,mailboxConfig(inbound.address),{recipients,raw:email});
  // A message for another address is acknowledged so SendGrid does not retry it.
  return c.json({accepted:outcome.result!=='refused'});
 });
 return app;
}
