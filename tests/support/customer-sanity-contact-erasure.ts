import {issueNativeCredential} from './api-credentials-proof';
import assert from 'node:assert/strict';
import { RecordsRepository } from '../../src/core/features/records/repository';
import { ManualRepository } from '../../src/core/features/records/manual';
import { createDependencies } from './dependencies';
import { createId } from '../../src/core/shared/ids';

import {createApp} from './app';

export async function contactErasure(db:D1Database) {
 for(const deleteOpportunityFirst of [false,true]){

 const actor=createId(),stage=createId(),now=new Date().toISOString();
  await createDependencies(db).auth.ensureOperator({id:actor,email:`${actor}@erasure-operator.example.test`,displayName:'Erasure operator'});
  // An installed Orbit always has its workspace; erasure authority is a current workspace membership.
  await createDependencies(db).workspace.ensureWorkspace({name:'Erasure checks',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});
  await db.prepare('INSERT INTO pipeline_stages VALUES(?,?,0,?,?)').bind(stage,'Qualified',now,now).run();
  const records=new RecordsRepository(db),manual=new ManualRepository(db),customers=[];
  for(const email of ['first@example.test','second@example.test']) {
   const contact=await records.save('contact',{name:'Acceptance customer',email},actor);
   const opportunity=await records.save('opportunity',{title:email,stage_id:stage,value_cents:0,contact_ids:[contact.id],primary_contact_id:contact.id},actor);
   const entry=await manual.save('contact',contact.id,{kind:'note',text:'Acceptance customer discussed their separate account.',occurredAt:now},actor);
   const notification=createId(),preview=createId(),call=createId();
   await db.batch([
    db.prepare("INSERT INTO notifications(id,operator_id,opportunity_id,event_key,kind,message,created_at) VALUES(?,?,?,?,'customer.reply','Acceptance customer replied',?)").bind(notification,actor,opportunity.id,notification,now),
    db.prepare("INSERT INTO ai_previews(id,operator_id,opportunity_id,recommendation_id,recipient_contact_id,feature,content_json,created_at) VALUES(?,?,?,'test',?,'draft',?,?)").bind(preview,actor,opportunity.id,contact.id,JSON.stringify({body:'Hello Acceptance customer'}),now),
    db.prepare("INSERT INTO ai_calls(id,operator_id,opportunity_id,provider,model,feature,input_tokens,output_tokens,cached_input_tokens,estimated_cost,duration_ms,status,error,created_at) VALUES(?,?,?,'test','test','draft',123,45,6,0.0123,1,'failed','Provider rejected Acceptance customer request',?)").bind(call,actor,opportunity.id,now),
   ]);
   customers.push({contact,opportunity,entry,notification,preview,call});
  }
  const [removed,retained]=customers;
  await db.prepare('UPDATE operators SET setup_owner=0 WHERE setup_owner=1').run();
  await db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(actor).run();
  const credential=await issueNativeCredential(db,actor,removed.opportunity.id),retainedCredential=await issueNativeCredential(db,actor,retained.opportunity.id);
  async function counterpart(){const result:Record<string,unknown>={};for(const [table,id]of [['contacts',retained.contact.id],['opportunities',retained.opportunity.id],['timeline_entries',retained.entry.id],['notifications',retained.notification],['ai_previews',retained.preview],['ai_calls',retained.call]])result[table]=await db.prepare(`SELECT * FROM ${table} WHERE id=?`).bind(id).first();return result;}
  const labelCredential=await issueNativeCredential(db,actor,retained.opportunity.id,actor,'synthetic-orbit-1 '+await db.prepare('SELECT email FROM contacts WHERE id=?').bind(removed.contact.id).first('email'));
  const before=await counterpart();assert.ok(Object.values(before).every(Boolean));
  const session=await createDependencies(db).auth.createSession(actor),app=createApp({database:db,clock:{now:()=>new Date('2026-10-27T00:00:00.000Z')},assets:{fetch:async()=>new Response(null,{status:404})}});
  const api=()=>app.request('https://orbit.test/api/rest/v1/deals/'+removed.opportunity.id,{headers:{Authorization:'Bearer '+credential.secret}});
  assert.equal((await api()).status,200,'the scoped customer is readable before erasure');
  const erase=async(kind:string,id:string)=>{const response=await app.request(`https://orbit.test/api/v1/records/${kind}/${id}`,{method:'DELETE',headers:{Cookie:'__Host-orbit_session='+session.token,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify({confirmed:true})});assert.equal(response.status,200,await response.clone().text());};
  if(deleteOpportunityFirst)await erase('opportunity',removed.opportunity.id);
  await erase('contact',removed.contact.id);
  assert.equal((await api()).status,401,'erasure withdraws scoped API authority on its next request');
  assert.equal(await db.prepare('SELECT id FROM api_credentials WHERE id=?').bind(credential.credential.id).first(),null);
  assert.ok(await db.prepare('SELECT id FROM api_credentials WHERE id=?').bind(retainedCredential.credential.id).first());
  assert.equal(await db.prepare('SELECT id FROM api_credentials WHERE id=?').bind(labelCredential.credential.id).first(),null,'Erasure reaches an identity copied into an unrelated credential label');
  assert.deepEqual(await counterpart(),before,'Separate same-name customer rows must remain byte-for-byte equivalent');
  for(const [table,id]of [['contacts',removed.contact.id],['timeline_entries',removed.entry.id],['notifications',removed.notification],['ai_previews',removed.preview]])assert.equal(await db.prepare(`SELECT * FROM ${table} WHERE id=?`).bind(id).first(),null,`Target ${table} erased`);
  assert.deepEqual(await db.prepare('SELECT input_tokens,output_tokens,cached_input_tokens,estimated_cost,error FROM ai_calls WHERE id=?').bind(removed.call).first(),{input_tokens:123,output_tokens:45,cached_input_tokens:6,estimated_cost:0.0123,error:null});


 }
 {

 const actor=createId(),stage=createId(),source=createId(),now=new Date().toISOString();
  await createDependencies(db).auth.ensureOperator({id:actor,email:'boundary-operator@example.test',displayName:'Operator'});
  // An installed Orbit always has its workspace; erasure authority is a current workspace membership.
  await createDependencies(db).workspace.ensureWorkspace({name:'Erasure checks',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});
  await db.prepare('INSERT INTO pipeline_stages VALUES(?,?,0,?,?)').bind(stage,'Qualified',now,now).run();
  await db.prepare("INSERT INTO signal_sources(id,name,type,enabled,created_at,updated_at) VALUES(?,'Test source','signed_webhook',1,?,?)").bind(source,now,now).run();
  const records=new RecordsRepository(db),target=await records.save('contact',{name:'Shared name',email:'ann@example.test'},actor),other=await records.save('contact',{name:'Shared name',email:'joann@example.test'},actor);
  await db.prepare("INSERT INTO record_aliases VALUES('contact','old@example.test',?,?,?)").bind(target.id,createId(),now).run();
  const shared=await records.save('opportunity',{title:'Shared account',stage_id:stage,value_cents:0,contact_ids:[target.id,other.id],primary_contact_id:other.id},actor);
  const archive=await records.save('opportunity',{title:'Archive account',stage_id:stage,value_cents:0,contact_ids:[other.id],primary_contact_id:other.id},actor);
  const preview=createId();
  await db.prepare("INSERT INTO ai_previews(id,operator_id,opportunity_id,recommendation_id,recipient_contact_id,feature,content_json,created_at) VALUES(?,?,?,'test',?,'draft',?,?)").bind(preview,actor,shared.id,other.id,JSON.stringify({body:'Hello Shared name'}),now).run();
  const sharedBefore=await db.prepare('SELECT * FROM ai_previews WHERE id=?').bind(preview).first();
  const rows:Array<{erase:boolean,ids:Record<string,string>}>=[];
  for(const [email,erase] of [['ann@example.test',true],['AnN@EXAMPLE.test',true],['OLD@example.test',true],['joann@example.test',false],['bold@example.test',false],['ann@example.test.evil.invalid',false],['x.ann@example.test',false],['ann@example.test.',true],['joann@example.test> and <ann@example.test',true]] as const){
   const ids=Object.fromEntries(['signals','timeline_entries','notifications','ai_previews','ai_calls','audit_entries','unlinked_replies','message_library','drafts','outbound_messages'].map(table=>[table,createId()]));
   const content=`Customer <${email}> replied`;
   const review=JSON.stringify({sourceSubject:'Subject',sourceBody:'Hello {{contact.email}}',subject:'Subject',body:content,fields:[{name:'contact.email',value:email}],context:JSON.stringify({'contact.email':email}),reviewed:true});
   await db.batch([
    db.prepare("INSERT INTO signals(id,source_id,source_event_id,type,subject,occurred_at,received_at,payload_hash,confidence,linking_basis,created_at,payload_json) VALUES(?,?,?,'page.viewed','Held view',?,?,'testhash','inferred','No identity basis',?,?)").bind(ids.signals,source,ids.signals,now,now,now,JSON.stringify({email,content})),
    db.prepare("INSERT INTO timeline_entries VALUES(?,'note',?,?,'operator',?,'manual',?)").bind(ids.timeline_entries,now,now,actor,JSON.stringify({text:content})),
    db.prepare("INSERT INTO notifications(id,operator_id,event_key,kind,message,created_at) VALUES(?,?,?,'customer.reply',?,?)").bind(ids.notifications,actor,ids.notifications,content,now),
    db.prepare("INSERT INTO ai_previews(id,operator_id,opportunity_id,recommendation_id,feature,content_json,created_at) VALUES(?,?,?,'test','draft',?,?)").bind(ids.ai_previews,actor,archive.id,JSON.stringify({body:content}),now),
    db.prepare("INSERT INTO ai_calls(id,operator_id,provider,model,feature,input_tokens,output_tokens,cached_input_tokens,estimated_cost,duration_ms,status,error,created_at) VALUES(?,?,'test','test','draft',123,45,6,0.0123,1,'failed',?,?)").bind(ids.ai_calls,actor,content,now),
    db.prepare("INSERT INTO audit_entries VALUES(?,?,'test','test','test',?,?)").bind(ids.audit_entries,actor,JSON.stringify({text:content}),now),
    db.prepare("INSERT INTO unlinked_replies(id,provider_event_id,sender,subject,body,occurred_at) VALUES(?,?,?,'Reply','Body',?)").bind(ids.unlinked_replies,ids.unlinked_replies,content,now),
    db.prepare("INSERT INTO message_library(id,kind,name,subject,body,visibility,owner_id,revision,updated_at) VALUES(?,'template','Saved reply','Reply',?,'private',?,1,?)").bind(ids.message_library,content,actor,now),
    db.prepare("INSERT INTO drafts(id,opportunity_id,author_id,recipient_contact_id,recipient_email,subject,body,revision,is_stale,created_at,updated_at,library_selection_json,merge_review_json) VALUES(?,?,?,?,?,'Subject','Hello {{contact.email}}',1,0,?,?,?,?)").bind(ids.drafts,archive.id,actor,other.id,'joann@example.test',now,now,JSON.stringify({template:{id:ids.message_library,revision:1}}),review),
    db.prepare("INSERT INTO outbound_messages(id,draft_id,revision,opportunity_id,operator_id,contact_id,recipient_email,subject,body,state,created_at,updated_at,idempotency_key,message_id,approved_at,render_snapshot_json) VALUES(?,?,1,?,?,?,?,'Subject','Saved body','accepted',?,?,?,?,?,?)").bind(ids.outbound_messages,ids.drafts,archive.id,actor,other.id,'joann@example.test',now,now,ids.outbound_messages,`<${ids.outbound_messages}@orbit.test>`,now,review),
   ]);
   rows.push({erase,ids});
  }
  async function retained(){const result:Record<string,unknown>={};for(const row of rows.filter(row=>!row.erase))for(const [table,id]of Object.entries(row.ids))result[id]=await db.prepare(`SELECT * FROM ${table} WHERE id=?`).bind(id).first();return result;}
  const before=await retained();
  const session=await createDependencies(db).auth.createSession(actor),app=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})}});
  assert.equal((await app.request(`https://orbit.test/api/v1/records/contact/${target.id}`,{method:'DELETE',headers:{Cookie:'__Host-orbit_session='+session.token,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify({confirmed:true})})).status,200);
  assert.deepEqual(await retained(),before,'Longer distinct mailbox identities retain their full archives');
  assert.deepEqual(await db.prepare('SELECT * FROM ai_previews WHERE id=?').bind(preview).first(),sharedBefore,'Another recipient on a shared opportunity retains their preview');
  for(const row of rows.filter(row=>row.erase))for(const [table,id]of Object.entries(row.ids)){
   if(table==='ai_calls')assert.deepEqual(await db.prepare('SELECT input_tokens,output_tokens,cached_input_tokens,estimated_cost,error FROM ai_calls WHERE id=?').bind(id).first(),{input_tokens:123,output_tokens:45,cached_input_tokens:6,estimated_cost:0.0123,error:null});
   else if(table==='audit_entries')assert.deepEqual(await db.prepare('SELECT details_json FROM audit_entries WHERE id=?').bind(id).first(),{details_json:'{}'});
   else assert.equal(await db.prepare(`SELECT * FROM ${table} WHERE id=?`).bind(id).first(),null,`Target ${table} erased`);
  }


 }
}
