import type {SourceSecurity} from '../../../platform/source-security';
import {createId} from '../../../shared/ids';
import {CaptureError} from '../contracts';
import {connectSource,syncSource} from '../sources';
import {calendarLink,feedAdapter,feedName,readFeed,type FeedFetch} from './feed';

const REFRESH_MINUTES=15;

/** Checks the link returns a calendar before saving it, so a wrong link is refused on the page. */
export async function connectCalendarLink(db:D1Database,security:SourceSecurity,fetcher:FeedFetch,input:{url:unknown;name?:unknown},actor:string,fences:D1PreparedStatement[]){
 const url=calendarLink(input.url),text=await readFeed(fetcher,url).catch(error=>{throw new CaptureError(400,(error as Error).message);});
 const typed=typeof input.name==='string'?input.name.trim().slice(0,120):'',name=typed||feedName(text)||`Calendar at ${new URL(url).hostname}`;
 const id=`capture-cal-${createId().toLowerCase()}`;
 await connectSource(db,{id,adapter:'ical',name,scope:{calendars:[name]},credential:JSON.stringify({url})},security,actor,fences);
 return id;
}

export async function syncCalendarLink(db:D1Database,id:string,security:SourceSecurity,fetcher:FeedFetch,maxPages=6){
 const source=await db.prepare('SELECT name,adapter,state FROM capture_sources WHERE id=?').bind(id).first<{name:string;adapter:string;state:string}>();
 if(!source||source.adapter!=='ical')throw new CaptureError(404,'Calendar link not found.');
 return syncSource(db,id,feedAdapter(fetcher,source.name),security,{maxPages});
}

/** Each cron minute refreshes at most two links that have not been read for 15 minutes. */
export async function pollCalendarLinks(db:D1Database,security:SourceSecurity,fetcher:FeedFetch=fetch){
 const due=new Date(Date.now()-REFRESH_MINUTES*60000).toISOString();
 const sources=(await db.prepare(`SELECT id FROM capture_sources WHERE adapter='ical' AND state='connected' AND EXISTS(SELECT 1 FROM capture_credentials WHERE source_id=capture_sources.id) AND (last_success_at IS NULL OR last_success_at<?) AND (last_error_at IS NULL OR last_error_at<?) ORDER BY coalesce(last_success_at,''),id LIMIT 2`).bind(due,due).all<{id:string}>()).results;
 for(const source of sources){try{await syncCalendarLink(db,source.id,security,fetcher,2);}catch{/* The source records provider failures; contention waits for the next minute. */}}
}
