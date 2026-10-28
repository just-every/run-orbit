import {issueNativeCredential} from './api-credentials-proof';
import assert from 'node:assert/strict';
import { createDependencies } from './dependencies';
import { createApp } from './app';
import {nativeRecords,responseJson,type RecordsFixture} from './sanity-records-http';
import { createId } from '../../src/core/shared/ids';

export async function eraseDepartingOperators(f:RecordsFixture){
 const db=f.db,now=new Date().toISOString();
  const deps=createDependencies(db),records=nativeRecords(f),admin=f.actor;
  await deps.workspace.ensureWorkspace({name:'synthetic-orbit-1',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});
  const session=await deps.auth.createSession(admin),app=createApp({database:db,assets:{fetch:async()=>new Response('')}});
  const erase=(id:string)=>app.request(`https://orbit.test/api/v1/settings/operators/${id}/erase`,{method:'POST',headers:{cookie:`__Host-orbit_session=${session.token}`,origin:'https://orbit.test','content-type':'application/json'},body:JSON.stringify({confirmed:true})});
  const stage=f.stage;
  const contact=await records.save('contact',{name:'Customer',email:'customer@example.test',contactability:'contactable'},admin);
  const opportunity=await records.save('opportunity',{title:'Account',stage_id:stage,value_cents:0,contact_ids:[contact.id],primary_contact_id:contact.id},admin);
  const operator=async(email:string,displayName:string,text:string)=>{
   const id=createId(),call=createId();await deps.auth.ensureOperator({id,email,displayName});
   await db.prepare("INSERT INTO ai_calls(id,operator_id,provider,model,feature,duration_ms,status,error,created_at) VALUES(?,?,'test','test','draft',1,'failed',?,?)").bind(call,id,text,now).run();
   const company=await records.save('company',{name:`${displayName} account`},id),entry=await records.note('company',company.id,{kind:'note',text,occurredAt:now});
   await db.prepare('UPDATE timeline_entries SET actor_id=? WHERE id=?').bind(id,entry.id).run();
   const library=createId(),draft=createId(),message=createId(),recordDraft=createId(),recordMessage=createId(),review=JSON.stringify({sourceSubject:text,sourceBody:text,subject:text,body:text,fields:[{name:'owner.name',value:displayName}],context:JSON.stringify({'owner.name':displayName,'owner.email':email}),reviewed:true});
   await db.batch([
    db.prepare("INSERT INTO message_library(id,kind,name,subject,body,visibility,owner_id,revision,updated_at) VALUES(?,'signature',?,?,?,'private',?,1,?)").bind(library,text,text,text,id,now),
    db.prepare('INSERT INTO drafts(id,opportunity_id,author_id,recipient_contact_id,recipient_email,subject,body,revision,is_stale,created_at,updated_at,merge_review_json) VALUES(?,?,?,?,?,?,?,1,0,?,?,?)').bind(draft,opportunity.id,id,contact.id,'customer@example.test',text,text,now,now,review),
    db.prepare("INSERT INTO outbound_messages(id,draft_id,revision,opportunity_id,operator_id,contact_id,recipient_email,subject,body,state,created_at,updated_at,idempotency_key,message_id,approved_at,render_snapshot_json) VALUES(?,?,1,?,?,?,'customer@example.test',?,?,'accepted',?,?,?,?,?,?)").bind(message,draft,opportunity.id,id,contact.id,text,text,now,now,message,`<${message}@orbit.test>`,now,review)
   ]);
   await db.batch([db.prepare('INSERT INTO record_mail_drafts(id,author_id,recipient_contact_id,recipient_email,subject,body,revision,is_stale,created_at,updated_at,merge_review_json) VALUES(?,?,?,?,?,?,1,0,?,?,?)').bind(recordDraft,id,contact.id,'customer@example.test',text,text,now,now,review),db.prepare("INSERT INTO record_mail_context VALUES(?,'contact',?,NULL)").bind(recordDraft,contact.id),db.prepare("INSERT INTO record_mail_outbound_messages(id,draft_id,revision,operator_id,contact_id,recipient_email,subject,body,state,created_at,updated_at,idempotency_key,message_id,approved_at,render_snapshot_json) VALUES(?,?,1,?,?,'customer@example.test',?,?,'accepted',?,?,?,?,?,?)").bind(recordMessage,recordDraft,id,contact.id,text,text,now,now,recordMessage,`<${recordMessage}@orbit.test>`,now,review)]);
   const scheduledDraft=createId(),scheduledMessage=createId();await db.batch([db.prepare('INSERT INTO record_mail_drafts SELECT ?,opportunity_id,recommendation_id,author_id,recipient_contact_id,recipient_email,subject,body,revision,is_stale,stale_reason,created_at,updated_at,library_selection_json,merge_review_json FROM record_mail_drafts WHERE id=?').bind(scheduledDraft,recordDraft),db.prepare("INSERT INTO record_mail_context VALUES(?,'contact',?,NULL)").bind(scheduledDraft,contact.id),db.prepare("INSERT INTO record_mail_outbound_messages(id,draft_id,revision,operator_id,contact_id,recipient_email,subject,body,state,created_at,updated_at,idempotency_key,message_id,approved_at) VALUES(?,?,1,?,?,'customer@example.test',?,?,'scheduled',?,?,?,?,?)").bind(scheduledMessage,scheduledDraft,id,contact.id,text,text,now,now,scheduledMessage,`<${scheduledMessage}@orbit.test>`,now)]);
   return {id,call,entry:entry.id,library,draft,message,recordDraft,recordMessage,scheduledMessage};
  };
  await db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(admin).run();
  const mark=await operator('mark@example.test','Mark','Marketing plan drafted by Mark at MARK@example.test. Also jomark@example.test.');
  const markCredential=await issueNativeCredential(db,admin,opportunity.id,mark.id);
  const other=await operator('jomark@example.test','Marketing lead','Marketing review: Mark asked for the Marketing plan');
  const snapshot=async(row:{id:string;call:string;entry:string})=>({operator:await db.prepare('SELECT * FROM operators WHERE id=?').bind(row.id).first(),call:await db.prepare('SELECT * FROM ai_calls WHERE id=?').bind(row.call).first(),entry:await db.prepare('SELECT * FROM timeline_entries WHERE id=?').bind(row.entry).first()});
  const otherBefore=await snapshot(other);
  const content=async(row:{library:string;draft:string;message:string;recordDraft:string;recordMessage:string})=>({library:await db.prepare('SELECT * FROM message_library WHERE id=?').bind(row.library).first(),draft:await db.prepare('SELECT * FROM drafts WHERE id=?').bind(row.draft).first(),message:await db.prepare('SELECT * FROM outbound_messages WHERE id=?').bind(row.message).first(),recordDraft:await db.prepare('SELECT * FROM record_mail_drafts WHERE id=?').bind(row.recordDraft).first(),recordMessage:await db.prepare('SELECT * FROM record_mail_outbound_messages WHERE id=?').bind(row.recordMessage).first()});
  const otherContentBefore=await content(other);
  const aiPreview=await app.request('https://orbit.test/api/v1/assistance/record-mail/preview',{method:'POST',headers:{cookie:`__Host-orbit_session=${session.token}`,origin:'https://orbit.test','content-type':'application/json'},body:JSON.stringify({kind:'contact',recordId:contact.id,contactId:contact.id,opportunityId:null})});assert.equal(aiPreview.status,200);const pendingAI=await aiPreview.json() as any;
  const removal=await app.request(`https://orbit.test/api/v1/settings/operators/${mark.id}/removal-review`,{headers:{cookie:`__Host-orbit_session=${session.token}`}});assert.equal(removal.status,200);assert.ok((await removal.json() as any).scheduledMessages.some((row:any)=>row.id===mark.scheduledMessage));await responseJson(await f.request(`settings/operators/${mark.id}`,'DELETE',{confirmed:true}));assert.equal(await db.prepare('SELECT state FROM record_mail_outbound_messages WHERE id=?').bind(mark.scheduledMessage).first('state'),'cancelled');assert.equal((await erase(mark.id)).status,200);
  const erasedPreview=await app.request('https://orbit.test/api/v1/assistance/record-mail/generate',{method:'POST',headers:{cookie:`__Host-orbit_session=${session.token}`,origin:'https://orbit.test','content-type':'application/json'},body:JSON.stringify({previewId:pendingAI.id})});assert.equal(erasedPreview.status,503);assert.equal(await db.prepare("SELECT count(*) n FROM runtime_controls WHERE name LIKE 'record_ai_preview:%'").first('n'),0,'Removed or erased operator content cannot remain in a pending record preview');
  const call=await db.prepare('SELECT error FROM ai_calls WHERE id=?').bind(mark.call).first<{error:string}>();
  assert.equal(call!.error,'Marketing plan drafted by Erased operator at Erased operator. Also jomark@example.test.');
  const entry=await db.prepare('SELECT actor_id,payload_json FROM timeline_entries WHERE id=?').bind(mark.entry).first<{actor_id:string;payload_json:string}>();
  assert.equal(entry!.actor_id,mark.id,'Attribution keeps the stable operator ID');
  const note=JSON.parse(entry!.payload_json).text as string;
  assert.equal(note,'Marketing plan drafted by Erased operator at Erased operator. Also jomark@example.test.','Inside structured content only whole-word string values change; a longer word or another mailbox never does');
  assert.deepEqual(await snapshot(other),otherBefore,'Another operator, their text and their notes are unchanged');
  assert.deepEqual(await content(other),otherContentBefore,'Another operator’s library and reviewed messages retain their content');
  const erasedContent=await content(mark);
  assert.equal((erasedContent.library as {owner_id:string}).owner_id,mark.id);
  for(const table of ['library','draft','message','recordDraft','recordMessage'] as const){const row=erasedContent[table] as Record<string,string>;assert.equal(row.body,'Marketing plan drafted by Erased operator at Erased operator. Also jomark@example.test.');}
  for(const text of [(erasedContent.draft as {merge_review_json:string}).merge_review_json,(erasedContent.message as {render_snapshot_json:string}).render_snapshot_json,(erasedContent.recordDraft as {merge_review_json:string}).merge_review_json,(erasedContent.recordMessage as {render_snapshot_json:string}).render_snapshot_json]){
   const review=JSON.parse(text);assert.equal(review.fields[0].name,'owner.name');assert.equal(review.fields[0].value,'Erased operator');assert.deepEqual(JSON.parse(review.context),{'owner.name':'Erased operator','owner.email':'Erased operator'});
  }
  assert.equal(await db.prepare('SELECT id FROM api_credentials WHERE id=?').bind(markCredential.credential.id).first(),null,'Operator erasure removes their credential verifier and scope');
  const erased=await db.prepare('SELECT display_name,email FROM operators WHERE id=?').bind(mark.id).first<{display_name:string;email:string}>();assert.equal(erased!.display_name,'Erased operator');assert.ok(erased!.email.endsWith('@example.invalid'));

  // 'Ann' is also part of another operator's name, so whose name attributed text means is ambiguous.
  const ann=await operator('ann@example.test','Ann','Annual review with Ann');await operator('annlee@example.test','Ann Lee','Ann Lee prepared the annual plan');
  const annBefore=await snapshot(ann);await responseJson(await f.request(`settings/operators/${ann.id}`,'DELETE',{confirmed:true}));const removed=await snapshot(ann);
  const refused=await erase(ann.id);assert.equal(refused.status,409);
  assert.deepEqual(await snapshot(ann),removed,'A refused erasure writes nothing');assert.equal((annBefore.call as {error:string}).error,'Annual review with Ann');
  const quoted=await operator('quoted@example.test','Jo "Quoted"','Signature by Jo "Quoted" at quoted@example.test');
  await responseJson(await f.request(`settings/operators/${quoted.id}`,'DELETE',{confirmed:true}));assert.equal((await erase(quoted.id)).status,200);
  const quotedContent=await content(quoted),quotedReview=JSON.parse((quotedContent.message as {render_snapshot_json:string}).render_snapshot_json);
  assert.deepEqual(JSON.parse(quotedReview.context),{'owner.name':'Erased operator','owner.email':'Erased operator'},'Erasure preserves both layers of JSON when a display name contains quotes');
}
