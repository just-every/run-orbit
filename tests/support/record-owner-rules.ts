import assert from 'node:assert/strict';
import {createApp} from './app';
import {createDependencies} from './dependencies';
import {exerciseOwnershipRemoval} from './record-owner-removal';

/** Rules use native review, composition, exact approval and provider settlement. */
export async function exerciseOwnershipRules(db:D1Database,actor:string,other:string){
 await db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(actor).run();
 const deps=createDependencies(db),session=await deps.auth.createSession(actor),otherSession=await deps.auth.createSession(other);let sends=0,fail=false;
 const app=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})},outboundMail:{send:async()=>{sends++;if(fail)throw new Error('Provider refused');return {providerMessageId:`synthetic-orbit-${sends}`};}}});
 const request=(path:string,method='GET',body?:unknown,token=session.token)=>app.request(`https://orbit.test/api/v1/${path}`,{method,headers:{Cookie:`__Host-orbit_session=${token}`,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const call=async(path:string,method='GET',body?:unknown,status=200,token=session.token):Promise<any>=>{const response=await request(path,method,body,token);assert.equal(response.status,status,await response.clone().text());return response.json();};
 const assign=async(kind:string,id:string,ownerId:string|null)=>{const review=await call('records/ownership/review','POST',{kind,ids:[id],ownerId});await call(`records/ownership/${review.id}/apply`,'POST',{});};
 const contact=async(name:string,company_id?:string)=>(await call('records/contact','POST',{name,email:`${name}@ownership.test`,company_id},201)).id as string;
 const detail=(id:string)=>call(`records/contact/${id}`);
 const configure=async(company:string,firstEmail:boolean)=>{const preview=await call('settings/assignment-rules/preview','POST',{company,firstEmail});await call('settings/assignment-rules/apply','POST',{previewId:preview.id});return preview;};
 assert.deepEqual((await call('settings/assignment-rules')).rules,{company:'off',firstEmail:false});
 await call('settings/assignment-rules/preview','POST',{company:'unowned',firstEmail:true},403,otherSession.token);
 const company=await call('records/company','POST',{name:'Northstar rule company'},201);await assign('company',company.id,other);
 const empty=await contact('synthetic-orbit-rule-empty',company.id),kept=await contact('synthetic-orbit-rule-kept',company.id);await assign('contact',kept,actor);
 const preview=await call('settings/assignment-rules/preview','POST',{company:'unowned',firstEmail:false});
 assert.ok(preview.changes.some((row:any)=>row.recordId===empty));assert.ok(!preview.changes.some((row:any)=>row.recordId===kept));assert.equal((await detail(empty)).ownership.ownerId,null);
 await assign('contact',empty,actor);await call('settings/assignment-rules/apply','POST',{previewId:preview.id},409);await assign('contact',empty,null);
 await configure('unowned',false);const ruleNotices=(await call('notifications','GET',undefined,200,otherSession.token)).notifications.filter((row:any)=>row.message.includes('Company-to-contact owner rule')&&row.message.includes('synthetic-orbit-rule-empty'));assert.equal(ruleNotices.length,1);assert.match(ruleNotices[0].message,/previous owner: Unassigned/);await call(`notifications/${ruleNotices[0].id}/read`,'POST',{},200,otherSession.token);assert.equal((await detail(empty)).ownership.ownerId,other);assert.equal((await detail(kept)).ownership.ownerId,actor);
 const newContact=await contact('synthetic-orbit-rule-associated',company.id);assert.equal((await detail(newContact)).ownership.ownerId,other);
 const unrelated=await contact('synthetic-orbit-rule-secondary');
 const unowned=await contact('synthetic-orbit-rule-future',company.id);await assign('contact',unowned,null);await call(`records/contact/${unowned}`,'PUT',{name:'synthetic-orbit-rule-future',job_title:'Planning lead'});assert.equal((await detail(unowned)).ownership.ownerId,null,'An ordinary edit does not re-run a company assignment rule');await assign('company',company.id,actor);
 assert.equal((await detail(unowned)).ownership.ownerId,actor);assert.equal((await detail(empty)).ownership.ownerId,other,'Fill-empty never replaces a contact owner');assert.equal((await detail(unrelated)).ownership.ownerId,null);
 const always=await configure('always',false);assert.ok(always.changes.some((row:any)=>row.recordId===empty));assert.equal((await detail(empty)).ownership.ownerId,actor);
 await assign('company',company.id,null);for(const id of [empty,kept,newContact,unowned])assert.equal((await detail(id)).ownership.ownerId,null,'Always-sync follows explicit company unassignment');
 const history=(await detail(empty)).timeline.filter((entry:any)=>entry.kind==='owner.changed'&&JSON.parse(entry.payload_json).reason==='Company-to-contact owner rule');assert.ok(history.length>=2);assert.ok(history.every((entry:any)=>entry.actor_id===actor));
 await configure('off',true);
 const recipient=await contact('synthetic-orbit-rule-email');
 async function send(id:string,token=session.token){
  const draft=await call(`workbench/records/contact/${id}/drafts`,'POST',{contactId:id,opportunityId:null,subject:'Production planning',body:'Can we arrange the planning discussion?'},201,token);
  const saved=(await call(`drafts/${draft.id}`)).draft;
  const rendered=await call(`library/drafts/${draft.id}/render`,'GET',undefined,200,token);await call(`library/drafts/${draft.id}/render`,'POST',{revision:saved.revision,reviewHash:rendered.reviewHash},200,token);
  const approval=await call(`workbench/drafts/${draft.id}/approval-preview`,'GET',undefined,200,token);
  return call(`workbench/drafts/${draft.id}/approve`,'POST',{revision:saved.revision,quietHoursConfirmation:approval.localTime},fail?502:200,token);
 }
 const accepted=await send(recipient);assert.equal(accepted.state,'accepted');assert.equal((await detail(recipient)).ownership.ownerId,actor);
 await send(recipient,otherSession.token);assert.equal((await detail(recipient)).ownership.ownerId,actor,'A later sender never replaces the first owner');
 const firstHistory=(await detail(recipient)).timeline.filter((entry:any)=>entry.kind==='owner.changed');assert.equal(firstHistory.length,1);assert.equal(JSON.parse(firstHistory[0].payload_json).reason,'First one-to-one email rule');
 const refused=await contact('synthetic-orbit-rule-refused');fail=true;const failure=await send(refused);assert.equal(failure.state,'delivery-unknown');assert.equal((await detail(refused)).ownership.ownerId,null);fail=false;
 const stage=(await call('settings')).stages[0].id,deal=await call('records/opportunity','POST',{title:'Production expansion',stage_id:stage,owner_id:other,value_cents:100},201);
 const notices=await call('notifications','GET',undefined,200,otherSession.token);const notice=notices.notifications.find((row:any)=>row.opportunityId===deal.id&&row.kind==='record.assigned');assert.ok(notice);assert.match(notice.message,/Production expansion/);assert.match(notice.message,/previous owner: Unassigned/);assert.ok(notice.href.includes(deal.id));await call(`notifications/${notice.id}/read`,'POST',{},200,otherSession.token);
 await call(`records/opportunity/${deal.id}`,'PUT',{title:'Production expansion',stage_id:stage,owner_id:other,value_cents:100});assert.equal((await call('notifications','GET',undefined,200,otherSession.token)).notifications.filter((row:any)=>row.opportunityId===deal.id&&row.kind==='record.assigned').length,1);
 await call(`records/contact/${empty}`,'DELETE',{confirmed:true});assert.ok(!(await call('notifications','GET',undefined,200,otherSession.token)).notifications.some((row:any)=>row.message.includes('synthetic-orbit-rule-empty')));
 await exerciseOwnershipRemoval(call,request,actor,other);
 await deps.auth.revoke(session.id);assert.equal((await request('settings/assignment-rules/preview','POST',{company:'off',firstEmail:false})).status,401);
}
