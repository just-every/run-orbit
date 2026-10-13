import assert from 'node:assert/strict';
import {test} from 'node:test';
import {captureRecoveryFixture} from '../support/capture-recovery-fixture';

const graph='https://graph.microsoft.com';
const window={start:'2026-01-01T00:00:00.000Z',end:'2027-01-01T00:00:00.000Z'};
const key=(id:string)=>encodeURIComponent(id.replaceAll("'","''")).replaceAll("'",'%27');
const event=(id:string)=>({id,iCalUId:`${id}@acme.example`,subject:'Selected calendar meeting',createdDateTime:'2026-10-01T10:00:00Z',lastModifiedDateTime:'2026-10-01T10:00:00Z',isAllDay:true,start:{dateTime:'2026-10-20T00:00:00',timeZone:'UTC'},end:{dateTime:'2026-10-21T00:00:00',timeZone:'UTC'},organizer:{emailAddress:{address:'ana@acme.example'}},attendees:[{emailAddress:{address:'seller@orbit.test'}}]});

test('CAPTURE-006 Graph OData continuations retain selected identities and opaque links without crossing resource boundaries',async()=>{
 const f=await captureRecoveryFixture('microsoft');try{
  let source:string|undefined,captured=0;
  const selections=[
   {kind:'mail',id:'AQMkADNkNAAAgEMAAAA'},
   {kind:'mail',id:"Folder+=/%2F'Odd()"},
   {kind:'calendar',id:"Calendar+=/%2F'Odd()"},
  ] as const;
  for(const [index,selection] of selections.entries()){
   const {kind,id}=selection,collection=kind==='mail'?'mailFolders':'calendars',resource=kind==='mail'?'messages':'calendarView';
   const selected=`/v1.0/me/${collection}/${encodeURIComponent(id)}`,path=`${selected}/${resource}/delta${kind==='calendar'?'()':''}`;
   const predicate=`/v1.0/me/${collection.toLowerCase()}('${key(id)}')/${resource.toLowerCase()}`;
   const next=`${graph}${predicate}/delta?%24skiptoken=Next%2f%2B%3D&opaque=a+b&opaque=%252F`;
   const terminal=`${graph}:443${predicate.replace("('",'%28%27').replace("')",'%27%29')}/microsoft.graph.delta%28%29?%24deltatoken=Done%2f%2B%3D&opaque=a+b`;
   let blockNext=true;
   f.respond(url=>{
    if(url.pathname===selected)return Response.json({id});
    if(url.pathname.endsWith('/$value'))return;
    if(url.searchParams.has('$skiptoken'))return blockNext?Response.json({}, {status:503}):Response.json({value:kind==='mail'?[{id:`mail-${index}-second`}]:[event(`calendar-${index}-second`)],'@odata.deltaLink':terminal});
    if(url.searchParams.has('$deltatoken'))return Response.json({value:[],'@odata.deltaLink':terminal});
    assert.equal(url.pathname,path);
    return Response.json({value:kind==='mail'?[{id:`mail-${index}-first`}]:[event(`calendar-${index}-first`)],'@odata.nextLink':next});
   });
   const scope=kind==='mail'?{mail:{folders:[id]}}:{calendars:[id],calendarWindow:window};
   if(source)await f.select(source,scope);else source=await f.connect(scope);
   assert.equal((await f.sync(source)).summary.halted,'unavailable');
   const interrupted=(await f.source(source))!;assert.ok(interrupted.cursor,'the first page commits before the next provider request is interrupted');
   assert.equal(JSON.parse(interrupted.cursor).parts[`${kind}:${id}`].link,next,'a completed page keeps the provider nextLink across an interrupted HTTP sync');
   captured++;assert.equal(await f.count(source),captured);
   blockNext=false;const resumed=f.reads.length;await f.drain(source);captured++;
   assert.equal(f.reads[resumed],next,'resume sends the exact nextLink without rebuilding its path or query');
   assert.equal(await f.count(source),captured);
   assert.equal(JSON.parse((await f.source(source))!.cursor).parts[`${kind}:${id}`].link,terminal);
   const incremental=f.reads.length;await f.drain(source);
   assert.deepEqual(f.reads.slice(incremental),[terminal],'the next round sends the exact terminal deltaLink');
   assert.equal(await f.count(source),captured);
  }

  const selected=selections[2].id,resource=`/v1.0/me/calendars('${key(selected)}')/calendarView/delta()`;
  const unsafe=[
   `https://foreign.test${resource}?$skiptoken=x`,
   `http://graph.microsoft.com${resource}?$skiptoken=x`,
   `https://graph.microsoft.com:444${resource}?$skiptoken=x`,
   `${graph}${resource.replace('/me/','/users/other/')}?$skiptoken=x`,
   `${graph}${resource.replace('/v1.0/','/beta/')}?$skiptoken=x`,
   `${graph}${resource.replace(key(selected),key('other'))}?$skiptoken=x`,
   `${graph}${resource.replace(key(selected),key(selected.toLowerCase()))}?$skiptoken=x`,
   `${graph}${resource.replace(key(selected),key(`${selected}/other`))}?$skiptoken=x`,
   `${graph}${resource.replace('calendars(','mailfolders(').replace('/calendarView/','/messages/')}?$skiptoken=x`,
   `${graph}${resource.replace('delta()','other()')}?$skiptoken=x`,
   `${graph}${resource.replace('delta()','delta(value=1)')}?$skiptoken=x`,
   `${graph}${resource.replace("calendars('","calendars(id='")}?$skiptoken=x`,
   `${graph}${resource.replace('%27%27','%27')}?$skiptoken=x`,
   `${graph}${resource.replace('%2F','/')}?$skiptoken=x`,
   `${graph}${resource.replace('%2F','%252F')}?$skiptoken=x`,
   `${graph}${resource.replace('%2F','%ZZ')}?$skiptoken=x`,
   `${graph}${resource.replace('/calendarView/','/events/../calendarView/')}?$skiptoken=x`,
   `${graph}${resource.replace('/calendarView/','/events/%2e%2e/calendarView/')}?$skiptoken=x`,
   `${graph}${resource.replace('/calendarView/','\\calendarView/')}?$skiptoken=x`,
   `${graph}${resource}?$skiptoken=x#fragment`,
   `${graph}${resource}?$skiptoken=x#`,
   `https://username:password@graph.microsoft.com${resource}?$skiptoken=x`,
   `https://@graph.microsoft.com${resource}?$skiptoken=x`,
  ];
  const checkpoint=(await f.source(source!))!.cursor;
  for(const link of unsafe){
   f.respond(()=>Response.json({value:[event('forbidden')],'@odata.nextLink':link}));
   const before=f.reads.length;assert.equal((await f.sync(source!)).summary.halted,'unavailable',link);
   assert.equal(f.reads.length,before+1,'an unsafe continuation never receives the credential');
   assert.equal((await f.source(source!))!.cursor,checkpoint);
   assert.equal(await f.count(source!),captured);
  }
  f.respond(()=>new Response(null,{status:302,headers:{location:`${graph}${resource}?$skiptoken=redirect`}}));
  const redirected=f.reads.length;assert.equal((await f.sync(source!)).summary.halted,'unavailable');
  assert.equal(f.reads.length,redirected+1);assert.equal((await f.source(source!))!.cursor,checkpoint);

  // Folder discovery traverses a selected parent's childFolders with the same key grammar.
  const folder=selections[1].id,rootNext=`${graph}/v1.0/ME/MAILFOLDERS?%24skiptoken=Folders%2fNext`;
  const childNext=`${graph}/v1.0/me/MAILFOLDERS%28%27${key(folder)}%27%29/CHILDFOLDERS?%24skiptoken=Children%2fNext`;
  f.respond(url=>{
   if(url.pathname.toLowerCase()==='/v1.0/me/mailfolders')return Response.json(url.searchParams.has('$skiptoken')?{value:[{id:folder,displayName:'Parent',childFolderCount:1}]}:{value:[],'@odata.nextLink':rootNext});
   if(url.pathname.endsWith('/childFolders'))return Response.json({value:[{id:'child-first',displayName:'First'}],'@odata.nextLink':childNext});
   if(url.pathname.endsWith('/CHILDFOLDERS'))return Response.json({value:[{id:'child-second',displayName:'Second'}]});
   if(url.pathname==='/v1.0/me/calendars')return Response.json({value:[]});
  });
  const optionReads=f.reads.length,folders:string[]=[];let continuation:string|undefined;
  for(let page=0;page<6;page++){
   const response=await f.request(`/sources/${source}/options${continuation?`?continuation=${encodeURIComponent(continuation)}`:''}`);assert.equal(response.status,200);
   const result=await response.json() as any;folders.push(...result.mail.map((entry:{id:string})=>entry.id));continuation=result.continuation;if(!continuation)break;
  }
  assert.equal(continuation,undefined);assert.deepEqual(folders,[folder,'child-first','child-second']);
  assert.deepEqual(f.reads.slice(optionReads),[`${graph}/v1.0/me/mailFolders?$top=100`,rootNext,`${graph}/v1.0/me/mailFolders/${encodeURIComponent(folder)}/childFolders?$top=100`,childNext,`${graph}/v1.0/me/calendars?$top=100`]);
 }finally{await f.dispose();}
});
