import {isNativeSource} from './source-authority';
import { Hono } from 'hono';
import {boundedRequestBody,RequestBodyTooLarge} from '../../platform/bounded-request-body';
import {rejectedRateLimit,signedSourceRateLimit} from '../../platform/public-rate-limit';
import {bookingEvent} from './booking-webhooks';
import {verifyAutomationSecret} from './automation-auth';
import type { SourceSecurity } from '../../platform/source-security';
import { payloadHash } from '../../platform/source-security';
import { eventSchema, IngestionError, standardTypes } from './contracts';
import { IngestionRepository } from './repository';

export function createSignalIngress(db:D1Database,security?:SourceSecurity){
  const app=new Hono(),repository=new IngestionRepository(db);
  app.post('/:source/:vendor?',async c=>{
    // Refusals before the source's credential verifies spend the caller's public budget, never a source's.
    const reject=async(status:IngestionError['status'],error:string)=>(await rejectedRateLimit(db,c.req.raw))??c.json({error},status);
    const vendor=c.req.param('vendor');if(vendor&&vendor!=='calcom'&&vendor!=='calendly'&&vendor!=='automation')return c.notFound();
    if(!/^[a-zA-Z0-9_-]{1,80}$/.test(c.req.param('source')))return reject(400,'Invalid source ID.');
    const source=await repository.source(c.req.param('source'));
    if(isNativeSource(c.req.param('source'),source?.type)||!source||!source.enabled||!source.secret_ciphertext)return reject(403,'Source is not configured.');
    if(!security)return reject(503,'ORBIT_ENCRYPTION_KEY is required for configured sources.');
    if(vendor==='automation'&&!await verifyAutomationSecret(await security.open(source.secret_ciphertext),c.req.header('Authorization')??''))return reject(401,'Source credential is missing or invalid.');
    let raw:string;
    try{raw=new TextDecoder('utf-8',{fatal:true}).decode(await boundedRequestBody(c.req.raw,262144));}
    catch(error){return reject(error instanceof RequestBodyTooLarge?413:400,error instanceof RequestBodyTooLarge?'Signal payload exceeds 262144 bytes.':'Signal payload must be valid UTF-8.');}
    let event;
    if(vendor==='calcom'||vendor==='calendly'){
      try{event=await bookingEvent(vendor,await security.open(source.secret_ciphertext),raw,c.req.header(vendor==='calcom'?'X-Cal-Signature-256':'Calendly-Webhook-Signature')??'');}
      catch(error){return reject(error instanceof IngestionError?error.status:400,error instanceof IngestionError?error.message:'Booking verification failed.');}
      const limited=await signedSourceRateLimit(db,source.id);if(limited)return limited;
      if(await repository.hasEvent(source.id,event.eventId))return c.json({error:'This booking event was already received.'},409);
    }else{
      if(vendor!=='automation'&&!await security.verify(await security.open(source.secret_ciphertext),raw,c.req.header('X-Orbit-Timestamp')??'',c.req.header('X-Orbit-Signature')??''))return reject(401,'Source signature is missing, invalid or expired.');
      const limited=await signedSourceRateLimit(db,source.id);if(limited)return limited;
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
