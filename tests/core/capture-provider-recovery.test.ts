import assert from 'node:assert/strict';
import {test} from 'node:test';
import {captureRecoveryFixture} from '../support/capture-recovery-fixture';

const window={start:'2026-01-01T00:00:00.000Z',end:'2027-01-01T00:00:00.000Z'};
const graph='https://graph.microsoft.com';
const event=(id:string)=>({id,iCalUId:`${id}@acme.example`,subject:'Scoped meeting',createdDateTime:'2026-10-01T10:00:00Z',lastModifiedDateTime:'2026-10-01T10:00:00Z',isAllDay:true,start:{dateTime:'2026-10-20T00:00:00',timeZone:'UTC'},end:{dateTime:'2026-10-21T00:00:00',timeZone:'UTC'},organizer:{emailAddress:{address:'ana@acme.example'}},attendees:[{emailAddress:{address:'seller@orbit.test'}}]});

test('CAPTURE-006 selected Graph calendar spellings resume exactly and an expired delta resets only that resource',async()=>{
 const f=await captureRecoveryFixture('microsoft');try{
  f.network.state.total=1;
  const calendar='calendar+=/selected',path=`/v1.0/me/calendars/${encodeURIComponent(calendar)}/calendarView`,encodedPath=path.replace('calendar%2B','%63alendar%2b').replace('%2F','%2f');
  let failure:'expired'|'bad-request'|'outage'|'initial-expired'|undefined,rebuilt=false;
  f.respond(url=>{
   if(url.pathname===`/v1.0/me/calendars/${encodeURIComponent(calendar)}`)return Response.json({id:calendar});
   if(!url.pathname.includes('/calendarView/'))return;
   assert.equal(decodeURIComponent(url.pathname.split('/')[4]!),calendar);
   if(failure==='outage')return Response.json({error:{code:'ServiceUnavailable'}},{status:503});
   if(failure==='bad-request')return Response.json({error:{code:'InvalidRequest'}},{status:400});
   if(failure==='initial-expired'||failure==='expired'&&url.searchParams.has('$deltatoken')){if(failure==='expired'){failure=undefined;rebuilt=true;}return Response.json({error:{code:'syncStateNotFound'}},{status:400});}
   if(url.searchParams.has('$deltatoken'))return Response.json({value:[],'@odata.deltaLink':url.href});
   const page=url.searchParams.get('$skiptoken');
   if(!page){assert.equal(url.searchParams.get('startDateTime'),window.start);assert.equal(url.searchParams.get('endDateTime'),window.end);return Response.json({value:[event('original'),...(rebuilt?[event('new')]:[])],'@odata.nextLink':`${graph}${encodedPath}/delta()?%24skiptoken=second`});}
   if(page==='second')return Response.json({value:[],'@odata.nextLink':`${graph}${encodedPath}/microsoft.graph.delta%28%29?%24skiptoken=third`});
   return Response.json({value:[],'@odata.deltaLink':`${graph}${path}/delta?$deltatoken=terminal`});
  });
  const id=await f.connect({mail:{folders:['INBOX']},calendars:[calendar],calendarWindow:window});await f.drain(id);assert.equal(await f.count(id),2);
  const before=JSON.parse((await f.source(id))!.cursor),offset=f.reads.length;failure='expired';await f.drain(id);
  assert.equal(await f.count(id),3,'the scoped restart preserves and deduplicates the original evidence');
  const after=JSON.parse((await f.source(id))!.cursor);assert.deepEqual(after.parts['mail:INBOX'],before.parts['mail:INBOX']);
  assert.ok(f.reads.slice(offset).filter(url=>url.includes('/messages/delta')).every(url=>new URL(url).searchParams.has('$deltatoken')),'the other selected resource never restarts');
  for(const mode of ['bad-request','outage'] as const){failure=mode;const checkpoint=(await f.source(id))!.cursor;const result=await f.sync(id);assert.equal(result.summary.halted,'unavailable');assert.deepEqual(JSON.parse((await f.source(id))!.cursor).parts,JSON.parse(checkpoint).parts);assert.equal(await f.count(id),3);}
  failure='initial-expired';await f.select(id,{calendars:[calendar],calendarWindow:window});assert.equal((await f.sync(id)).summary.halted,'unavailable');assert.equal((await f.source(id))!.cursor,null,'a rejected initial request cannot start a reset loop');
 }finally{await f.dispose();}
});

test('CAPTURE-006 repeated and cyclic provider pages halt visibly, retain checkpoints and recover through finite empty pages',async()=>{
 for(const provider of ['google','microsoft'] as const){const f=await captureRecoveryFixture(provider);try{
  let mode:'repeat'|'cycle'|'finite'='repeat';
  f.respond(url=>{
   const isPage=provider==='google'?url.pathname.endsWith('/messages'):url.pathname.endsWith('/messages/delta');if(!isPage)return;
   const page=url.searchParams.get(provider==='google'?'pageToken':'$skiptoken');
   const cycle=['a','b','c','d','e','f'];
   const token=mode==='repeat'?'same':mode==='cycle'?cycle[(cycle.indexOf(page??'')+1)%cycle.length]:page==='same'||cycle.includes(page??'')||!page?'1':Number(page)<12?String(Number(page)+1):undefined;
   if(provider==='google')return Response.json({messages:[],...(token?{nextPageToken:token}:{})});
   return Response.json({value:[],...(token?{'@odata.nextLink':`${url.origin}${url.pathname}?$skiptoken=${token}`}:{'@odata.deltaLink':`${url.origin}${url.pathname}?$deltatoken=complete`})});
  });
  const id=await f.connect({mail:{folders:['INBOX']}});
  for(const broken of ['repeat','cycle'] as const){
   mode=broken;await f.select(id,{mail:{folders:['INBOX']}});
   let result:any;for(let i=0;i<4;i++){result=await f.sync(id);if(result.summary.halted)break;}
   assert.equal(result.summary.halted,'unavailable');const stopped=(await f.source(id))!;assert.ok(stopped.last_error);assert.equal(stopped.state,'connected');assert.ok(stopped.cursor);
   assert.equal((await f.sync(id)).summary.halted,'unavailable');assert.equal((await f.source(id))!.cursor,stopped.cursor,'a broken page never commits over the last usable checkpoint');
   mode='finite';await f.drain(id);assert.equal((await f.source(id))!.last_error,null);assert.equal(await f.count(id),0);
  }
 }finally{await f.dispose();}}
});

test('CAPTURE-006 Google calendar pages, recurring instances and provider option pages reject stalled continuation',async()=>{
 const f=await captureRecoveryFixture('google');try{
  let mode:'calendar'|'instances'|'options'='calendar';f.network.state.recurring=true;
  f.respond(url=>{
   if(mode==='calendar'&&url.pathname.endsWith('/events'))return Response.json({items:[],nextPageToken:'stuck'});
   if(mode==='instances'&&url.pathname.endsWith('/instances'))return Response.json({items:[],nextPageToken:'stuck'});
   if(mode==='options'&&url.pathname.endsWith('/calendarList'))return Response.json({items:[],nextPageToken:'stuck'});
  });
  const id=await f.connect({calendars:['calendar'],calendarWindow:window});
  for(const failing of ['calendar','instances'] as const){mode=failing;await f.select(id,{calendars:['calendar'],calendarWindow:window});assert.equal((await f.sync(id)).summary.halted,'unavailable');assert.ok((await f.source(id))!.last_error);}
  mode='options';let continuation:string|undefined,failed=false;
  for(let i=0;i<4;i++){const response=await f.request(`/sources/${id}/options${continuation?`?continuation=${encodeURIComponent(continuation)}`:''}`);if(response.status===503){failed=true;break;}assert.equal(response.status,200);continuation=(await response.json() as any).continuation;assert.ok(continuation);}
  assert.ok(failed,'metadata pagination must also stop visibly');
 }finally{await f.dispose();}
});

test('CAPTURE-006 accepting Graph operation aliases never follows a different scope, operation, host or redirect',async()=>{
 const f=await captureRecoveryFixture('microsoft');try{
  const path='/v1.0/me/calendars/calendar/calendarView/delta()',id=await f.connect({calendars:['calendar'],calendarWindow:window});
  for(const link of [
   `https://evil.test${path}?$skiptoken=next`,
   `${graph}/v1.0/users/other/calendars/calendar/calendarView/delta()?$skiptoken=next`,
   `${graph}/v1.0/me/calendars/other/calendarView/delta()?$skiptoken=next`,
   `${graph}/v1.0/me/mailFolders/calendar/messages/delta()?$skiptoken=next`,
   `${graph}/beta/me/calendars/calendar/calendarView/delta()?$skiptoken=next`,
   `${graph}/v1.0/me/calendars/calendar/calendarView/other()?$skiptoken=next`,
   `${graph}/v1.0/me/calendars/calendar%2Fother/calendarView/delta()?$skiptoken=next`,
   `${graph}${path}?$skiptoken=next#fragment`,
   `https://username@graph.microsoft.com${path}?$skiptoken=next`,
  ]){
   f.respond(url=>url.pathname.includes('/calendarView/')?Response.json({value:[],'@odata.nextLink':link}):undefined);
   const before=f.reads.length;assert.equal((await f.sync(id)).summary.halted,'unavailable');assert.equal(f.reads.length,before+1);assert.equal((await f.source(id))!.cursor,null);
  }
  f.respond(undefined);f.network.state.redirect=true;assert.equal((await f.sync(id)).summary.halted,'unavailable');assert.equal((await f.source(id))!.cursor,null);
  f.network.state.redirect=false;
  f.respond(url=>url.pathname==='/v1.0/me/mailFolders'?Response.json({value:[],'@odata.nextLink':`${graph}/v1.0/me/mailFolders?$skiptoken=stuck`}):undefined);
  let continuation:string|undefined,failed=false;
  for(let i=0;i<4;i++){const response=await f.request(`/sources/${id}/options${continuation?`?continuation=${encodeURIComponent(continuation)}`:''}`);if(response.status===503){failed=true;break;}assert.equal(response.status,200);continuation=(await response.json() as any).continuation;assert.ok(continuation);}
  assert.ok(failed,'Graph metadata pagination must also stop visibly');
 }finally{await f.dispose();}
});
