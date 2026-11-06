import assert from 'node:assert/strict';
import type {CaptureFixture} from './capture-fixture';
import {createApp} from './app';
import {createOutboundMail} from '../../src/core/platform/outbound-mail';
import {OutreachService} from '../../src/core/features/outreach/service';
import {databaseDigest} from './stop-attribution';

export async function optOutRows(db:D1Database){
 return (await db.prepare('SELECT token,message_id,contact_id,origin,created_at FROM outbound_opt_out_capabilities ORDER BY token').all<{token:string;message_id:string;contact_id:string;origin:string;created_at:string}>()).results;
}

/** Keep review, approval, serialization and dispatch real; replace only relay HTTP. */
async function managedMail<T>(db:D1Database,run:(app:ReturnType<typeof createApp>,mail:NonNullable<ReturnType<typeof createOutboundMail>>,requests:any[])=>Promise<T>){
 const relay='https://managed-mail.example.test/send',from=await db.prepare('SELECT email FROM operators ORDER BY id LIMIT 1').first<string>('email');
 assert.ok(from);
 const mail=createOutboundMail({DB:db,MAIL_PROVIDER:'rer',AUTH_ORIGIN:'https://orbit.test',MAIL_FROM:from,MAIL_RELAY_URL:relay,MAIL_API_KEY:'synthetic-orbit-1'})!;
 const actual=globalThis.fetch,requests:any[]=[];
 globalThis.fetch=async(input,init)=>{
  if(String(input)!==relay)return actual(input,init);
  requests.push(JSON.parse(String(init?.body)));
  return Response.json({messageId:'<synthetic-orbit-'+requests.length+'@'+from.split('@')[1]+'>'},{status:202});
 };
 try{return await run(createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})},outboundMail:mail}),mail,requests);}
 finally{globalThis.fetch=actual;}
}

export async function seedOptOutArchive(f:CaptureFixture){
 return managedMail(f.db,async(app,_mail,requests)=>{
  const call=async(path:string,body?:unknown)=>{
   const response=await app.request('https://orbit.test/api/v1/'+path,{method:body===undefined?'GET':'POST',headers:{Cookie:f.cookie,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
   assert.ok(response.ok,`${path}: ${response.status} ${await response.clone().text()}`);return response.json() as Promise<any>;
  };
  // The captured mailbox already bounced Bob. Use a fresh native control contact
  // rather than clearing that existing stop to prepare another approved send.
  const original=await call(`records/contact/${f.ana}`),deal=await call(`records/opportunity/${f.opportunity}`);
  const control=await call('records/contact',{name:'Archive control recipient',email:'synthetic-orbit-2'+original.record.email.slice(original.record.email.indexOf('@'))});
  const controlDeal=await call('records/opportunity',{title:'Archive control deal',stage_id:deal.record.stage_id,value_cents:0,contact_ids:[control.id],primary_contact_id:control.id});
  const sent=[] as {id:string;contact:string;url:string}[],scheduled=[] as string[];
  for(const [contact,opportunity] of [[f.ana,f.opportunity],[control.id,controlDeal.id]])for(const future of [false,true]){
   const subject='Archived opt-out '+contact+(future?' scheduled':' sent'),body='Reviewed archive capability';
   const draft=await call(`workbench/opportunities/${opportunity}/drafts`,{contactId:contact,subject,body});
   const state=await call(`workbench/drafts/${draft.id}/opt-out`);
   if(!state.carries)await call(`workbench/drafts/${draft.id}/opt-out`,{choice:'added'});
   const saved=(await call(`drafts/${draft.id}`)).draft;
   const review=await call(`workbench/drafts/${draft.id}/review`,{revision:saved.revision,reviewedUpdatedAt:saved.updatedAt,recipientContactId:contact,recipientEmail:saved.recipientEmail,subject:saved.subject,body:saved.body});
   const preview=await call(`workbench/drafts/${draft.id}/approval-preview`);
   const approved=await call(`workbench/drafts/${draft.id}/approve`,{revision:review.revision,...(future?{scheduledAt:'2030-01-09T10:00:00.000Z'}:{quietHoursConfirmation:preview.localTime})});
   assert.equal(approved.state,future?'scheduled':'accepted');
   const row=(await optOutRows(f.db)).find(row=>row.message_id===approved.id);
   assert.ok(row);assert.equal(row.contact_id,contact);assert.equal(row.origin,'https://orbit.test');assert.equal(row.created_at,new Date().toISOString());assert.match(row.token,/^[a-f0-9]{64}$/);
   if(future){scheduled.push(approved.id);continue;}
   const url=row.origin+'/unsubscribe/'+row.token,wire=requests.at(-1);
   assert.equal(wire.subject,subject);assert.equal(wire.text,body+'\n\nUnsubscribe: '+url);assert.equal(wire.listUnsubscribe,'<'+url+'>');assert.equal(wire.listUnsubscribePost,true);
   sent.push({id:approved.id,contact,url});
  }
  assert.equal(requests.length,2,'Only the two explicitly approved immediate messages reach the relay');
  return {rows:await optOutRows(f.db),sent,scheduled,ana:f.ana,other:control.id};
 });
}
export type OptOutArchive = Awaited<ReturnType<typeof seedOptOutArchive>>;

/** Fresh reads and the original anonymous link prove usable custody, not just bytes. */
export async function proveOptOutArchive(source:D1Database,restored:D1Database,proof:OptOutArchive,setTime:(at:number)=>void,method:'plain'|'one-click'){
 assert.deepEqual(await optOutRows(restored),proof.rows,'Every private capability field survives restore exactly');
 const sourceBefore=await databaseDigest(source),before=Date.now();
 try{
  setTime(Date.parse('2040-01-09T10:00:00.000Z'));
  await managedMail(restored,async(app,mail,requests)=>{
   const bound=proof.sent.find(row=>row.contact===proof.ana)!,other=proof.sent.find(row=>row.contact===proof.other)!;
   const contact=(id:string)=>restored.prepare('SELECT * FROM contacts WHERE id=?').bind(id).first();
   const otherBefore=await contact(proof.other),messages=async()=>(await restored.prepare('SELECT * FROM outbound_messages ORDER BY id').all()).results;
   assert.equal((await contact(proof.ana))!.contactability,'contactable');assert.equal(otherBefore!.contactability,'contactable');
   const messagesBefore=await messages();
   for(const id of proof.scheduled){const row=messagesBefore.find(row=>row.id===id);assert.ok(row);assert.equal(row.state,'cancelled','Restore withdraws scheduled dispatch authority');}
   const untouched=await databaseDigest(restored),confirmation=await app.request(bound.url),html=await confirmation.text();
   assert.equal(confirmation.status,200);assert.match(html,/<form[^>]*method="post"/);assert.match(html,/<button[^>]*type="submit"/);
   assert.equal(await databaseDigest(restored),untouched,'The original GET works ten years later without changing any restored data');
   const post=()=>app.request(bound.url,{method:'POST',...(method==='plain'?{}:{headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'List-Unsubscribe=One-Click'})});
   const stopped=await post();assert.equal(stopped.status,200);assert.match(await stopped.text(),/unsubscribed/i);
   assert.equal((await contact(proof.ana))!.contactability,'do_not_contact');
   assert.deepEqual(await contact(proof.other),otherBefore,'The other contact is unchanged');
   assert.deepEqual(await messages(),messagesBefore,'Opt-out never reauthorizes or rewrites already cancelled work');
   const stoppedDigest=await databaseDigest(restored);assert.equal((await post()).status,200);
   assert.equal(await databaseDigest(restored),stoppedDigest,'The restored capability remains idempotent');
   assert.equal((await app.request(other.url)).status,200,'The other original capability still opens');
   await new OutreachService(restored,mail).dispatchDue();await new OutreachService(restored,mail).dispatchDue();
   assert.deepEqual(await messages(),messagesBefore,'Late repeated dispatch leaves restored schedules cancelled');
   assert.equal(requests.length,0,'Restoring and using old capabilities requires no provider resend');
   assert.deepEqual(await optOutRows(restored),proof.rows,'GET, POST and late dispatch neither expire nor rotate the restored tokens');
  });
 }finally{setTime(before);}
 assert.equal(await databaseDigest(source),sourceBefore,'Restored capability use leaves the source installation untouched');
}
