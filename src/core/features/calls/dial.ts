import {guard,clearGuards,refused} from '../identity/store';
import type {NativeActor} from '../identity/session';
import type {SourceSecurity} from '../../platform/source-security';
import type {ProviderFetch} from '../capture/providers/config';
import {CallsRepository} from './repository';
import {normalizedPhone} from './provider';
import {audit} from '../records/shared';
export async function dialCall(db:D1Database,config:{security?:SourceSecurity;fetcher?:ProviderFetch},contactId:string,actor:NativeActor,input:{operationKey:string;to:string;from:string;operatorPhone:string}){

  const repo=new CallsRepository(db,config.security);
  const session= 'sessionId' in actor ? {sql:"EXISTS(SELECT 1 FROM sessions s JOIN operators o ON o.id=s.operator_id WHERE s.id=? AND o.id=? AND o.status='active' AND s.revoked_at IS NULL AND s.expires_at>?)",args:[actor.sessionId,actor.operatorId,new Date().toISOString()]} : {sql:"EXISTS(SELECT 1 FROM operators o WHERE o.id=? AND o.status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=o.id))",args:[actor.operatorId]};
  const reply=(value:unknown,status:number)=>Response.json(value,{status});
  const snapshot=await repo.credentialSnapshot(),credentials=snapshot?.value;if(!credentials||!snapshot)return reply({error:'Connect Twilio first.'},409);const contact=await db.prepare('SELECT phone,contactability FROM contacts WHERE id=?').bind(contactId).first<{phone:string|null;contactability:string}>();
  if(!contact||contact.contactability!=='contactable'||normalizedPhone(contact.phone??'')!==input.to||credentials.from!==input.from||credentials.operatorPhone!==input.operatorPhone)return reply({error:'Call details changed. Review them again.'},409);
  // Persist custody before the external attempt. An uncertain outcome is never retried automatically.
  const actorId=actor.operatorId;
  try{await db.batch([guard(db,{sql:`EXISTS(SELECT 1 FROM contacts WHERE id=? AND phone IS ? AND contactability='contactable') AND EXISTS(SELECT 1 FROM call_credentials WHERE id=1 AND ciphertext=?) AND ${session.sql}`,args:[contactId,contact.phone,snapshot.ciphertext,...session.args]}),db.prepare("INSERT INTO call_dial_attempts(id,contact_id,actor_id,created_at,state,call_sid) VALUES(?,?,?,?,'attempted',NULL)").bind(input.operationKey,contactId,actorId,new Date().toISOString()),audit(db,actorId,'calls.dial-attempted','contact',contactId,{operationKey:input.operationKey,to:input.to,from:input.from}),clearGuards(db)]);}catch(error){if(await db.prepare('SELECT 1 FROM call_dial_attempts WHERE id=?').bind(input.operationKey).first())return reply({error:'This call was already attempted. Check Twilio before placing a new call.'},409);if(refused(error))return reply({error:'Call details or access changed. Review the call again.'},409);throw error;}
  const uncertain=()=>repo.dialOutcome(input.operationKey,'uncertain');
  const body=new URLSearchParams({To:credentials.operatorPhone,From:credentials.from,Twiml:`<Response><Dial callerId="${credentials.from}"><Number statusCallback="${credentials.origin}/api/v1/calls/twilio/events" statusCallbackEvent="initiated ringing answered completed">${input.to}</Number></Dial></Response>`});
  let response:Response;try{response=await(config.fetcher??fetch)(`https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Calls.json`,{method:'POST',headers:{Authorization:`Basic ${btoa(`${credentials.accountSid}:${credentials.token}`)}`,'Content-Type':'application/x-www-form-urlencoded'},body,redirect:'manual'});}catch{await uncertain();return reply({error:'Call outcome is unknown. Check Twilio before placing another call.',status:'uncertain'},502);}
  if(!response.ok){
   // Only documented call-creation validation refusals prove that no call was created.
   // https://www.twilio.com/docs/iam/test-credentials and https://www.twilio.com/docs/api/errors/21211
   let code:unknown;try{const failure=await response.json() as {code?:unknown;status?:unknown};if(failure?.status===400)code=failure.code;}catch{}
   if(response.status===400&&typeof code==='number'&&[21210,21211,21212,21214,21215,21216,21217].includes(code)){
    await repo.dialOutcome(input.operationKey,'failed',code);
    return reply({error:`Twilio refused the call (code ${code}). No call was created. Review Settings and the numbers before placing a new call.`,status:'failed',providerErrorCode:code},502);
   }
   await uncertain();return reply({error:`Twilio did not confirm the call (HTTP ${response.status}). Check Twilio before placing another call.`,status:'uncertain'},502);
  }
  let result:{sid?:string}|null;try{result=await response.json() as {sid?:string}|null;}catch{await uncertain();return reply({error:'Call outcome is unknown. Check Twilio before placing another call.',status:'uncertain'},502);}if(!/^CA[a-f0-9]{32}$/i.test(result?.sid??'')){await uncertain();return reply({error:'Twilio returned no valid call receipt. Check Twilio before placing another call.',status:'uncertain'},502);}
  await db.prepare("UPDATE call_dial_attempts SET state='submitted',call_sid=? WHERE id=?").bind(result!.sid!,input.operationKey).run();
  return reply({callSid:result!.sid,status:'submitted'},201);
}
