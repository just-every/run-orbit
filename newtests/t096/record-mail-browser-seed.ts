import {mailboxBrowserSeed} from '../../tests/support/mailbox-browser';
import assert from 'node:assert/strict';
import {mock} from 'node:test';
import {fixture,signIn} from './fixture';
import {notificationAutomation} from '../../tests/support/notification-automation.mjs';
import {createApp} from '../../tests/support/app';
/** Accepted history is created through real review with only relay delivery faked. */
export async function recordMailBrowserSeed(f:Awaited<ReturnType<typeof fixture>>){
 const at=Date.now()-14*86400000;mock.timers.enable({apis:['Date'],now:at});try{
  const app=createApp({database:f.db,assets:{fetch:async()=>new Response(null,{status:404})},outboundMail:{provider:'rer',optOutOrigin:'https://orbit.test',messageIdDomain:'orbit.test',send:async()=>({providerMessageId:'synthetic-orbit-browser-receipt'})}}),call=async(path:string,method='GET',body?:unknown,status=200)=>{const response=await app.request(`https://orbit.test/api/v1/${path}`,{method,headers:{Cookie:f.cookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});assert.equal(response.status,status,await response.clone().text());return response.json() as Promise<any>;};
  const before=await call('notifications');
  const company=await call('records/company','POST',{name:'Northstar Manufacturing',primary_domain:'northstar-mail.example'},201),contact=await call('records/contact','POST',{name:'Morgan Chen',email:'synthetic-orbit-morgan@northstar-mail.example',company_id:company.id,contactability:'contactable'},201),draft=await call(`workbench/records/contact/${contact.id}/drafts`,'POST',{contactId:contact.id,opportunityId:null,subject:'Production rollout consultation',body:'Hi Morgan, can we confirm the consultation for your production team?'},201),render=await call(`library/drafts/${draft.id}/render`);await call(`library/drafts/${draft.id}/render`,'POST',{revision:1,reviewHash:render.reviewHash});const preview=await call(`workbench/drafts/${draft.id}/approval-preview`),message=await call(`workbench/drafts/${draft.id}/approve`,'POST',{revision:1,quietHoursConfirmation:preview.localTime});assert.equal(message.state,'accepted');
  assert.deepEqual(await call('notifications'),before,'The sender receives no notification for their own direct acceptance');
  await call('settings/operators','POST',{email:'synthetic-orbit-notice-colleague@example.test',displayName:'Notification colleague'},201);
  const colleague=await signIn(f.db,'synthetic-orbit-notice-colleague@example.test');
  const other=async(path:string,body:unknown)=>{const response=await app.request('https://orbit.test/api/v1/'+path,{method:'POST',headers:{Cookie:colleague.cookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(response.status,200,await response.clone().text());return response.json() as Promise<any>;};
  const assignment=await other('records/ownership/review',{kind:'contact',ids:[contact.id],ownerId:f.operator.operatorId});await other(`records/ownership/${assignment.id}/apply`,{});
  const notice=(await call('notifications')).notifications.find((row:any)=>row.kind==='record.assigned'&&row.href===`/app/contacts/${contact.id}`);
  assert.ok(notice,'Another person still creates the contact notification the browser opens');assert.equal(notice.readAt,null);
  await notificationAutomation(async(path:string,body?:unknown)=>{const response=await app.request('https://orbit.test'+path,{method:body===undefined?'GET':'POST',headers:{Cookie:f.cookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});assert.ok(response.ok,await response.clone().text());return response.json();},{kind:'contact',id:contact.id,title:'Morgan Chen',ownerId:f.operator.operatorId});
  return{...await mailboxBrowserSeed(f.db,f.cookie,contact.id),companyId:company.id,contactId:contact.id,subject:'Production rollout consultation'};
 }finally{mock.timers.reset();}
}
