import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

type RecordsRequest = (path:string,method?:string,body?:unknown)=>Promise<Response>;
type SignalRequest = (source:string,body:string,timestamp:string,signature:string)=>Promise<Response>;

/** Identity decisions are observed through Records, Settings and signed source intake. */
export async function exerciseRecordIdentity(request:RecordsRequest,signalRequest:SignalRequest,stageId:string){
 const call=async(path:string,method='GET',body?:unknown,status=200):Promise<any>=>{
  const response=await request(path,method,body),result=await response.json();
  assert.equal(response.status,status,JSON.stringify(result));return result;
 };
 const inventory=async()=>{
  const result:Record<string,unknown>={};
  for(const kind of ['company','contact','opportunity']){
   const {records}=await call(`/records/${kind}`);
   assert.ok(records.length<50,'Fresh Records reads cover the complete identity fixture');
   result[kind]=records;
   result[`${kind}Details`]=await Promise.all(records.map((row:{id:string})=>call(`/records/${kind}/${row.id}`)));
  }
  return result;
 };
 const email=['synthetic-orbit-311','identity.test'].join('@');
 const company=await call('/records/company','POST',{name:'Synthetic Orbit 311',primary_domain:'synthetic-orbit-311.test'},201);
 const original=await call('/records/contact','POST',{name:'Synthetic Orbit 311',email:`  ${email.toUpperCase()}  `,company_id:company.id},201);
 const distinct=await call('/records/contact','POST',{name:'Synthetic Orbit 312',email:['synthetic-orbit-312','identity.test'].join('@'),company_id:company.id},201);
 const saved=await call(`/records/contact/${original.id}`);
 assert.equal(saved.record.email,email);
 assert.equal(saved.record.email_key,email);
 for(const contact of [original,distinct]){
  const deal=await call('/records/opportunity','POST',{
   title:'Synthetic Orbit identity deal',stage_id:stageId,value_cents:3100,company_id:company.id,
   contact_ids:[contact.id],primary_contact_id:contact.id
  },201);
  const note=await call(`/records/contact/${contact.id}/entries`,'POST',{
   kind:'note',text:'Synthetic Orbit contact identity history',occurredAt:'2026-10-01T12:00:00.000Z'
  });
  const detail=await call(`/records/contact/${contact.id}`);
  assert.equal(detail.company.id,company.id);
  assert.ok(detail.opportunities.some((row:{id:string})=>row.id===deal.id));
  assert.ok(detail.timeline.some((row:{id:string})=>row.id===note.id));
 }
 const before=await inventory();
 const duplicate=await call('/records/contact','POST',{name:'Synthetic Orbit refused contact',email:` ${email} `},409);
 assert.equal(duplicate.recordId,original.id,'Email create collision names the normalized existing contact');
 assert.deepEqual(await inventory(),before,'Refused email creation changes no records, associations or history');
 const current=await call(`/records/contact/${distinct.id}`);
 const edited=await call(`/records/contact/${distinct.id}`,'PATCH',{
  changes:{name:'Synthetic Orbit refused contact edit',email:` ${email.toUpperCase()} `},
  base:{name:current.record.name,email:current.record.email}
 },409);
 assert.equal(edited.recordId,original.id,'Email edit collision names the normalized existing contact');
 assert.deepEqual(await inventory(),before,'Refused email edit changes neither contact nor any associations or history');

 const {workspace}=await call('/settings');
 const freeDomain='synthetic-orbit-320.test';
 await call('/settings','PUT',{
  name:workspace.name,timezone:workspace.timezone,currency:workspace.currency,
  workingHours:JSON.parse(workspace.working_hours_json),staleIntervalDays:workspace.stale_interval_days,
  awaitingResponseWorkingDays:workspace.awaiting_response_working_days,
  freeMailDomains:[...JSON.parse(workspace.free_mail_domains_json),freeDomain],ifUpdatedAt:workspace.updated_at
 });
 const freeOne=await call('/records/company','POST',{name:'Synthetic Orbit free mail',primary_domain:`WWW.${freeDomain.toUpperCase()}`},201);
 const freeTwo=await call('/records/company','POST',{name:'Synthetic Orbit free mail',primary_domain:` ${freeDomain} `},201);
 const freeEdit=await call('/records/company','POST',{name:'Synthetic Orbit free mail edit',primary_domain:'synthetic-orbit-321.test'},201);
 await call(`/records/company/${freeEdit.id}`,'PATCH',{
  changes:{primary_domain:` WWW.${freeDomain.toUpperCase()} `},base:{primary_domain:'synthetic-orbit-321.test'}
 });
 assert.equal(new Set([freeOne.id,freeTwo.id,freeEdit.id]).size,3,'Free-mail domains do not merge companies');
 for(const row of [freeOne,freeTwo,freeEdit]){
  const {record}=await call(`/records/company/${row.id}`);
  assert.equal(record.primary_domain,freeDomain);
  assert.equal(record.primary_domain_key,null,'A configured free-mail domain is never a company key');
 }
 const keyless:{kind:string;id:string;name:string}[]=[];
 for(const kind of ['contact','company']){
  const name=`Synthetic Orbit keyless ${kind}`;
  const one=await call(`/records/${kind}`,'POST',{name},201);
  const two=await call(`/records/${kind}`,'POST',{name},201);
  assert.notEqual(one.id,two.id,'Matching names never merge keyless records');
  for(const row of [one,two]){
   const nextName=`${name} edited`;
   await call(`/records/${kind}/${row.id}`,'PATCH',{changes:{name:nextName},base:{name}});
   const {record}=await call(`/records/${kind}/${row.id}`);
   assert.equal(record.name,nextName,'An ordinary keyless edit survives a fresh read');
   assert.equal(record[kind==='contact'?'email_key':'primary_domain_key'],null);
   keyless.push({kind,id:row.id,name:nextName});
  }
 }

 const source='synthetic-orbit-identity';
 const {secret}=await call(`/sources/${source}`,'PUT',{name:'Synthetic Orbit identity',enabled:true});
 const deliver=async(event:Record<string,unknown>,status=201)=>{
  const body=JSON.stringify({type:'meeting.booked',occurredAt:'2026-10-01T12:00:00.000Z',...event});
  const timestamp=String(Math.floor(Date.now()/1000));
  const signature=createHmac('sha256',secret).update(`${timestamp}.${body}`).digest('hex');
  const response=await signalRequest(source,body,timestamp,signature),result=await response.json() as {id:string;linked?:boolean;replayed?:boolean};
  assert.equal(response.status,status,JSON.stringify(result));return result;
 };
 // Positive exact-key controls prove intake is live before testing absent and excluded keys.
 for(const target of [
  {kind:'contact',id:original.id,identity:{email:email.toUpperCase()}},
  {kind:'company',id:company.id,identity:{domain:'WWW.SYNTHETIC-ORBIT-311.TEST'}}
 ]){
  const signal=await deliver({eventId:`synthetic-orbit-${target.kind}`,subject:'Synthetic Orbit exact key',...target.identity});
  assert.equal(signal.linked,true);
  const detail=await call(`/records/${target.kind}/${target.id}`);
  assert.equal(detail.timeline.filter((row:{id:string})=>row.id===signal.id).length,1,'Exact normalized identity links once');
 }
 const noLinksBefore=await inventory(),unlinkedIds:string[]=[];
 const events=[
  {eventId:'synthetic-orbit-free-mail',subject:'Synthetic Orbit free mail',domain:`WWW.${freeDomain.toUpperCase()}`,data:{name:'Synthetic Orbit free mail'}},
  ...keyless.map((row,index)=>({eventId:`synthetic-orbit-keyless-${index}`,subject:row.name,data:{name:row.name}})),
  {eventId:'synthetic-orbit-similar-name',subject:'Synthetic Orbit 311',data:{name:'Synthetic Orbit 311',score:100}}
 ];
 for(const event of events){
  const signal=await deliver(event);
  assert.equal(signal.linked,false,'An excluded or absent key never guesses an identity from names or scores');
  unlinkedIds.push(signal.id);
  const replay=await deliver(event);
  assert.equal(replay.id,signal.id);
  assert.equal(replay.replayed,true);
 }
 const {signals}=await call('/sources/unlinked');
 for(const id of unlinkedIds)assert.equal(signals.filter((row:{id:string})=>row.id===id).length,1,'Unmatched signals remain visible once for explicit review');
 assert.deepEqual(await inventory(),noLinksBefore,'Unmatched delivery and replay change no records, associations, scores or timeline entries');
 await call(`/sources/${source}`,'PATCH',{enabled:false});
 for(const eventId of ['synthetic-orbit-contact','synthetic-orbit-revoked']){
  await deliver({eventId,subject:'Synthetic Orbit exact key',email:email.toUpperCase()},403);
 }
 assert.deepEqual((await call('/sources/unlinked')).signals,signals,'Revoked source delivery and replay add no held evidence');
 assert.deepEqual(await inventory(),noLinksBefore,'A revoked source cannot change customer records or their history');
 // Removing the domains explicitly keeps later workspace journeys independent of this setting.
 for(const row of [freeOne,freeTwo,freeEdit]){
  await call(`/records/company/${row.id}`,'PATCH',{changes:{primary_domain:null},base:{primary_domain:freeDomain}});
  const {record}=await call(`/records/company/${row.id}`);
  assert.equal(record.primary_domain,null);
  assert.equal(record.primary_domain_key,null);
 }
 const latest=await call('/settings');
 await call('/settings','PUT',{
  name:workspace.name,timezone:workspace.timezone,currency:workspace.currency,
  workingHours:JSON.parse(workspace.working_hours_json),staleIntervalDays:workspace.stale_interval_days,
  awaitingResponseWorkingDays:workspace.awaiting_response_working_days,
  freeMailDomains:JSON.parse(workspace.free_mail_domains_json),ifUpdatedAt:latest.workspace.updated_at
 });
}
