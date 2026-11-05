import assert from 'node:assert/strict';
import {createApp} from './app';
import {todayApp} from './today-workspace';
import {signedDeliveryEvents,signedReplies,replyForm} from './signed-reply';
import {createOutboundMail} from '../../src/core/platform/outbound-mail';
import {createId} from '../../src/core/shared/ids';

/** Saved approvals and signed provider receipts read by the emitted record pages. */
export async function browserMailEvidenceData(db:D1Database,operatorId:string){
 const t=await todayApp(db,{operatorId}),email=['synthetic-orbit-401','customer.test'].join('@');
 const deal=await t.opportunity('Synthetic mail evidence','Synthetic Mail Company','Synthetic Mail Customer',email);
 const record=await t.json<any>(`/api/v1/records/opportunity/${deal}`,{},200),contact=record.contacts[0].id,company=record.record.company_id;
 const mail=createOutboundMail({SENDGRID_API_KEY:'synthetic-orbit-402',MAIL_FROM:['synthetic-orbit-403','sender.test'].join('@'),MAIL_REPLY_TO:['synthetic-orbit-404','sender.test'].join('@'),SENDGRID_UNSUBSCRIBE_GROUP_ID:'7',DB:db})!;
 const app=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})},outboundMail:mail});
 const api=async(path:string,body?:unknown,status=200)=>{
  const r=await app.request(`https://orbit.test/api/v1/${path}`,{method:body===undefined?'GET':'POST',headers:{Cookie:`__Host-orbit_session=${t.session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  assert.equal(r.status,status);return await r.json() as any;
 };
 const subject='Synthetic reviewed customer message',draft=await api(`workbench/opportunities/${deal}/drafts`,{contactId:contact,subject,body:'The reviewed proposal: https://customer.example.test/proposal/synthetic-orbit-405'},201);
 const preview=await api(`workbench/drafts/${draft.id}/approval-preview`),actual=globalThis.fetch;
 let submissions=0;
 try{
  globalThis.fetch=async input=>{assert.equal(String(input),'https://api.sendgrid.com/v3/mail/send');submissions++;return new Response(null,{status:202,headers:{'x-message-id':'synthetic-orbit-406'}});};
  const sent=await api(`workbench/drafts/${draft.id}/approve`,{revision:1,quietHoursConfirmation:preview.localTime});assert.equal(sent.state,'accepted');
 }finally{globalThis.fetch=actual;}
 assert.equal(submissions,1);
 const message=(await db.prepare('SELECT id,idempotency_key,message_id FROM outbound_messages WHERE draft_id=?').bind(draft.id).first<{id:string;idempotency_key:string;message_id:string}>())!;
 const reports=['processed','delivered','open','click'].map(event=>({sg_event_id:createId(),event,timestamp:Math.floor(Date.now()/1000),email,rer_product:'orbit',rer_delivery_id:message.idempotency_key,sg_message_id:'synthetic-orbit-406'}));
 const report=signedDeliveryEvents(db);assert.equal((await report(reports)).status,200);assert.equal((await report(reports)).status,200);
 await new Promise(resolve=>setTimeout(resolve,1000));
 const reply=replyForm(email,['<'+createId(),'reply.test>'].join('@'),message.message_id);reply.set('headers',String(reply.get('headers')).replace(/^Date:.*$/m,`Date: ${new Date().toUTCString()}`));
 const receive=signedReplies(db);assert.equal((await receive(reply)).status,200);assert.equal((await receive(reply)).status,200);
 const history=(await t.json<any>(`/api/v1/records/opportunity/${deal}`,{},200)).timeline;
 const entry=(kind:string)=>{const rows=history.filter((row:any)=>row.kind===kind);assert.equal(rows.length,1,kind);return rows[0].id as string;};
 return {deal,company,contact,subject,processed:entry('provider.processed'),delivered:entry('provider.delivered'),open:entry('provider.open'),click:entry('provider.click'),reply:entry('signal.recorded')};
}
