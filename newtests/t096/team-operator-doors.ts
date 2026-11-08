import assert from 'node:assert/strict';
import {teamOperatorFixture,teamRecords,accessPath,sharedPath,nativePath,type TeamFixture,type TeamRecord} from './team-operator-fixture';

/** Two signed-in full operators use the same real records; an accepted Guest has one exact field share. */
export async function equalOperatorDoors(){
 const t=await teamOperatorFixture();
 try{
  const {f,peer,guest,call}=t,records=await teamRecords(t),contact=records.find(record=>record.kind==='contact')!;
  await call(guest.cookie,'/api/v2/access/invitations/accept','POST',{token:t.invitation.token});
  const grant=await call(peer.cookie,`${accessPath}/grants`,'POST',{subjectKind:'operator',subjectId:guest.operator.operatorId,resourceType:'contact',resourceId:contact.id,actions:['graph.read','graph.search','graph.update'],fields:['name'],purpose:'Review the customer name',expiresAt:null});
  for(const cookie of [f.cookie,peer.cookie]){
   assert.equal((await call(cookie,'/api/v2/access/class')).access_class,'native_full');
   await call(cookie,`${accessPath}/administration`);
   for(const record of records){
    const list=await call(cookie,`${nativePath}/${record.kind}`);assert.ok(list.records.some((item:any)=>item.id===record.id));
    const shared=await call(cookie,`${sharedPath}?kind=${record.kind}`);assert.ok(shared.items.some((item:any)=>item.ref.id===record.id));
    const native=await call(cookie,`${nativePath}/${record.kind}/${record.id}`),graph=await call(cookie,`${sharedPath}/${record.kind}/${record.id}`);
    assert.equal(String(native.record[record.secretField]),record.secret);assert.equal(String(graph.fields[record.secretField]),record.secret);
    const field=record.kind==='opportunity'?'title':'name',name=`${record.name} reviewed by ${cookie===f.cookie?'Alex':'Jordan'}`;
    await call(cookie,`${nativePath}/${record.kind}/${record.id}`,'PATCH',{changes:{[field]:name},base:{[field]:native.record[field]}});
    assert.equal((await call(cookie,`${nativePath}/${record.kind}/${record.id}`)).record[field],name);
    await call(cookie,`${sharedPath}/${record.kind}/${record.id}`,'PUT',{[field]:record.name});
    assert.equal((await call(cookie,`${sharedPath}/${record.kind}/${record.id}`)).fields[field],record.name);
   }
  }
  await entriesAcrossAuthors(t,records);
  const deal=records.find(record=>record.kind==='opportunity')!;
  for(const cookie of [f.cookie,peer.cookie])for(const state of ['won','lost','open']){
   await call(cookie,`${nativePath}/opportunity/${deal.id}/lifecycle`,'POST',{state,reason:'Reviewed together'});
   assert.equal((await call(cookie,`${nativePath}/opportunity/${deal.id}`)).record.lifecycle,state);
  }
  const visible=await call(guest.cookie,`${sharedPath}/contact/${contact.id}`);assert.deepEqual(visible.fields,{name:contact.name});
  await call(guest.cookie,`${sharedPath}/contact/${contact.id}`,'PUT',{name:'Morgan shared review'});
  assert.equal((await call(peer.cookie,`${nativePath}/contact/${contact.id}`)).record.name,'Morgan shared review');
  await call(guest.cookie,`${sharedPath}/contact/${contact.id}`,'PUT',{email:'changed.invalid'},403);
  for(const record of records){
   const before=await call(f.cookie,`${nativePath}/${record.kind}/${record.id}`);
   if(record.kind!=='contact'){
    await call(guest.cookie,`${sharedPath}/${record.kind}/${record.id}`,'GET',undefined,403);
    assert.deepEqual((await call(guest.cookie,`${sharedPath}?kind=${record.kind}`)).items,[]);
    await call(guest.cookie,`${sharedPath}/${record.kind}/${record.id}`,'PUT',{name:'Forbidden'},403);
   }
   for(const [method,suffix,body] of [
    ['GET','',undefined],['PUT','',{name:'Forbidden'}],['PATCH','',{changes:{name:'Forbidden'},base:{}}],
    ['DELETE','',{confirmed:true}],['POST','/entries',{kind:'note',text:'Forbidden note',occurredAt:'2026-01-10T12:00:00.000Z'}],
   ] as const)await call(guest.cookie,`${nativePath}/${record.kind}/${record.id}${suffix}`,method,body,403);
   assert.deepEqual(await call(f.cookie,`${nativePath}/${record.kind}/${record.id}`),before,'Refused changes preserve the record and its timeline.');
  }
  await call(guest.cookie,`${accessPath}/grants`,'POST',{subjectKind:'operator',subjectId:guest.operator.operatorId,resourceType:'company',resourceId:'*',actions:['graph.read'],fields:['*'],purpose:'Self escalation',expiresAt:null},403);
  await call(f.cookie,`${accessPath}/grants/${grant.id}`,'DELETE');
  await call(guest.cookie,`${sharedPath}/contact/${contact.id}`,'GET',undefined,403);
  await call(guest.cookie,`${sharedPath}/contact/${contact.id}`,'PUT',{name:'Replayed old share'},403);
  assert.equal((await call(peer.cookie,`${nativePath}/contact/${contact.id}`)).record.name,'Morgan shared review');
  for(const cookie of [peer.cookie,f.cookie]){
   for(const record of records){
    const saved=await call(cookie,`${nativePath}/${record.kind}`,'POST',record.kind==='opportunity'?{title:'Temporary reviewed deal',stage_id:f.stage,value_cents:0}:{name:'Temporary reviewed record'},201);
    await call(cookie,`${nativePath}/${record.kind}/${saved.id}`,'DELETE',{confirmed:true});
    await call(cookie,`${nativePath}/${record.kind}/${saved.id}`,'GET',undefined,404);
   }
  }
  console.log('PROBE TEAM-001 core: two signed-in operators read restricted records and private fields, edit, close, reopen and delete; exact-share Guest edits name, forbidden reads and writes return 403 without changes; revoked share refuses replay.');
 }finally{await t.close();}
}
async function entriesAcrossAuthors(t:TeamFixture,records:TeamRecord[]){
 const {f,peer,call}=t;
 for(const record of records)for(const kind of ['note','call','meeting']){
  const input={kind,text:`Alex recorded ${kind}`,occurredAt:'2026-01-10T12:00:00.000Z',durationMinutes:20,contactIds:[]};
  const entry=await call(f.cookie,`${nativePath}/${record.kind}/${record.id}/entries`,'POST',input);
  await call(peer.cookie,`${nativePath}/${record.kind}/${record.id}/entries/${entry.id}`,'PUT',{...input,text:`Jordan reviewed ${kind}`});
  const read=await call(f.cookie,`${nativePath}/${record.kind}/${record.id}`);assert.ok(read.timeline.some((item:any)=>item.id===entry.id&&item.payload_json.includes(`Jordan reviewed ${kind}`)));
  await call(peer.cookie,`${nativePath}/${record.kind}/${record.id}/entries/${entry.id}`,'DELETE');
  assert.equal((await call(f.cookie,`${nativePath}/${record.kind}/${record.id}`)).timeline.some((item:any)=>item.id===entry.id),false);
 }
}
