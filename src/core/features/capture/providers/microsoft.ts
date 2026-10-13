import {objectResponse,list,opaque,pageProgress,type PageProgress} from './response';
import {CaptureProviderError,type CaptureItem,type CaptureScope} from '../contracts';
import type {ProviderSession} from './session';
import {calendarItem} from './calendar';
import {encodeId,graphLink} from './config';
const graph='https://graph.microsoft.com';
const headers={Prefer:'IdType="ImmutableId", outlook.timezone="UTC", odata.maxpagesize=10'};
export async function microsoftPage(session:ProviderSession,kind:'mail'|'calendar',id:string,cursor:{link?:string;pagination?:PageProgress},scope:CaptureScope){
 // The official v1.0 selected-calendar SDK/OpenAPI operation includes parentheses.
 const path=kind==='mail'?`/v1.0/me/mailFolders/${encodeId(id)}/messages/delta`:`/v1.0/me/calendars/${encodeId(id)}/calendarView/delta()`;
 const first=kind==='mail'?`${graph}${path}?$select=id,parentFolderId`:`${graph}${path}?${new URLSearchParams({startDateTime:scope.calendarWindow!.start,endDateTime:scope.calendarWindow!.end})}`;
 const response=await session.read(cursor.link?graphLink(cursor.link,path):first,headers,[400]);
 // https://learn.microsoft.com/en-us/graph/delta-query-overview#token-duration
 // A missing saved sync state needs a fresh read of this resource, never another scope.
 if(cursor.link&&(response.status===410||response.status===400&&(await objectResponse(response)).error?.code==='syncStateNotFound'))return {items:[],cursor:{},more:true};
 if(!response.ok)throw new CaptureProviderError('unavailable','The selected provider resource is unavailable.');
 const data=await objectResponse(response),items:CaptureItem[]=[];
 const next=opaque(data['@odata.nextLink']),delta=opaque(data['@odata.deltaLink']);
 if(!next&&!delta||next&&delta)throw new CaptureProviderError('unavailable','The mailbox did not return a valid delta cursor.');
 const link=graphLink((next??delta)!,path),pagination=pageProgress(cursor.link,next?link:undefined,cursor.pagination);
 for(const entry of list(data,'value')){
  // Tombstones supply neither a source date nor participants. Normalization records a skip, never invents either.
  if(kind==='calendar'){items.push(calendarItem('microsoft',entry));continue;}
  if(entry['@removed'])continue;
  if(typeof entry.id!=='string'||!entry.id)throw new CaptureProviderError('unavailable','The mailbox returned an invalid message identity.');
  const message=await session.read(`${graph}/v1.0/me/mailFolders/${encodeId(id)}/messages/${encodeId(entry.id)}/$value`,headers);
  if(message.status===404)continue;
  items.push({kind:'message',raw:await message.text()});
 }
 return {items,cursor:{link,pagination},more:Boolean(next)};
}
interface OptionsCursor{queue:string[];current?:string;next?:string;pagination?:PageProgress;calendars?:boolean}
export async function microsoftOptions(session:ProviderSession,continuation?:string){
 let cursor:OptionsCursor={queue:[]};
 if(continuation){try{cursor=JSON.parse(continuation);if(!Array.isArray(cursor.queue)||cursor.queue.some(id=>typeof id!=='string')||cursor.queue.length>10000)throw new Error();}catch{throw new CaptureProviderError('unavailable','Invalid metadata continuation.');}}
 const path=cursor.calendars?'/v1.0/me/calendars':cursor.current?`/v1.0/me/mailFolders/${encodeId(cursor.current)}/childFolders`:'/v1.0/me/mailFolders';
 const data=await session.json(cursor.next?graphLink(cursor.next,path):`${graph}${path}?$top=100`,headers);
 const next=opaque(data['@odata.nextLink']);if(next)graphLink(next,path);
 cursor.pagination=pageProgress(cursor.next,next,cursor.pagination);
 const entries=(list(data,'value')).map((entry:any)=>({id:entry.id,name:entry.displayName??entry.name??entry.id}));
 if(!cursor.calendars)for(const entry of list(data,'value'))if(entry.childFolderCount>0)cursor.queue.push(entry.id);
 if(next)cursor.next=next;
 else{delete cursor.next;if(cursor.queue.length)cursor.current=cursor.queue.shift();else if(!cursor.calendars){delete cursor.current;cursor.calendars=true;}else return {mail:[],calendars:entries,continuation:undefined};}
 return {mail:path==='/v1.0/me/calendars'?[]:entries,calendars:path==='/v1.0/me/calendars'?entries:[],continuation:JSON.stringify(cursor)};
}
export async function validateMicrosoftScope(session:ProviderSession,scope:CaptureScope){
 for(const id of scope.mail?.folders??[]){const value=await session.json(`${graph}/v1.0/me/mailFolders/${encodeId(id)}?$select=id`,headers);if(value.id!==id)throw new CaptureProviderError('unavailable','Choose folders returned by this account.');}
 for(const id of scope.calendars??[]){const value=await session.json(`${graph}/v1.0/me/calendars/${encodeId(id)}?$select=id`,headers);if(value.id!==id)throw new CaptureProviderError('unavailable','Choose calendars returned by this account.');}
}
