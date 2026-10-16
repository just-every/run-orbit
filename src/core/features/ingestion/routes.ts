import {isNativeSource} from './source-authority';
import { Hono } from 'hono';
import {boundedRequestBody,RequestBodyTooLarge} from '../../platform/bounded-request-body';
import {bookingEvent} from './booking-webhooks';
import {verifyAutomationSecret} from './automation-auth';
import type { SourceSecurity } from '../../platform/source-security';
import { payloadHash } from '../../platform/source-security';
import { eventSchema, IngestionError, standardTypes } from './contracts';
import { IngestionRepository } from './repository';

export function createSignalIngress(db:D1Database,security?:SourceSecurity){
  const app=new Hono(),repository=new IngestionRepository(db);
  app.post('/:source/:vendor?',async c=>{
    const vendor=c.req.param('vendor');if(vendor&&vendor!=='calcom'&&vendor!=='calendly'&&vendor!=='automation')return c.notFound();
    if(!/^[a-zA-Z0-9_-]{1,80}$/.test(c.req.param('source')))return c.json({error:'Invalid source ID.'},400);
    const source=await repository.source(c.req.param('source'));
    if(isNativeSource(c.req.param('source'),source?.type)||!source||!source.enabled||!source.secret_ciphertext)return c.json({error:'Source is not configured.'},403);
    if(!security)return c.json({error:'ORBIT_ENCRYPTION_KEY is required for configured sources.'},503);
    if(vendor==='automation'&&!await verifyAutomationSecret(await security.open(source.secret_ciphertext),c.req.header('Authorization')??''))return c.json({error:'Source credential is missing or invalid.'},401);
    let raw:string;
    try{raw=new TextDecoder('utf-8',{fatal:true}).decode(await boundedRequestBody(c.req.raw,262144));}
    catch(error){return c.json({error:error instanceof RequestBodyTooLarge?'Signal payload exceeds 262144 bytes.':'Signal payload must be valid UTF-8.'},error instanceof RequestBodyTooLarge?413:400);}
    let event;
    if(vendor==='calcom'||vendor==='calendly'){
      try{event=await bookingEvent(vendor,await security.open(source.secret_ciphertext),raw,c.req.header(vendor==='calcom'?'X-Cal-Signature-256':'Calendly-Webhook-Signature')??'');}
      catch(error){return c.json({error:error instanceof IngestionError?error.message:'Booking verification failed.'},error instanceof IngestionError?error.status:400);}
      if(await repository.hasEvent(source.id,event.eventId))return c.json({error:'This booking event was already received.'},409);
    }else{
      if(vendor!=='automation'&&!await security.verify(await security.open(source.secret_ciphertext),raw,c.req.header('X-Orbit-Timestamp')??'',c.req.header('X-Orbit-Signature')??''))return c.json({error:'Source signature is missing, invalid or expired.'},401);
      let parsed;try {parsed=eventSchema.safeParse(JSON.parse(raw));}catch{parsed=undefined;}
      if(!parsed?.success){await repository.reject(source.id,null,'Invalid event schema');return c.json({error:'Invalid event schema.'},400);}
      event=parsed.data;
    }
    if((!standardTypes.has(event.type)&&!event.type.startsWith(`${source.id}:`))||Date.parse(event.occurredAt)>Date.now()){await repository.reject(source.id,event.eventId,'Invalid event type or future occurred time');return c.json({error:'Invalid event type or future occurred time.'},400);}
    try{const result=await repository.ingest(source.id,event,await payloadHash(raw),raw,source);if((vendor==='calcom'||vendor==='calendly')&&'replayed' in result)return c.json({error:'This booking event was already received.'},409);return c.json(result,201);}
    catch(error){if(error instanceof IngestionError){if(error.status!==403)await repository.reject(source.id,event.eventId,error.message);return c.json({error:error.message},error.status);}return c.json({error:'Signal persistence failed; replay the same event identity.'},503);}
  });return app;
}

export {createSourceRoutes} from './source-routes';
