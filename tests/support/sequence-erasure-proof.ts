import assert from 'node:assert/strict';
import {fixture,signIn} from '../../newtests/t096/fixture';
import {archiveHttp,httpArchive,httpRestore} from '../../newtests/t096/archive-http-proof';
import {createApp} from './app';
import {isolatedDatabase} from './isolated-database';
import {localArchiveRoundTrip} from './capture-privacy-archive';
import type {SequenceView,SequenceStep} from '../../src/core/features/sequences/ui/api';

export type SequenceRequest=(path:string,method?:string,body?:unknown,cookie?:string)=>Promise<Response>;
export const sequenceOperatorMailbox=['synthetic-orbit-mark','people.test'].join('@');

/** Reusable through both the native router and the emitted HTTPS Worker. */
export async function sequenceErasureJourney(request:SequenceRequest,mark:{id:string;cookie:string}){
 const api=async(path:string,method='GET',body?:unknown,cookie?:string)=>{const response=await request(path,method,body,cookie);assert.ok(response.ok,`${method} ${path}: ${response.status} ${response.ok?'':await response.clone().text()}`);return await response.json() as any;};
 const steps=(text:string):SequenceStep[]=>[
  {kind:'email',condition:'always',delayBusinessDays:0,subject:text,body:text},
  {kind:'wait',condition:'no_reply',delayBusinessDays:1},
  {kind:'call',condition:'no_reply',delayBusinessDays:1,title:'mark',instructions:text},
  {kind:'meeting',condition:'task_completed',delayBusinessDays:1,title:text,instructions:text},
  {kind:'linkedin',condition:'no_meeting',delayBusinessDays:1,title:text,instructions:text}];
 const text=`Marketing plan by Mark at ${sequenceOperatorMailbox.toUpperCase()}.`;
 const created=await api('sequences','POST',{name:text,steps:steps(text)},mark.cookie);
 const shared=await api(`sequences/${created.id}/share`,'POST',{version:1,visibility:'workspace'},mark.cookie) as SequenceView;
 const copy=await api(`sequences/${created.id}/copy`,'POST',{version:2,name:'Private inherited plan'}) as SequenceView;
 const original=await api(`sequences/${created.id}`,'PUT',{version:2,name:'Marketing rollout by Mark',steps:steps('Mark')},mark.cookie) as SequenceView;
 // Whole-word display names are attributed; mailboxes identify their owner globally.
 const boundary=`Marketing by Mark; ${'extra-'+sequenceOperatorMailbox}; ${sequenceOperatorMailbox+'.extra'}; ${sequenceOperatorMailbox.toUpperCase()}.`;
 const unrelated=await api('sequences','POST',{name:'Unrelated marketing work',steps:steps(boundary)}) as SequenceView;
 const contactMailbox=['synthetic-orbit-dana','buyer.test'].join('@');
 const contact=await api('records/contact','POST',{name:'Dana Buyer',email:contactMailbox});
 const contactSequence=await api('sequences','POST',{name:`Confirm with ${contactMailbox}`,steps:steps(`Confirm with ${contactMailbox.toUpperCase()} before booking.`)}) as SequenceView;
 await api(`sequences/${contactSequence.id}/share`,'POST',{version:1,visibility:'workspace'});
 const cleanSteps=steps('Preserve the rollout milestones.');
 const contactCurrent=await api(`sequences/${contactSequence.id}`,'PUT',{version:2,name:'Current rollout plan',steps:cleanSteps}) as SequenceView;
 const paused=await api('records/archive/exports','POST',{});
 const removed=await api(`settings/operators/${mark.id}`,'DELETE',{confirmed:true});assert.ok(removed);
 assert.deepEqual(await api(`settings/operators/${mark.id}/erase`,'POST',{confirmed:true}),{erased:true});
 assert.equal((await request(`sequences/${created.id}`,'GET',undefined,mark.cookie)).status,401,'Removed operator credentials stay revoked');
 assert.equal((await request(`records/archive/exports/${paused.id}`)).status,404,'Erasure invalidates pre-erasure transfer copies');
 const operatorRead=await api(`sequences/${created.id}`) as SequenceView,copyRead=await api(`sequences/${copy.id}`) as SequenceView;
 for(const [before,after]of [[original,operatorRead],[copy,copyRead]]){
  assert.equal(after.version,before.version);assert.equal(after.history.length,before.history.length);
  assert.equal(JSON.stringify(after).toLowerCase().includes(sequenceOperatorMailbox),false);
  assert.doesNotMatch(JSON.stringify(after),/\bmark\b/i,'Every attributed free-text leaf, including lowercase single-word titles, is redacted');
  assert.match(JSON.stringify(after),/Marketing/,'Word fragments survive');
  assert.deepEqual(after.source,before.source);assert.equal(after.ownerId,before.ownerId);
  assert.deepEqual(after.history.map(v=>[v.version,v.createdBy,v.createdAt,v.calendar]),before.history.map(v=>[v.version,v.createdBy,v.createdAt,v.calendar]));
 }
 assert.ok(operatorRead.history.every(v=>v.authorName==='Erased operator'));
 assert.equal(copyRead.history[0].authorName,copy.history[0].authorName,'A surviving copy keeps its own author');
 const unrelatedRead=await api(`sequences/${unrelated.id}`) as SequenceView;
 const retained=JSON.stringify(unrelatedRead);assert.match(retained,/Marketing by Mark/);assert.ok(retained.includes('extra-'+sequenceOperatorMailbox));assert.ok(retained.includes(sequenceOperatorMailbox+'.extra'));assert.ok(retained.includes('Erased operator.'));
 assert.deepEqual(await api(`records/contact/${contact.id}`,'DELETE',{confirmed:true}),{deleted:true});
 const contactRead=await api(`sequences/${contactSequence.id}`) as SequenceView;
 assert.equal(JSON.stringify(contactRead).toLowerCase().includes(contactMailbox),false,'Contact addresses disappear from all historical names and step content');
 assert.equal(contactRead.version,3);assert.equal(contactRead.history.length,3);assert.deepEqual(contactRead.steps,contactCurrent.steps);assert.equal(contactRead.name,contactCurrent.name);
 assert.deepEqual(contactRead.history.map(v=>[v.version,v.createdBy,v.createdAt,v.calendar]),contactCurrent.history.map(v=>[v.version,v.createdBy,v.createdAt,v.calendar]));
 assert.equal((await request(`sequences/${contactRead.id}`,'PUT',{version:2,name:'Stale replacement',steps:cleanSteps})).status,409);
 const edited=await api(`sequences/${contactRead.id}`,'PUT',{version:3,name:'Reviewed rollout plan',steps:cleanSteps}) as SequenceView;
 assert.equal(edited.version,4);assert.deepEqual(edited.history.slice(1),contactRead.history,'Normal editing still appends an immutable version');
 assert.deepEqual((await api(`sequences/${copyRead.id}/share`,'POST',{version:1,visibility:'workspace'})).history.slice(1),copyRead.history);
 const listed=await api('sequences');
 for(const sequence of [operatorRead,edited])assert.deepEqual(listed.sequences.find((item:SequenceView)=>item.id===sequence.id),sequence,'Ordinary lists and details expose the same redacted history');
 console.log(JSON.stringify({proof:'sequence-erasure',at:new Date().toISOString(),operatorVersions:operatorRead.history.length,contactVersions:edited.history.length,privateCopyRedacted:true,metadataPreserved:true,staleEditRefused:true}));
 return{operator:operatorRead,contact:edited,copy:await api(`sequences/${copyRead.id}`) as SequenceView,shared,contactMailbox};
}

export async function proveSequenceErasure(){
 const f=await fixture();try{
  const app=createApp({database:f.db,assets:{fetch:async()=>new Response('')}});
  const request:SequenceRequest=(path,method='GET',body,cookie=f.cookie)=>app.request('https://orbit.test/api/v1/'+path,{method,headers:{Cookie:cookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const invited=await(await request('settings/operators','POST',{email:sequenceOperatorMailbox,displayName:'Mark'})).json() as {id:string};
  const mark=await signIn(f.db,sequenceOperatorMailbox);
  const result=await sequenceErasureJourney(request,{id:invited.id,cookie:mark.cookie});
  await assert.rejects(f.db.prepare("UPDATE sequence_versions SET name='Rewrite history'").run(),/immutable/);
  const archive=await httpArchive(archiveHttp(app,()=>f.cookie));
  const exported=archive.parts.flatMap(part=>part.records).filter(record=>record.table==='sequence_versions');
  assert.ok(exported.length>=10);assert.equal(JSON.stringify(exported).toLowerCase().includes(result.contactMailbox),false);
  // Boundary matches intentionally remain in the unrelated sequence; the erased author's rows do not.
  for(const version of exported.filter(record=>record.row.sequence_id===result.operator.id||record.row.sequence_id===result.copy.id))assert.equal(JSON.stringify(version).toLowerCase().includes(sequenceOperatorMailbox),false);
  const target=await fixture();try{
   let cookie=target.cookie;const restored=createApp({database:target.db,assets:{fetch:async()=>new Response('')}});
   await httpRestore(archiveHttp(restored,()=>cookie),archive);cookie=(await signIn(target.db,f.operator.email)).cookie;
   for(const expected of [result.operator,result.contact,result.copy]){const response=await restored.request(`https://orbit.test/api/v1/sequences/${expected.id}`,{headers:{Cookie:cookie}});assert.equal(response.status,200);assert.deepEqual(await response.json(),expected);}
   await assert.rejects(target.db.prepare("UPDATE sequence_versions SET name='Rewrite restored history'").run(),/immutable/);
  }finally{await target.close();}
  const local=await isolatedDatabase();try{await localArchiveRoundTrip(f.db,local.db);assert.deepEqual((await local.db.prepare('SELECT * FROM sequence_versions ORDER BY 1,2').all()).results,(await f.db.prepare('SELECT * FROM sequence_versions ORDER BY 1,2').all()).results);}finally{await local.dispose();}
 }finally{await f.close();}
}
