import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createHmac,randomBytes} from 'node:crypto';
import {launchFixture} from '../support/launch-fixture';
import {createApp} from '../support/app';
import {createDependencies} from '../support/dependencies';
import {createSourceSecurity} from '../../src/core/platform/source-security';

test('RECORD-004 RECORD-009 matching names across companies and keyless records remain review-only and native merges refuse missing and stale reviews',async()=>{
 const f=await launchFixture();try{
  const security=createSourceSecurity({ORBIT_ENCRYPTION_KEY:randomBytes(32).toString('hex')})!;
  const app=createApp({database:f.db,assets:{fetch:async()=>new Response(null,{status:404})},sourceSecurity:security});
  const session=await createDependencies(f.db).auth.createSession(f.actor);
  const configured=await app.request('https://orbit.test/api/v1/sources/synthetic-orbit-1',{method:'PUT',headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify({name:'Customer inquiries',enabled:true})});
  assert.equal(configured.status,200);const {secret}=await configured.json() as {secret:string};
  const signal=async(email:string,eventId:string)=>{
   const raw=JSON.stringify({eventId,type:'form.submitted',subject:'Please discuss our rollout',occurredAt:new Date().toISOString(),email}),timestamp=String(Math.floor(Date.now()/1000));
   const response=await app.request('https://orbit.test/api/v1/signals/synthetic-orbit-1',{method:'POST',headers:{'Content-Type':'application/json','X-Orbit-Timestamp':timestamp,'X-Orbit-Signature':createHmac('sha256',secret).update(`${timestamp}.${raw}`).digest('hex')},body:raw});
   assert.equal(response.status,201,await response.clone().text());const result=await response.json() as {id:string;linked:boolean};assert.equal(result.linked,true);return result.id;
  };
  const json=async(path:string)=>{const response=await f.request(path);assert.equal(response.status,200,path);return response.json() as Promise<any>;};
  for(const kind of ['company','contact'] as const){
   const companyIds:string[]=[];
   if(kind==='contact')for(const name of ['First workplace','Second workplace']){const response=await f.request('records/company','POST',{name});assert.equal(response.status,201);companyIds.push((await response.json() as {id:string}).id);}
   const create=async(index:number,keyless=false)=>{const result=await f.request(`records/${kind}`,'POST',{name:index===2?`  REVIEWED   ${kind}  `:`Reviewed ${kind}`,custom_fields:{label:`Choice ${index}`},...(!keyless?kind==='company'?{primary_domain:`${kind}-${index}.example`}:{email:`${kind}-${index}@example.test`}:{}),...kind==='contact'?{company_id:companyIds[index-1]??null}:{}});assert.equal(result.status,201);return (await result.json() as {id:string}).id;};
   const survivorId=await create(1),retiredId=await create(2),path=`records/${kind}/merge`;
   const unassignedId=kind==='contact'?await create(3):undefined;
   const keylessIds=await Promise.all([create(4,true),create(5,true)]);
   const ids=[survivorId,retiredId,...unassignedId?[unassignedId]:[],...keylessIds];
   const read=async(id:string)=>(await (await f.request(`records/${kind}/${id}`)).json()) as any;
   const history=async()=>Promise.all(['record_aliases','record_merge_claims','audit_entries','timeline_entries','timeline_entry_records'].map(async table=>(await f.db.prepare(`SELECT * FROM ${table}`).all()).results));
   const review=async()=>{
    const before=await Promise.all(ids.map(read)),beforeHistory=await history(),result=await f.request(`records/${kind}/duplicates`);
    assert.equal(result.status,200);
    const groups=(await result.json() as {groups:Record<string,any>[][]}).groups,group=groups.find(group=>group.some(row=>row.id===survivorId))!;
    assert.deepEqual(group.map(row=>row.id).sort(),[...ids].sort());
    assert.ok(group.some(row=>row.id===retiredId));
    for(const id of keylessIds){const row=group.find(row=>row.id===id)!;assert.equal(row[kind==='contact'?'email':'primary_domain'],null);assert.equal(row[kind==='contact'?'email_key':'primary_domain_key'],null);}
    if(unassignedId){assert.ok(group.some(row=>row.id===unassignedId));for(const [index,id] of [survivorId,retiredId,unassignedId].entries()){const row=group.find(row=>row.id===id)!;assert.equal(row.email,`contact-${index+1}@example.test`);assert.equal(row.companyName,['First workplace','Second workplace',null][index]);}}
    assert.deepEqual(await Promise.all(ids.map(read)),before);
    assert.deepEqual(await history(),beforeHistory);
    return {survivor:group.find(row=>row.id===survivorId)!.mergeReviewToken,retired:group.find(row=>row.id===retiredId)!.mergeReviewToken};
   };
   const choices={name:'survivor',custom_fields_json:'survivor',[kind==='company'?'primary_domain':'email']:'retired',...kind==='contact'?{company_id:'survivor'}:{}},body={survivorId,retiredId,choices,confirmed:true};
   assert.equal((await f.request(path,'POST',body)).status,400);
   for(const changedId of [survivorId,retiredId]){
    const reviewed=await review(),before=(await read(changedId)).record;
    const result=await f.request(`records/${kind}/${changedId}`,'PUT',{...before,custom_fields:{...JSON.parse(before.custom_fields_json),label:'Changed after review'}});assert.equal(result.status,200);
    const current=await Promise.all([read(survivorId),read(retiredId)]);
    const counts=async()=>Promise.all(['record_aliases','record_merge_claims','audit_entries'].map(async table=>(await f.db.prepare(`SELECT count(*) AS n FROM ${table}`).first<{n:number}>())!.n));
    const baseline=await counts();assert.equal((await f.request(path,'POST',{...body,reviewed})).status,409);
    assert.deepEqual(await Promise.all([read(survivorId),read(retiredId)]),current);assert.deepEqual(await counts(),baseline);
   }
   let retiredMail:any;
   if(kind==='contact'){
    const session=await createDependencies(f.db).auth.createSession(f.actor),app=createApp({database:f.db,assets:{fetch:async()=>new Response(null,{status:404})},outboundMail:{send:async()=>({providerMessageId:'synthetic-orbit-1'})}});
    const mail=async(path:string,method='GET',body?:unknown,status=200)=>{const response=await app.request(`https://orbit.test/api/v1/${path}`,{method,headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});assert.equal(response.status,status,await response.clone().text());return response.json() as Promise<any>;};
    const compose=async(subject:string)=>mail(`workbench/records/contact/${retiredId}/drafts`,'POST',{contactId:retiredId,opportunityId:null,subject,body:'Please keep the original consultation details.'},201);
    const sentDraft=await compose('Sent consultation'),render=await mail(`library/drafts/${sentDraft.id}/render`);
    await mail(`library/drafts/${sentDraft.id}/render`,'POST',{revision:1,reviewHash:render.reviewHash});
    const preview=await mail(`workbench/drafts/${sentDraft.id}/approval-preview`);
    const sent=await mail(`workbench/drafts/${sentDraft.id}/approve`,'POST',{revision:1,quietHoursConfirmation:preview.localTime});assert.equal(sent.state,'accepted');
    await compose('Unsent consultation');
    retiredMail=await mail(`workbench/records/contact/${retiredId}/mail`);retiredMail.drafts.sort((a:any,b:any)=>a.id.localeCompare(b.id));
   }
   const untouchedIds=ids.filter(id=>id!==survivorId&&id!==retiredId),untouched=await Promise.all(untouchedIds.map(read));
   assert.equal((await f.request(path,'POST',{...body,reviewed:await review()})).status,200);
   if(retiredMail){const history=await (await f.request(`workbench/records/contact/${survivorId}/mail`)).json() as any;history.drafts.sort((a:any,b:any)=>a.id.localeCompare(b.id));assert.deepEqual(history,{...retiredMail,drafts:retiredMail.drafts.map((draft:any)=>({...draft,isStale:1}))});}
   const result=await read(survivorId);assert.equal(result.record[kind==='company'?'primary_domain':'email'],kind==='company'?'company-2.example':'contact-2@example.test');
   assert.equal((await f.request(`records/${kind}/${retiredId}`)).status,404);
   assert.deepEqual(await Promise.all(untouchedIds.map(read)),untouched);
   assert.equal(result.timeline.filter((entry:any)=>entry.kind==='record.merged').length,1);
   const audit=await f.db.prepare("SELECT details_json FROM audit_entries WHERE action='record.merged' AND entity_id=?").bind(survivorId).all<{details_json:string}>();assert.equal(audit.results.length,1);assert.deepEqual(JSON.parse(audit.results[0].details_json),{retiredId,choices});
  }
  for(const stopped of ['survivor','retired'] as const){
   const survivor=await f.customer(`synthetic-orbit-${stopped}-survivor@example.test`),retired=await f.customer(`synthetic-orbit-${stopped}-retired@example.test`),scheduled=await Promise.all([f.message(survivor.contactId,survivor.opportunityId),f.message(retired.contactId,retired.opportunityId)]);
   const customers=[survivor,retired],signalIds=await Promise.all(customers.map((customer,index)=>signal(customer.email,`synthetic-orbit-${stopped}-${index}`)));
   const survivorId=survivor.contactId,retiredId=retired.contactId,path='records/contact/merge';
   const read=async(id:string)=>{const response=await f.request(`records/contact/${id}`);assert.equal(response.status,200);return response.json() as Promise<any>;};
   const duplicates=await f.request('records/contact/duplicates');assert.equal(duplicates.status,200);
   const rows=(await duplicates.json() as {groups:Record<string,any>[][]}).groups.flat(),pair=[survivorId,retiredId].map(id=>rows.find(row=>row.id===id)!);
   assert.deepEqual(pair.map(row=>row.contactability),['contactable','contactable']);
   const body={survivorId,retiredId,choices:{email:'survivor'},reviewed:{survivor:pair[0].mergeReviewToken,retired:pair[1].mergeReviewToken},confirmed:true};
   assert.equal((await f.request(path,'POST',body,{Cookie:''})).status,401);
   assert.equal((await f.request(path,'POST',body,{Origin:'https://other.test'})).status,403);
   const stoppedId=stopped==='survivor'?survivorId:retiredId,before=(await read(stoppedId)).record;
   assert.equal((await f.request(`records/contact/${stoppedId}`,'PUT',{name:before.name,contactability:'do_not_contact'})).status,200);
   const reviewedValues=({contactability,contactability_revision,updated_at,...fields}:Record<string,any>)=>fields;
   assert.deepEqual(reviewedValues((await read(stoppedId)).record),reviewedValues(before),'Only the inherited stop changed after review');
   const priorContacts=await Promise.all(customers.map(customer=>read(customer.contactId)));
   const priorDeals=await Promise.all(customers.map(async(customer,index)=>{
    const {opportunity}=await json(`opportunities/${customer.opportunityId}`),{messages}=await json(`workbench/opportunities/${customer.opportunityId}/messages`);
    assert.deepEqual(opportunity.signals.map((row:any)=>row.id),[signalIds[index]]);
    assert.ok(opportunity.recommendation,'Each participant has a real recommendation before merging');
    assert.deepEqual(opportunity.recommendation.evidenceSignalIds,[signalIds[index]]);
    assert.deepEqual(messages.map((row:any)=>row.id),[scheduled[index]!.id]);
    return {opportunity,messages};
   }));
   const merged=await f.request(path,'POST',body);assert.equal(merged.status,200,await merged.clone().text());
   const result=await read(survivorId);assert.equal(result.record.contactability,'do_not_contact',`${stopped} stop is inherited without a contactability choice`);
   assert.equal((await f.request(`records/contact/${retiredId}`)).status,404);
   for(const message of scheduled)assert.deepEqual(await f.db.prepare('SELECT contact_id,state FROM outbound_messages WHERE id=?').bind(message.id).first(),{contact_id:survivorId,state:'cancelled'},'Both participants’ scheduled work stays cancelled on the survivor');
   assert.deepEqual(result.opportunities.map((row:any)=>row.id).sort(),[survivor.opportunityId,retired.opportunityId].sort(),'Both deals now belong to the surviving contact');
   assert.equal(result.timeline.filter((entry:any)=>entry.kind==='record.merged').length,1);
   const byId=(rows:any[])=>[...rows].sort((a,b)=>a.id.localeCompare(b.id));
   assert.deepEqual(byId(result.timeline.filter((entry:any)=>entry.kind!=='record.merged')),byId(priorContacts.flatMap(contact=>contact.timeline)),'The survivor retains both timelines exactly once, with no merge-created signal or outreach');
   for(const [index,customer] of customers.entries()){
    const {opportunity}=await json(`opportunities/${customer.opportunityId}`),{messages}=await json(`workbench/opportunities/${customer.opportunityId}/messages`),prior=priorDeals[index]!;
    assert.deepEqual(opportunity.contacts.map((contact:any)=>contact.id),[survivorId]);
    assert.deepEqual(opportunity.signals,prior.opportunity.signals,'Merge preserves every signal and creates none');
    assert.deepEqual(opportunity.recommendation,prior.opportunity.recommendation,'Merge preserves the reviewed recommendation and creates none');
    const priorEntryIds=new Set(prior.opportunity.timeline.map((entry:any)=>entry.id));
    assert.deepEqual(opportunity.timeline.filter((entry:any)=>priorEntryIds.has(entry.id)),prior.opportunity.timeline,'Merge keeps all prior signal, recommendation and outreach activity unchanged');
    const added=opportunity.timeline.filter((entry:any)=>!priorEntryIds.has(entry.id));
    assert.deepEqual(added.map((entry:any)=>({kind:entry.kind,messageId:entry.payload.messageId,state:entry.payload.state})),customer.contactId===stoppedId?[]:[{kind:'message.schedule_stopped',messageId:scheduled[index]!.id,state:'cancelled'}],'The only merge-created activity is the inherited stop of existing scheduled outreach');
    assert.deepEqual(messages.map(({state,failure,...message}:any)=>message),prior.messages.map(({state,failure,...message}:any)=>message),'No outreach is dropped, duplicated or created');
    assert.deepEqual(messages.map((message:any)=>message.state),['cancelled'],'Both participants’ outreach is read back cancelled through the native door');
    assert.equal(messages[0].failure,customer.contactId===stoppedId?prior.messages[0].failure:added[0].payload.reason,'The visible cancellation reason belongs to the original or inherited stop');
   }
   const audits=async()=>(await f.db.prepare("SELECT details_json FROM audit_entries WHERE action='record.merged' AND entity_id=?").bind(survivorId).all<{details_json:string}>()).results;
   assert.deepEqual((await audits()).map(row=>JSON.parse(row.details_json)),[{retiredId,choices:body.choices}]);
   assert.equal((await f.request(path,'POST',body)).status,404,'Replaying the original review cannot merge twice');
   assert.deepEqual(await read(survivorId),result);assert.equal((await audits()).length,1);
   const laterId=await signal(retired.email,`synthetic-orbit-${stopped}-later`),later=await read(survivorId);
   assert.equal(later.record.email,survivor.email);
   assert.deepEqual(later.timeline.filter((entry:any)=>entry.kind==='signal.recorded').map((entry:any)=>entry.id).sort(),[...signalIds,laterId].sort(),'A later inbound signal addressed only to the retired email reaches the survivor once');
   assert.equal(later.record.contactability,'do_not_contact');
   for(const customer of customers){const {opportunity}=await json(`opportunities/${customer.opportunityId}`);assert.equal(opportunity.signals.filter((entry:any)=>entry.id===laterId).length,1,'Retired-key evidence reaches each surviving deal association once');}
   assert.equal((await f.request(`records/contact/${retiredId}`)).status,404);
  }
 }finally{await f.dispose();}
});
