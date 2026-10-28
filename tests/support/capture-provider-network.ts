import assert from 'node:assert/strict';
import {eml} from './capture-mail';
import {scopes,type Provider,type ProviderFetch} from '../../src/core/features/capture/providers/config';
/** Only the external HTTP edge is replaced. Orbit auth, D1, normalizers and intake run unchanged. */
export function captureProviderNetwork(provider:Provider){
 const state={calendarEvent:null as any,writeInstances:new Map<string,any[]>(),writeEvents:new Map<string,any>(),writes:[] as {method:string;body:any;url:string}[],conflictNext:false,uncertainWrite:false,reads:[] as string[],tokens:0,total:25,incremental:false,incrementalIds:['new'],mailHeaders:{} as Record<string,Record<string,string>>,outage:false,revoked:false,expireHistory:false,scope:scopes[provider].join(' '),unsafeLink:'',malformed:false,redirect:false,early401:false,tombstones:false,recurring:false,challenge:'',pause:undefined as undefined|((url:string)=>Promise<void>),calendarRound:0};
 const mail=(id:string)=>eml({From:id==='unknown'?'other@unknown.test':'Ana <ana@acme.example>',To:'seller@orbit.test',Subject:`Provider ${id}`,Date:'Mon, 05 Oct 2026 10:00:00 +0000','Message-ID':`<${provider}-${id}@acme.example>`,...state.mailHeaders[id]},`Evidence ${id}`);
 const calendar=(cancelled=false)=>state.calendarEvent??(provider==='google'?{id:'event',iCalUID:'meeting@acme.example',summary:'Acme meeting',sequence:cancelled?1:0,created:'2026-10-01T10:00:00Z',updated:cancelled?'2026-10-06T10:00:00Z':'2026-10-01T10:00:00Z',status:cancelled?'cancelled':'confirmed',start:{date:'2026-10-20'},end:{date:'2026-10-21'},organizer:{email:'ana@acme.example'},attendees:[{email:'seller@orbit.test'}]}:{id:'event',iCalUId:'meeting@acme.example',subject:'Acme meeting',createdDateTime:'2026-10-01T10:00:00Z',lastModifiedDateTime:cancelled?'2026-10-06T10:00:00Z':'2026-10-01T10:00:00Z',isCancelled:cancelled,isAllDay:true,start:{dateTime:'2026-10-20T00:00:00',timeZone:'UTC'},end:{dateTime:'2026-10-21T00:00:00',timeZone:'UTC'},organizer:{emailAddress:{address:'ana@acme.example'}},attendees:[{emailAddress:{address:'seller@orbit.test'}}]});
 const occurrences=()=>[1,2].map(n=>provider==='google'?{...calendar(),id:`occurrence-${n}`,iCalUID:'series@acme.example',start:{dateTime:`2026-11-0${n===1?1:8}T01:30:00${n===1?'-04:00':'-05:00'}`,timeZone:'America/New_York'},end:{dateTime:`2026-11-0${n===1?1:8}T02:30:00${n===1?'-05:00':'-05:00'}`,timeZone:'America/New_York'},originalStartTime:{dateTime:`2026-11-0${n===1?1:8}T01:30:00${n===1?'-04:00':'-05:00'}`}}:{...calendar(),id:`occurrence-${n}`,iCalUId:`series-${n}@acme.example`,isAllDay:false,start:{dateTime:`2026-11-0${n===1?1:8}T0${n===1?5:6}:30:00`,timeZone:'UTC'},end:{dateTime:`2026-11-0${n===1?1:8}T07:30:00`,timeZone:'UTC'},originalStart:`2026-11-0${n===1?1:8}T0${n===1?5:6}:30:00Z`});
 const json=(value:unknown,status=200)=>Response.json(value,{status});
 const fetcher:ProviderFetch=async(raw,init={})=>{
  const url=new URL(raw);assert.equal(init.redirect,'error','provider redirects never receive a bearer token');
  await state.pause?.(raw);
  if(url.pathname.endsWith('/token')){
   assert.equal(init.method,'POST');const body=new URLSearchParams(init.body as string);assert.ok(body.get('client_secret'));
   if(body.get('grant_type')==='authorization_code'){assert.ok(body.get('code_verifier'));const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body.get('code_verifier')!));assert.equal(Buffer.from(digest).toString('base64url'),state.challenge,'PKCE verifier binds this initiating authorization');}
   state.tokens++;return json({access_token:`access-${state.tokens}`,refresh_token:`refresh-${state.tokens}`,expires_in:3600,scope:state.scope});
  }
  if(state.revoked&&!url.pathname.endsWith('/token'))return json({},401);
  if(url.pathname.endsWith('/instances')&&state.writeInstances.has(url.pathname.split('/').at(-2)!)){const values=state.writeInstances.get(url.pathname.split('/').at(-2)!)!;return json(provider==='google'?{items:values}:{value:values});}
  if(/\/events(?:\/[^/]+)?(?:\/cancel)?$/.test(url.pathname)&&(init.method!=='GET'||/\/events\/[^/]+$/.test(url.pathname))){
   assert.ok(new Headers(init.headers).get('authorization'));
   const parts=url.pathname.split('/'),eventId=parts.at(-1)==='cancel'?parts.at(-2)!:parts.at(-1)!,event=state.writeEvents.get(eventId);
   if(init.method==='GET')return event?json(event):json({},404);
   assert.ok(state.scope.includes(provider==='google'?'calendar.events':'Calendars.ReadWrite'),'writes require separate scope');
   if(state.uncertainWrite)throw new Error('Synthetic provider disconnect');
   if(state.conflictNext){state.conflictNext=false;return json({},412);}
   const body=init.body?JSON.parse(String(init.body)):null;
   if(event)assert.equal(new Headers(init.headers).get('if-match'),event.etag??event['@odata.etag']);
   state.writes.push({method:init.method!,body,url:raw});
   if(init.method==='DELETE'||url.pathname.endsWith('/cancel')){assert.ok(event);state.writeEvents.delete(eventId);return new Response(null,{status:provider==='google'?204:202});}
   const nextId=event?eventId:`synthetic-orbit-event-${state.writeEvents.size+1}`,revision=`"synthetic-${state.writes.length}"`,next={...body,...(provider==='google'?{organizer:{self:true}}:{isOrganizer:true}),id:nextId,...(provider==='google'?{etag:revision}:{'@odata.etag':revision})};state.writeEvents.set(nextId,next);return json(next,init.method==='POST'?201:200);
  }
  assert.equal(init.method,'GET','capture never writes provider data');assert.ok(new Headers(init.headers).get('authorization'));state.reads.push(raw);
  if(state.outage)return json({},503);if(state.malformed)return json({});if(state.redirect)return new Response(null,{status:302,headers:{location:'https://evil.test/stolen'}});if(state.early401){state.early401=false;return json({},401);}if(state.revoked)return json({},401);
  if(provider==='google'){
   if(url.pathname.endsWith('/profile'))return json({historyId:'900719925474099312345'});
   if(url.pathname.endsWith('/labels'))return json({labels:[{id:'INBOX',name:'Inbox'},{id:'SENT',name:'Sent'}]});
   if(url.pathname.endsWith('/users/me/calendarList'))return json(url.searchParams.has('pageToken')?{items:[]}:{items:[{id:'calendar',summary:'Calendar'}],nextPageToken:'metadata-next'});
   if(url.pathname.endsWith('/calendarList/calendar'))return json({id:'calendar'});
   if(url.pathname.endsWith('/messages')){const page=Number(url.searchParams.get('pageToken')??0),ids=Array.from({length:state.total},(_,i)=>String(i)).concat('unknown'),slice=ids.slice(page,page+10);return json({messages:slice.map(id=>({id})),...(page+10<ids.length?{nextPageToken:String(page+10)}:{})});}
   if(url.pathname.endsWith('/history')){if(state.expireHistory){state.expireHistory=false;return json({},404);}return json({historyId:'900719925474099312346',history:state.incremental?[{messagesAdded:state.incrementalIds.map(id=>({message:{id}}))}]:[]});}
   if(url.pathname.includes('/messages/'))return json({raw:Buffer.from(mail(url.pathname.split('/').at(-1)!)).toString('base64url'),labelIds:['INBOX','SENT']});
   if(url.pathname.endsWith('/instances'))return json(url.searchParams.has('pageToken')?{items:[occurrences()[1]]}:{items:[occurrences()[0]],nextPageToken:'instance-next'});
   if(url.pathname.endsWith('/events')){state.calendarRound++;return json(url.searchParams.has('pageToken')?{items:[],nextSyncToken:`sync-${state.calendarRound}`}:{items:[calendar(state.incremental),...(state.recurring?[{...calendar(),id:'series',recurrence:['RRULE:FREQ=WEEKLY']}]:[]),...(state.tombstones?[{id:'deleted',status:'cancelled'}]:[])],nextPageToken:'calendar-next'});}
  }else{
   if(url.pathname==='/v1.0/me/mailFolders')return json(url.searchParams.has('$skiptoken')?{value:[{id:'SENT',displayName:'Sent',childFolderCount:0}]}:{value:[{id:'INBOX',displayName:'Inbox',childFolderCount:0}],'@odata.nextLink':`${url.origin}${url.pathname}?$skiptoken=folders`});
   if(url.pathname==='/v1.0/me/calendars')return json({value:[{id:'calendar',name:'Calendar'}]});
   if(/^\/v1.0\/me\/(mailFolders|calendars)\/[^/]+$/.test(url.pathname))return json({id:url.pathname.split('/').at(-1)});
   if(url.pathname.endsWith('/messages/delta')){
    const page=Number(url.searchParams.get('$skiptoken')??0),delta=url.searchParams.has('$deltatoken'),ids=delta?(state.incremental?state.incrementalIds:[]):Array.from({length:state.total},(_,i)=>String(i)).concat('unknown'),slice=ids.slice(page,page+10);
    const next=page+10<ids.length?`${url.origin}${url.pathname}?$skiptoken=${page+10}`:undefined;
    return json({value:slice.map(id=>({id,parentFolderId:'INBOX'})),...(next?{'@odata.nextLink':state.unsafeLink||next}:{'@odata.deltaLink':state.unsafeLink||`${url.origin}${url.pathname}?$deltatoken=next`})});
   }
   if(url.pathname.endsWith('/$value'))return new Response(mail(url.pathname.split('/').at(-2)!));
   if(/\/calendarView\/delta(?:\(\))?$/.test(url.pathname))return json(url.searchParams.has('$skiptoken')?{value:[],'@odata.deltaLink':`${url.origin}${url.pathname}?$deltatoken=calendar`}:{value:[calendar(state.incremental),...(state.recurring?occurrences():[]),...(state.tombstones?[{id:'deleted','@removed':{reason:'deleted'}}]:[])],'@odata.nextLink':`${url.origin}${url.pathname}?$skiptoken=calendar`});
  }
  throw new Error(`Unexpected provider endpoint: ${url.origin}${url.pathname}`);
 };
 return {state,fetcher};
}
