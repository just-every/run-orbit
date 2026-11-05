import assert from 'node:assert/strict';
import {createApp} from './app';
import {createOutboundMail} from '../../src/core/platform/outbound-mail';

/** Exercise native review and submission; replace only the managed provider's HTTP edge. */
export async function reviewedMessageOutcomes(db:D1Database,cookie:string,opportunityId:string,contactId:string){
 const origin='https://orbit.test',nativeFetch=globalThis.fetch,relayUrl='https://mail.example.test/send';
 let outcome='accepted',submissions=0;
 globalThis.fetch=async(input,init)=>{
  if(String(input)!==relayUrl)return nativeFetch(input,init);
  assert.equal(init?.method,'POST');
  assert.equal(new Headers(init?.headers).get('authorization'),'Bearer synthetic-orbit-144');
  const content=JSON.parse(String(init?.body));assert.equal(content.subject,`Runtime ${outcome}`);assert.equal(content.text,'Runtime reviewed body');
  submissions++;
  if(outcome==='failed')return Response.json({error:'rejected'},{status:400});
  if(outcome==='delivery-unknown')return Response.json({},{status:202});
  return Response.json({messageId:`<synthetic-orbit-${submissions}`+'@'+'example.test>'},{status:202});
 };
 try{
  const mail=createOutboundMail({MAIL_PROVIDER:'rer',MAIL_FROM:'runtime-sender'+'@'+'example.test',MAIL_RELAY_URL:relayUrl,MAIL_API_KEY:'synthetic-orbit-144'})!;
  const app=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})},outboundMail:mail});
  const request=async(path:string,method='GET',body?:unknown,status=200)=>{
   const response=await app.request(origin+'/api/v1/workbench/'+path,{method,headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
   assert.equal(response.status,status,await response.clone().text());return response.json() as Promise<any>;
  };
  const messages=[];
  for(outcome of ['bounced','accepted','delivered','failed','delivery-unknown']){
   const draft=await request(`opportunities/${opportunityId}/drafts`,'POST',{contactId,subject:`Runtime ${outcome}`,body:'Runtime reviewed body'},201);
   const preview=await request(`drafts/${draft.id}/approval-preview`),approval={revision:1,quietHoursConfirmation:preview.localTime};
   const submitted=await request(`drafts/${draft.id}/approve`,'POST',approval,['failed','delivery-unknown'].includes(outcome)?502:200);
   const state=['bounced','delivered'].includes(outcome)?'accepted':outcome;
   assert.equal(submitted.state,state);
   const saved=(await request(`opportunities/${opportunityId}/messages`)).messages.find((message:any)=>message.id===submitted.id);
   assert.equal(saved.state,state);assert.equal(saved.deliveredAt,null);assert.equal(Boolean(saved.acceptedAt),state==='accepted');
   const persisted=await db.prepare('SELECT idempotency_key,state FROM outbound_messages WHERE id=?').bind(submitted.id).first<{idempotency_key:string;state:string}>();
   assert.equal(persisted!.state,state);
   const before=submissions;
   await request(`drafts/${draft.id}/approve`,'POST',approval,409);
   assert.equal(submissions,before,'Replayed approval never submits again, including refusal or unresolved acceptance');
   messages.push({id:submitted.id,draftId:draft.id,idempotencyKey:persisted!.idempotency_key,outcome,subject:`Runtime ${outcome}`});
  }
  assert.equal(submissions,5,'Exactly one provider submission per reviewed message');
  return messages;
 }finally{globalThis.fetch=nativeFetch;}
}
