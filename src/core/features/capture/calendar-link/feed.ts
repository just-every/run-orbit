import {CaptureError,CaptureProviderError,type CaptureItem,type CaptureSourceAdapter} from '../contracts';
import {parseCalendar} from '../ics';
import {payloadHash} from '../../../platform/source-security';
import {boundedResponse,ResponseTooLarge} from '../providers/response';

/**
 * A calendar's private iCal address (Google "Secret address in iCal format",
 * Outlook "Publish calendar" ICS link, iCloud public calendar). Orbit reads it
 * like a subscribed calendar app: GET only, never a write. Each event becomes
 * one calendar item, so the file import's replay identity (UID, SEQUENCE and
 * what happened) applies unchanged.
 */
export const FEED_PAGE=40;
const DAY=86400000;
export type FeedFetch=(input:string,init?:RequestInit)=>Promise<Response>;

export function calendarLink(value:unknown){
 if(typeof value!=='string'||value.length>4000)throw new CaptureError(400,'Paste the calendar’s iCal address.');
 let url:URL;try{url=new URL(value.trim().replace(/^webcals?:\/\//i,'https://'));}catch{throw new CaptureError(400,'That is not a web address. Paste the calendar’s iCal address; it starts with https:// or webcal://.');}
 if(url.protocol!=='https:'||url.username||url.password||/^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[)/i.test(url.hostname)||url.hostname.endsWith('.localhost'))throw new CaptureError(400,'Use the calendar’s https:// or webcal:// iCal address.');
 url.hash='';return url.href;
}

export async function readFeed(fetcher:FeedFetch,link:string){
 let response:Response;
 try{response=await fetcher(link,{method:'GET',redirect:'follow',headers:{accept:'text/calendar, */*;q=0.5'},signal:AbortSignal.timeout(20000)});}
 catch{throw new CaptureProviderError('unavailable','The calendar could not be reached.');}
 if([401,403,404,410].includes(response.status)){await response.body?.cancel();throw new CaptureProviderError('revoked',`The calendar refused this link (HTTP ${response.status}). Copy its current private address and add it again.`);}
 if(!response.ok){await response.body?.cancel();throw new CaptureProviderError('unavailable','The calendar did not answer. Orbit tries again later.');}
 let text:string;
 try{text=await (await boundedResponse(response,5*1024*1024)).text();}catch(error){if(error instanceof ResponseTooLarge)throw new CaptureProviderError('unavailable','The calendar is larger than 5 MB.');throw error;}
 if(!/^\s*BEGIN:VCALENDAR/i.test(text))throw new CaptureProviderError('revoked','That link does not return a calendar. Paste the iCal address, not the calendar’s web page.');
 return text;
}

export function feedName(text:string){
 return /^X-WR-CALNAME:(.*)$/im.exec(text)?.[1]?.replace(/\\([,;\\])/g,'$1').trim().slice(0,120)||null;
}

/** Events that overlap the last 180 days or the next year, one calendar item each, in a stable order. */
export function feedItems(text:string,now=Date.now()):CaptureItem[]{
 const from=now-180*DAY,to=now+366*DAY,items:{at:string;raw:string}[]=[];
 for(const event of parseCalendar(text)){
  if('error' in event)continue;
  const start=event.start??event.end,end=event.end??event.start;
  if(start&&end&&(Date.parse(end)<from||Date.parse(start)>to))continue;
  items.push({at:start??'',raw:`BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${event.raw.replace(/\r?\n/g,'\r\n')}\r\nEND:VCALENDAR`});
 }
 return items.sort((left,right)=>left.at.localeCompare(right.at)||left.raw.localeCompare(right.raw)).map(item=>({kind:'calendar' as const,raw:item.raw}));
}

interface Cursor {hash:string;next:number}
/** The cursor remembers the feed's content hash: an unchanged feed is not read again event by event. */
export function feedAdapter(fetcher:FeedFetch,name:string):CaptureSourceAdapter{
 return {adapter:'ical',scope:{calendars:[name]},async pull(raw,credential){
  const {url}=JSON.parse(credential??'{}') as {url?:string};
  if(!url)throw new CaptureError(409,'Paste the calendar link again.');
  const text=await readFeed(fetcher,url),hash=await payloadHash(text),items=feedItems(text);
  const cursor:Cursor=raw?JSON.parse(raw):{hash:'',next:0},start=cursor.hash===hash?cursor.next:0;
  const next=Math.min(items.length,start+FEED_PAGE);
  return {items:items.slice(start,next),cursor:JSON.stringify({hash,next}),more:next<items.length};
 }};
}
