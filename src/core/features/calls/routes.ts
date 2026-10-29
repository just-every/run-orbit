import {guard,clearGuards,refused} from '../identity/store';
import type {ProviderFetch} from '../capture/providers/config';
import {Hono} from 'hono';
import {z} from 'zod';
import type {AuthenticatedOperator} from '../identity';
import type {SourceSecurity} from '../../platform/source-security';
import {boundedRequestBody,RequestBodyTooLarge} from '../../platform/bounded-request-body';
import {consumeRateLimit} from '../../platform/public-rate-limit';
import {CallsRepository} from './repository';
import {phonePattern,normalizedPhone,validSignature} from './provider';
import {RecordError,audit} from '../records/shared';
const id=z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/),phone=z.string().regex(phonePattern);
type Config={security?:SourceSecurity;origin?:string;fetcher?:ProviderFetch};
const failures=(app:Hono<any>)=>app.onError((error,c)=>error instanceof RecordError?c.json({error:error.message},error.status):c.json({error:'Calling failed. Check the connection in Settings; no automatic retry is made.'},503));
export function callEventRoutes(db:D1Database,config:Config){const app=new Hono(),repo=new CallsRepository(db,config.security);failures(app);
 app.post('/',async c=>{
  let raw:string;try{raw=new TextDecoder().decode(await boundedRequestBody(c.req.raw,16384));}catch(error){return c.json({error:'Call callback body is too large or unreadable.'},error instanceof RequestBodyTooLarge?413:400);}
  const credentials=await repo.credentials();if(!credentials)return c.json({error:'Calling is not configured.'},503);
  const form=new URLSearchParams(raw),signature=c.req.header('X-Twilio-Signature')??'',url=`${credentials.origin}/api/v1/calls/twilio/events`;
  if(new URL(c.req.url).origin!==credentials.origin||!await validSignature(credentials.token,url,form,signature)||form.get('AccountSid')!==credentials.accountSid)return c.json({error:'Invalid call signature.'},403);
  const limited=await consumeRateLimit(db,`calls:${Math.floor(Date.now()/60000)}`,600,Date.now());if(limited)return limited;
  if(!/^CA[a-f0-9]{32}$/i.test(form.get('CallSid')??'')||!phonePattern.test(form.get('From')??'')||!phonePattern.test(form.get('To')??'')||!['inbound','outbound-api','outbound-dial'].includes(form.get('Direction')??'')||!['queued','initiated','ringing','in-progress','completed','busy','failed','no-answer','canceled'].includes(form.get('CallStatus')??'')||!/^\d{1,9}$/.test(form.get('SequenceNumber')??'0')||form.has('CallDuration')&&!/^\d{1,9}$/.test(form.get('CallDuration')!))return c.json({error:'Invalid call event.'},400);
  const receipt=await repo.receive(form);return c.json(receipt);
 });return app;
}
export function callRoutes(db:D1Database,config:Config){const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>(),repo=new CallsRepository(db,config.security);failures(app);
 app.get('/contacts/:id/log',async c=>c.json(await repo.log(c.req.param('id'))));
 app.get('/settings',async c=>c.json(await repo.status(c.get('operator').operatorId)));
 app.put('/settings',async c=>{const input=z.object({accountSid:z.string().regex(/^AC[a-f0-9]{32}$/i),token:z.string().min(1).max(500),from:phone,operatorPhone:phone}).strict().safeParse(await c.req.json());if(!input.success)return c.json({error:'Enter the account SID, token and international phone numbers.'},400);if(!config.origin||new URL(config.origin).protocol!=='https:')return c.json({error:'Calling needs the configured HTTPS installation origin.'},503);await repo.configure({...input.data,origin:new URL(config.origin).origin},c.get('operator').operatorId);return c.json({saved:true});});
 app.delete('/settings',async c=>{const actor=c.get('operator').operatorId;await repo.requireOwner(actor);await db.batch([guard(db,{sql:"EXISTS(SELECT 1 FROM operators WHERE id=? AND setup_owner=1 AND status='active')",args:[actor]}),db.prepare('DELETE FROM call_credentials'),audit(db,actor,'calls.disconnected','installation','workspace'),clearGuards(db)]);return c.json({disconnected:true});});
 app.post('/held/:id/link',async c=>{const input=z.object({contactId:id}).strict().safeParse(await c.req.json());if(!input.success||!id.safeParse(c.req.param('id')).success)return c.json({error:'Choose a contact for this held call.'},400);return c.json(await repo.review(c.req.param('id'),input.data.contactId,c.get('operator').operatorId));});
 // Dialing remains reviewed: the operator confirms both exact phone numbers before a single provider attempt.
 app.get('/contacts/:id/preview',async c=>{const credentials=await repo.credentials();if(!credentials)return c.json({error:'Connect Twilio in Settings first.'},409);const contact=await db.prepare('SELECT name,phone,contactability FROM contacts WHERE id=?').bind(c.req.param('id')).first<{name:string;phone:string|null;contactability:string}>();if(!contact)return c.json({error:'Contact not found.'},404);const to=normalizedPhone(contact.phone??'');if(!phonePattern.test(to)||contact.contactability!=='contactable')return c.json({error:'The contact needs a valid international number and permission to be contacted.'},409);return c.json({contactId:c.req.param('id'),name:contact.name,to,from:credentials.from,operatorPhone:credentials.operatorPhone});});
 app.post('/contacts/:id/dial',async c=>{
  const input=z.object({operationKey:id,confirmed:z.literal(true),to:phone,from:phone,operatorPhone:phone}).strict().safeParse(await c.req.json());if(!input.success)return c.json({error:'Review and confirm the exact call numbers.'},400);
  const snapshot=await repo.credentialSnapshot(),credentials=snapshot?.value;if(!credentials||!snapshot)return c.json({error:'Connect Twilio first.'},409);const contact=await db.prepare('SELECT phone,contactability FROM contacts WHERE id=?').bind(c.req.param('id')).first<{phone:string|null;contactability:string}>();
  if(!contact||contact.contactability!=='contactable'||normalizedPhone(contact.phone??'')!==input.data.to||credentials.from!==input.data.from||credentials.operatorPhone!==input.data.operatorPhone)return c.json({error:'Call details changed. Review them again.'},409);
  // Persist custody before the external attempt. An uncertain outcome is never retried automatically.
  const actor=c.get('operator').operatorId;
  try{await db.batch([guard(db,{sql:"EXISTS(SELECT 1 FROM contacts WHERE id=? AND phone IS ? AND contactability='contactable') AND EXISTS(SELECT 1 FROM call_credentials WHERE id=1 AND ciphertext=?) AND EXISTS(SELECT 1 FROM sessions s JOIN operators o ON o.id=s.operator_id WHERE s.id=? AND o.id=? AND o.status='active' AND s.revoked_at IS NULL AND s.expires_at>?)",args:[c.req.param('id'),contact.phone,snapshot.ciphertext,c.get('operator').sessionId,actor,new Date().toISOString()]}),db.prepare("INSERT INTO call_dial_attempts(id,contact_id,actor_id,created_at,state,call_sid) VALUES(?,?,?,?,'attempted',NULL)").bind(input.data.operationKey,c.req.param('id'),actor,new Date().toISOString()),audit(db,actor,'calls.dial-attempted','contact',c.req.param('id'),{operationKey:input.data.operationKey,to:input.data.to,from:input.data.from}),clearGuards(db)]);}catch(error){if(await db.prepare('SELECT 1 FROM call_dial_attempts WHERE id=?').bind(input.data.operationKey).first())return c.json({error:'This call was already attempted. Check Twilio before placing a new call.'},409);if(refused(error))return c.json({error:'Call details or access changed. Review the call again.'},409);throw error;}
  const uncertain=()=>repo.dialOutcome(input.data.operationKey,'uncertain');
  const body=new URLSearchParams({To:credentials.operatorPhone,From:credentials.from,Twiml:`<Response><Dial callerId="${credentials.from}"><Number statusCallback="${credentials.origin}/api/v1/calls/twilio/events" statusCallbackEvent="initiated ringing answered completed">${input.data.to}</Number></Dial></Response>`});
  let response:Response;try{response=await(config.fetcher??fetch)(`https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Calls.json`,{method:'POST',headers:{Authorization:`Basic ${btoa(`${credentials.accountSid}:${credentials.token}`)}`,'Content-Type':'application/x-www-form-urlencoded'},body,redirect:'manual'});}catch{await uncertain();return c.json({error:'Call outcome is unknown. Check Twilio before placing another call.',status:'uncertain'},502);}
  if(!response.ok){
   // Only documented call-creation validation refusals prove that no call was created.
   // https://www.twilio.com/docs/iam/test-credentials and https://www.twilio.com/docs/api/errors/21211
   let code:unknown;try{const failure=await response.json() as {code?:unknown;status?:unknown};if(failure?.status===400)code=failure.code;}catch{}
   if(response.status===400&&typeof code==='number'&&[21210,21211,21212,21214,21215,21216,21217].includes(code)){
    await repo.dialOutcome(input.data.operationKey,'failed',code);
    return c.json({error:`Twilio refused the call (code ${code}). No call was created. Review Settings and the numbers before placing a new call.`,status:'failed',providerErrorCode:code},502);
   }
   await uncertain();return c.json({error:`Twilio did not confirm the call (HTTP ${response.status}). Check Twilio before placing another call.`,status:'uncertain'},502);
  }
  let result:{sid?:string}|null;try{result=await response.json() as {sid?:string}|null;}catch{await uncertain();return c.json({error:'Call outcome is unknown. Check Twilio before placing another call.',status:'uncertain'},502);}if(!/^CA[a-f0-9]{32}$/i.test(result?.sid??'')){await uncertain();return c.json({error:'Twilio returned no valid call receipt. Check Twilio before placing another call.',status:'uncertain'},502);}
  await db.prepare("UPDATE call_dial_attempts SET state='submitted',call_sid=? WHERE id=?").bind(result!.sid!,input.data.operationKey).run();
  return c.json({callSid:result!.sid,status:'submitted'},201);
 });return app;
}
