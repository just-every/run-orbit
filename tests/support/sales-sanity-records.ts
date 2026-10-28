import {exerciseRecordOwnership} from './record-ownership';
import {exerciseOpportunityCreation} from './opportunity-creation';
import {salesPipelinesJourney} from './sales-pipelines';
import {exerciseBuyingContext} from './buying-context';
import assert from 'node:assert/strict';
import type {launchFixture} from './launch-fixture';
import {createApp} from './app';
import {createDependencies} from './dependencies';
import {RecordsRepository} from '../../src/core/features/records/repository';
import {createId} from '../../src/core/shared/ids';


export async function manageSalesRecords(f:Awaited<ReturnType<typeof launchFixture>>){
 const db=f.db,actor=f.actor,other=createId(),stage=f.stage,otherStage=createId(),now=new Date().toISOString();
 {
  const deps=createDependencies(db);await deps.workspace.ensureWorkspace({name:'Search workspace',timezone:'America/New_York',currency:'USD',workingHours:{days:[1,2,3,4,5],start:'09:00',end:'17:00'},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});
  for(const id of [other])await deps.auth.ensureOperator({id,email:`${id}@search.test`,displayName:'Search operator'});
  await db.batch([db.prepare('INSERT INTO pipeline_stages VALUES(?,?,1,?,?)').bind(otherStage,'Later',now,now)]);
  const records=new RecordsRepository(db);
  const contact=await records.save('contact',{name:'Specificcontact',email:'specific@search.test'},actor),company=await records.save('company',{name:'Specificcompany'},actor),opportunity=await records.save('opportunity',{title:'Specificopportunity',stage_id:stage,owner_id:actor,value_cents:0},actor);
  const app=createApp({database:db,assets:{fetch:async()=>new Response('asset')}}),session=await deps.auth.createSession(actor);
  async function search(kind:string,query:string){const response=await app.request(`https://orbit.test/api/v1/records/${kind}?${query}`,{headers:{cookie:`__Host-orbit_session=${session.token}`}});assert.equal(response.status,200);return (await response.json() as {records:{id:string}[]}).records.map(row=>row.id);}
  for(const [kind,row]of [['contact',contact],['company',company],['opportunity',opportunity]] as const){
   assert.deepEqual(await search(kind,`q=Specific${kind}`),[row.id]);
   assert.equal((await f.request(`records/${kind}/${row.id}/entries`,'POST',{kind:'note',text:'Distinctive timeline phrase',occurredAt:now})).status,200);
   assert.deepEqual(await search(kind,'q=Distinctive%20timeline'),[row.id]);
   assert.deepEqual(await search(kind,'q=nomatchneedle'),[]);
  }
  // Distinct alternatives make each filter observable, including intersections.
  const variants=[{lifecycle:'won',stage_id:stage,owner_id:actor,band:'high',queue_state:'now'},{lifecycle:'open',stage_id:otherStage,owner_id:actor,band:'high',queue_state:'now'},{lifecycle:'open',stage_id:stage,owner_id:other,band:'high',queue_state:'now'},{lifecycle:'open',stage_id:stage,owner_id:actor,band:'low',queue_state:'now'},{lifecycle:'open',stage_id:stage,owner_id:actor,band:'high',queue_state:'next'}];
  await db.prepare("INSERT INTO runtime_controls VALUES('restore','search fixture')").run();
  const expected={lifecycle:'open',stage_id:stage,owner_id:actor,band:'high',queue_state:'now'};
  const rows=[{id:opportunity.id,...expected}];
  for(const values of variants){const row=await records.save('opportunity',{title:'Alternative',stage_id:values.stage_id,owner_id:values.owner_id,value_cents:0},actor);rows.push({id:row.id,...values});}
  for(const row of rows)await db.prepare('UPDATE opportunities SET lifecycle=?,stage_id=?,owner_id=?,band=?,queue_state=? WHERE id=?').bind(row.lifecycle,row.stage_id,row.owner_id,row.band,row.queue_state,row.id).run();
  await db.prepare("DELETE FROM runtime_controls WHERE name='restore'").run();
  for(const [field,value]of Object.entries(expected))assert.deepEqual((await search('opportunity',new URLSearchParams({[field]:value}).toString())).sort(),rows.filter(row=>row[field as keyof typeof row]===value).map(row=>row.id).sort(),field);
  assert.deepEqual(await search('opportunity',new URLSearchParams(expected).toString()),[opportunity.id]);
  for(let i=0;i<55;i++)await records.save('contact',{name:`Pagebound ${i}`,email:`page-${i}@search.test`},actor);
  const firstPage=await search('contact','q=Pagebound');assert.ok(firstPage.length>0&&firstPage.length<55);assert.equal(new Set(firstPage).size,firstPage.length);
  await salesPipelinesJourney((path,method='GET',body)=>app.request('https://orbit.test/api/v1/'+path,{method,headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})}),actor);
 await exerciseBuyingContext((path,method='GET',body)=>app.request('https://orbit.test/api/v1/'+path,{method,headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})}),actor);
 const receiverSession=await deps.auth.createSession(other);
 await exerciseRecordOwnership((path,method='GET',body)=>app.request('https://orbit.test/api/v1/'+path,{method,headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})}),actor,other,path=>app.request('https://orbit.test/api/v1/'+path,{headers:{Cookie:`__Host-orbit_session=${receiverSession.token}`}}));
 await exerciseOpportunityCreation((path,method='GET',body)=>app.request('https://orbit.test/api/v1/'+path,{method,headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})}),db,actor,other,stage);
 }
}
export async function mergeSalesRecords(f:Awaited<ReturnType<typeof launchFixture>>){

  for(const kind of ['company','contact'] as const){
   const companyIds:string[]=[];
   if(kind==='contact')for(const name of ['First workplace','Second workplace']){const response=await f.request('records/company','POST',{name});assert.equal(response.status,201);companyIds.push((await response.json() as {id:string}).id);}
   const create=async(index:number)=>{const result=await f.request(`records/${kind}`,'POST',{name:index===2?`  REVIEWED   ${kind}  `:`Reviewed ${kind}`,custom_fields:{label:`Choice ${index}`},...(kind==='company'?{primary_domain:`${kind}-${index}.example`}:{email:`${kind}-${index}@example.test`,company_id:companyIds[index-1]??null})});assert.equal(result.status,201);return (await result.json() as {id:string}).id;};
   const survivorId=await create(1),retiredId=await create(2),path=`records/${kind}/merge`;
   const unassignedId=kind==='contact'?await create(3):undefined;
   const read=async(id:string)=>(await (await f.request(`records/${kind}/${id}`)).json()) as any;
   const review=async()=>{const before=await Promise.all([read(survivorId),read(retiredId)]),result=await f.request(`records/${kind}/duplicates`);assert.equal(result.status,200);const groups=(await result.json() as {groups:Record<string,any>[][]}).groups,group=groups.find(group=>group.some(row=>row.id===survivorId))!;assert.ok(group.some(row=>row.id===retiredId));if(unassignedId){assert.ok(group.some(row=>row.id===unassignedId));for(const [index,id] of [survivorId,retiredId,unassignedId].entries()){const row=group.find(row=>row.id===id)!;assert.equal(row.email,`contact-${index+1}@example.test`);assert.equal(row.companyName,['First workplace','Second workplace',null][index]);}}assert.deepEqual(await Promise.all([read(survivorId),read(retiredId)]),before);return {survivor:group.find(row=>row.id===survivorId)!.mergeReviewToken,retired:group.find(row=>row.id===retiredId)!.mergeReviewToken};};
   const choices={name:'survivor',custom_fields_json:'survivor',[kind==='company'?'primary_domain':'email']:'retired',...kind==='contact'?{company_id:'survivor'}:{}},body={survivorId,retiredId,choices,confirmed:true};
   assert.equal((await f.request(path,'POST',body)).status,400);
   for(const changedId of [survivorId,retiredId]){
    const reviewed=await review(),before=(await read(changedId)).record;
    const result=await f.request(`records/${kind}/${changedId}`,'PUT',{...before,custom_fields:{...JSON.parse(before.custom_fields_json),label:'Changed after review'}});assert.equal(result.status,200);
    const current=await Promise.all([read(survivorId),read(retiredId)]);
    assert.equal((await f.request(path,'POST',{...body,reviewed})).status,409);
    assert.deepEqual(await Promise.all([read(survivorId),read(retiredId)]),current);
   }
   assert.equal((await f.request(path,'POST',{...body,reviewed:await review()})).status,200);
   const result=await read(survivorId);assert.equal(result.record[kind==='company'?'primary_domain':'email'],kind==='company'?'company-2.example':'contact-2@example.test');
   assert.equal((await f.request(`records/${kind}/${retiredId}`)).status,404);
   assert.equal(result.timeline.filter((entry:any)=>entry.kind==='record.merged').length,1);
   const audit=await f.db.prepare("SELECT details_json FROM audit_entries WHERE action='record.merged' AND entity_id=?").bind(survivorId).all<{details_json:string}>();assert.equal(audit.results.length,1);assert.deepEqual(JSON.parse(audit.results[0].details_json),{retiredId,choices});
  }

}
export async function eraseCustomerHistory(f:Awaited<ReturnType<typeof launchFixture>>){
 const {actor,stage,db,records}=f,email=`${createId()}@history.test`;
 const contact=await records.save('contact',{name:'Mail history contact',email},actor);
 const opp=await records.save('opportunity',{title:'Mail history',stage_id:stage,value_cents:0,contact_ids:[contact.id],primary_contact_id:contact.id},actor);
 const survivor=await records.save('opportunity',{title:'Signal erasure opportunity',stage_id:stage,value_cents:0,contact_ids:[contact.id],primary_contact_id:contact.id},actor);
 const message=createId(),now=new Date().toISOString();
 await db.prepare("INSERT INTO outbound_messages(id,revision,opportunity_id,operator_id,contact_id,recipient_email,subject,body,state,created_at,updated_at,idempotency_key,message_id,approved_at) VALUES(?,1,?,?,?,?,?,?,'accepted',?,?,?,?,?)").bind(message,opp.id,actor,contact.id,email,'Retained subject','Retained customer body',now,now,message,`<${message}@orbit.test>`,now).run();
 const {WorkbenchRepository}=await import('../../src/core/features/workbench/repository');
 const signal=await new WorkbenchRepository(db).recordEvent(survivor.id,{type:'meeting.booked',subject:'Personal signal subject',occurredAt:now,eventId:createId(),contactId:contact.id},actor);
 assert.equal((await f.request(`records/opportunity/${opp.id}`,'DELETE',{confirmed:true})).status,200);
 const timeline=(await (await f.request(`records/contact/${contact.id}`)).json() as any).timeline;
 assert.ok(timeline.some((t:any)=>t.payload_json.includes('Retained customer body')));
 assert.equal((await f.request(`records/contact/${contact.id}`,'DELETE',{confirmed:true})).status,200);
 assert.equal((await f.request(`records/contact/${contact.id}`)).status,404);
 for(const kind of ['contact','company','opportunity']){const response=await f.request(`records/${kind}?q=${encodeURIComponent(email)}`);assert.equal(response.status,200);assert.deepEqual((await response.json() as any).records,[]);}
 assert.equal(await db.prepare('SELECT id FROM signals WHERE id=?').bind(signal.id).first(),null);
 const detail=await (await f.request(`records/opportunity/${survivor.id}`)).json() as any;
 assert.equal(detail.record.score,0);
 assert.ok(!JSON.stringify(detail).includes('Personal signal subject'));
 return [email,'Retained customer body','Personal signal subject'];
}
