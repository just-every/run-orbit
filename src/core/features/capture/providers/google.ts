import {objectResponse,list,opaque,pageProgress,type PageProgress} from './response';
import {CaptureProviderError,type CaptureItem,type CaptureScope} from '../contracts';
import type {ProviderSession} from './session';
import {calendarItem,withinCalendarWindow} from './calendar';
import {encodeId} from './config';
const gmail='https://gmail.googleapis.com/gmail/v1/users/me',calendar='https://www.googleapis.com/calendar/v3';
export interface GoogleCursor {baseline?:string;history?:string;page?:string;pagination?:PageProgress;scanning?:boolean;sync?:string;series?:string[];instancePage?:string;instancePagination?:PageProgress;roundMore?:boolean;pending?:string[];pendingMore?:boolean}
const url=(path:string,params:Record<string,string|undefined>)=>`${path}?${new URLSearchParams(Object.entries(params).filter((entry):entry is [string,string]=>entry[1]!==undefined))}`;
export async function googleMail(session:ProviderSession,label:string,cursor:GoogleCursor){
 const next={...cursor};
 if(next.pending?.length){const pending=next.pending.slice(0,10);next.pending=next.pending.slice(10);return {items:await mailItems(session,label,pending),cursor:next,more:Boolean(next.pending.length||next.pendingMore)};}
 // Capture the high-water mark before the scan, then consume history from it: no gap during pagination.
 if(!next.history&&!next.baseline){const profile=await session.json(`${gmail}/profile`);if(typeof profile.historyId!=='string')throw new CaptureProviderError('unavailable','The mailbox did not return a history cursor.');next.baseline=profile.historyId;next.scanning=true;}
 const response=await session.read(next.scanning?url(`${gmail}/messages`,{labelIds:label,maxResults:'10',pageToken:next.page}):url(`${gmail}/history`,{startHistoryId:next.history??next.baseline,labelId:label,maxResults:'10',pageToken:next.page}));
 if(response.status===404&&!next.scanning)return {items:[],cursor:{},more:true};
 if(!response.ok)throw new CaptureProviderError('unavailable','The selected mailbox label is unavailable.');
 const data=await objectResponse(response);next.pagination=pageProgress(next.page,opaque(data.nextPageToken),next.pagination);
 const ids:string[]=next.scanning?list(data,'messages',data.resultSizeEstimate===0).map((message:any)=>message.id):[...new Set<string>(list(data,'history',typeof data.historyId==='string').flatMap((entry:any)=>[...list(entry,'messagesAdded',true),...list(entry,'labelsAdded',true)].map((entry:any)=>entry.message?.id)))];
 if(ids.some(id=>typeof id!=='string'||!id))throw new CaptureProviderError('unavailable','The mailbox returned an invalid message identity.');
 const items=await mailItems(session,label,ids.slice(0,10));next.pending=ids.slice(10);
 if(data.nextPageToken){next.page=data.nextPageToken;next.pendingMore=true;return {items,cursor:next,more:true};}
 delete next.page;
 if(next.scanning){delete next.scanning;next.history=next.baseline;delete next.baseline;next.pendingMore=true;return {items,cursor:next,more:true};}
 if(typeof data.historyId!=='string')throw new CaptureProviderError('unavailable','The mailbox did not return a history cursor.');
 next.history=data.historyId;next.pendingMore=false;return {items,cursor:next,more:Boolean(next.pending.length)};
}
async function mailItems(session:ProviderSession,label:string,ids:string[]){
 const items:CaptureItem[]=[];
 for(const id of ids){
  const response=await session.read(`${gmail}/messages/${encodeId(id)}?format=raw`);if(response.status===404)continue;
  const message=await objectResponse(response);
  if(!Array.isArray(message.labelIds)||message.labelIds.some((id:unknown)=>typeof id!=='string')||typeof message.raw!=='string')throw new CaptureProviderError('unavailable','The mailbox returned an incomplete message.');
  if(!message.labelIds.includes(label))continue;
  const bytes=Uint8Array.from(atob(message.raw.replace(/-/g,'+').replace(/_/g,'/')),character=>character.charCodeAt(0));items.push({kind:'message',raw:new TextDecoder().decode(bytes)});
 }
 return items;
}
export async function googleCalendar(session:ProviderSession,id:string,cursor:GoogleCursor,scope:CaptureScope){
 const next={...cursor},window=scope.calendarWindow!;
 if(next.series?.length){
  const response=await session.read(url(`${calendar}/calendars/${encodeId(id)}/events/${encodeId(next.series[0]!)}/instances`,{maxResults:'10',showDeleted:'true',timeMin:window.start,timeMax:window.end,pageToken:next.instancePage}));
  if(response.status===404){next.series=next.series.slice(1);delete next.instancePage;delete next.instancePagination;return {items:[calendarItem('google',{status:'cancelled'})],cursor:next,more:Boolean(next.series.length||next.roundMore)};}
  if(!response.ok)throw new CaptureProviderError('unavailable','The recurring calendar event is unavailable.');
  const data=await objectResponse(response);
  next.instancePagination=pageProgress(next.instancePage,opaque(data.nextPageToken),next.instancePagination);
  if(data.nextPageToken)next.instancePage=data.nextPageToken;else{next.series=next.series.slice(1);delete next.instancePage;}
  return {items:list(data,'items',typeof data.kind==='string').map((event:any)=>calendarItem('google',event)),cursor:next,more:Boolean(next.series.length||next.roundMore)};
 }
 const response=await session.read(url(`${calendar}/calendars/${encodeId(id)}/events`,{maxResults:'10',singleEvents:'false',showDeleted:'true',syncToken:next.sync,pageToken:next.page}));
 if(response.status===410&&(next.sync||next.page))return {items:[],cursor:{},more:true};
 if(!response.ok)throw new CaptureProviderError('unavailable','The selected calendar is unavailable.');
 const data=await objectResponse(response);next.pagination=pageProgress(next.page,opaque(data.nextPageToken),next.pagination);
 if(data.nextPageToken)next.page=data.nextPageToken;
 else{if(typeof data.nextSyncToken!=='string')throw new CaptureProviderError('unavailable','The calendar did not return a sync cursor.');next.sync=data.nextSyncToken;delete next.page;}
 next.series=list(data,'items',typeof data.kind==='string').filter((event:any)=>event.recurrence&&event.status!=='cancelled').map((event:any)=>event.id);
 next.roundMore=Boolean(data.nextPageToken);
 const items=list(data,'items',typeof data.kind==='string').filter((event:any)=>!event.recurrence||event.status==='cancelled').map((event:any)=>calendarItem('google',event)).filter(item=>withinCalendarWindow(item,window));
 return {items,cursor:next,more:Boolean(next.series?.length||next.roundMore)};
}
export async function googleOptions(session:ProviderSession,continuation?:string){
 let cursor:{page?:string;pagination?:PageProgress}={};
 if(continuation){try{cursor=JSON.parse(continuation);if(!cursor||typeof cursor!=='object'||!opaque(cursor.page))throw new Error();}catch{throw new CaptureProviderError('unavailable','Invalid metadata continuation.');}}
 const labels=continuation?[]:list(await session.json(`${gmail}/labels`),'labels'),page=await session.json(url(`${calendar}/users/me/calendarList`,{maxResults:'100',pageToken:cursor.page}));
 const next=opaque(page.nextPageToken),pagination=pageProgress(cursor.page,next,cursor.pagination);
 return {mail:labels.map((entry:any)=>({id:entry.id,name:entry.name})),calendars:list(page,'items',page.kind==='calendar#calendarList').map((entry:any)=>({id:entry.id,name:entry.summaryOverride??entry.summary??entry.id})),continuation:next?JSON.stringify({page:next,pagination}):undefined};
}
export async function validateGoogleScope(session:ProviderSession,scope:CaptureScope){
 const labels=new Set<string>(list(await session.json(`${gmail}/labels`),'labels').map((entry:any)=>entry.id));
 if((scope.mail?.folders??[]).some(label=>!labels.has(label)))throw new CaptureProviderError('unavailable','Choose labels returned by this mailbox.');
 for(const id of scope.calendars??[]){const value=await session.json(`${calendar}/users/me/calendarList/${encodeId(id)}`);if(value.id!==id)throw new CaptureProviderError('unavailable','Choose calendars returned by this account.');}
}
