import {Hono} from 'hono';
import {CaptureError} from '../contracts';
import {meetingActivity} from './writeback-details';
import {z} from 'zod';
import type {AuthenticatedOperator} from '../../identity';
import {actorFence,guard,clearGuards,version} from '../../identity/store';
import {createId} from '../../../shared/ids';
import {payloadHash,type SourceSecurity} from '../../../platform/source-security';
import {audit,RecordError,requireRecord} from '../../records/shared';
import {leaseSource,activeLease} from './session';
import {readProviderSource} from './service';
import {writeScopes,encodeId,type Credential,type ProviderFetch} from './config';
const id=z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
const meeting=z.object({title:z.string().trim().min(1).max(200),message:z.string().trim().min(1).max(10000),start:z.iso.datetime({offset:true}),end:z.iso.datetime({offset:true}),attendees:z.array(z.email()).min(1).max(50)}).strict().refine(m=>Date.parse(m.end)>Date.parse(m.start),'End must follow start.');
const inputSchema=z.object({sourceId:z.string().min(1).max(100),calendarId:z.string().min(1).max(512),recordType:z.enum(['contact','opportunity']),recordId:id,contactId:id,writebackId:id.optional(),operation:z.enum(['create','reschedule','cancel']),meeting}).strict();
type Input=z.infer<typeof inputSchema>;
type Row={updated_at:string;id:string;source_id:string;connection_id:string;calendar_id:string;provider_event_id:string|null;record_type:'contact'|'opportunity';record_id:string;contact_id:string;entry_id:string|null;state:string;payload_json:string;etag:string|null};
export function calendarWritebackRoutes(db:D1Database,config:{security?:SourceSecurity;fetcher?:ProviderFetch}){
 const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>(),fetcher=config.fetcher??fetch;
 app.onError((e,c)=>c.json({error:e instanceof RecordError||e instanceof CaptureError?e.message:'Calendar writeback failed. No automatic retry is made.'},e instanceof RecordError||e instanceof CaptureError?e.status:503));
 const security=()=>{if(!config.security)throw new RecordError(409,'Calendar credentials are not configured.');return config.security;};
 async function credential(sourceId:string){const row=await db.prepare('SELECT ciphertext FROM capture_credentials WHERE source_id=?').bind(sourceId).first<{ciphertext:string}>();if(!row)throw new RecordError(409,'Reconnect this calendar.');return JSON.parse(await security().open(row.ciphertext)) as Credential;}
 const eventUrl=(adapter:string,calendar:string,event?:string)=>adapter==='google'?`https://www.googleapis.com/calendar/v3/calendars/${encodeId(calendar)}/events${event?'/'+encodeId(event):''}`:`https://graph.microsoft.com/v1.0/me/calendars/${encodeId(calendar)}/events${event?'/'+encodeId(event):''}`;
 async function inspect(input:Input){
  const source=await readProviderSource(db,input.sourceId),scope=JSON.parse(source.scope_json),token=await credential(source.id);
  if(!token.writebackConsent||!token.scope.split(/\s+/).some(value=>value===writeScopes[source.adapter]||source.adapter==='microsoft'&&value==='https://graph.microsoft.com/'+writeScopes.microsoft))throw new RecordError(409,'Calendar writeback needs separate consent. Reconnect and opt in.');
  if(token.expiresAt<Date.now()+60000)throw new RecordError(409,'Refresh this calendar connection in Capture before reviewing writeback.');
  if(!scope.calendars?.includes(input.calendarId))throw new RecordError(409,'Choose a calendar selected in Capture.');
  await requireRecord(db,input.recordType,input.recordId);const contact=await requireRecord(db,'contact',input.contactId);
  if(contact.contactability!=='contactable'||!contact.email||!input.meeting.attendees.includes(contact.email))throw new RecordError(409,'Review a contactable customer with their exact current email among the attendees.');
  if(input.recordType==='contact'?input.recordId!==input.contactId:!await db.prepare('SELECT 1 FROM opportunity_contacts WHERE opportunity_id=? AND contact_id=?').bind(input.recordId,input.contactId).first())throw new RecordError(409,'Choose a contact linked to this record.');
  let row:Row|null=null,current:any=null;
  if(input.operation!=='create'){
   if(!input.writebackId)throw new RecordError(400,'Choose the meeting to change.');row=await db.prepare('SELECT * FROM calendar_writebacks WHERE id=?').bind(input.writebackId).first<Row>();
   if(!row||row.source_id!==source.id||row.connection_id!==source.connection_id||row.calendar_id!==input.calendarId||row.record_type!==input.recordType||row.record_id!==input.recordId||row.contact_id!==input.contactId||!row.provider_event_id||!['written','conflict'].includes(row.state))throw new RecordError(409,'This meeting cannot be changed. Review its connection and outcome.');
   const response=await fetcher(eventUrl(source.adapter,input.calendarId,row.provider_event_id),{method:'GET',redirect:'error',headers:{Authorization:`Bearer ${token.accessToken}`},signal:AbortSignal.timeout(20000)});
   if(!response.ok)throw new RecordError(409,'The provider meeting is unavailable. Reconcile it before sending another invitation.');current=await response.json();
   const etag=response.headers.get('etag')??current.etag??current['@odata.etag'];if(typeof etag!=='string'||!etag)throw new RecordError(409,'The provider supplied no revision. No calendar change is allowed.');
   current={etag,details:current};
  }else if(input.writebackId)throw new RecordError(400,'A new meeting must not name an existing writeback.');
  const reviewHash=await payloadHash(JSON.stringify({input,connection:source.connection_id,contact:[contact.email,contact.updated_at,contact.contactability],current,row:row?[row.updated_at,row.state,row.payload_json]:null}));
  return {source,token,row,current,reviewHash,contact};
 }
 app.get('/',async c=>{const sources=(await db.prepare("SELECT id,name,adapter,scope_json FROM capture_sources WHERE adapter IN('google','microsoft') AND state IN('connected','syncing')").all<any>()).results,options=[];for(const source of sources){const token=await credential(source.id);options.push({id:source.id,name:source.name,provider:source.adapter,consented:token.writebackConsent===true,calendars:JSON.parse(source.scope_json).calendars??[]});}return c.json({sources:options});});
 app.get('/records/:kind/:id',async c=>{const kind=z.enum(['contact','opportunity']).parse(c.req.param('kind')),record=id.parse(c.req.param('id'));return c.json({meetings:(await db.prepare('SELECT w.id,w.source_id,w.calendar_id,w.contact_id,w.state,w.payload_json,w.error,json_extract(t.payload_json,'$.originalMeeting') AS original_json,json_extract(t.payload_json,'$.provider') AS provider_json FROM calendar_writebacks w LEFT JOIN timeline_entries t ON t.id=w.entry_id WHERE w.record_type=? AND w.record_id=? ORDER BY w.updated_at DESC').bind(kind,record).all()).results});});
 app.post('/preview',async c=>{const input=inputSchema.parse(await c.req.json()),review=await inspect(input);return c.json({input,reviewHash:review.reviewHash,providerEvent:review.current?.details??null,warning:review.row?.state==='conflict'?'Provider edits conflict with the last Orbit version. Review every attendee and message again.':null});});
 app.post('/confirm',async c=>{
  const body=z.object({input:inputSchema,reviewHash:z.string().regex(/^[a-f0-9]{64}$/),operationKey:id,confirmed:z.literal(true)}).strict().parse(await c.req.json()),input=body.input,lease=await leaseSource(db,input.sourceId);
  try{
   const review=await inspect(input);await activeLease(db,review.source,lease);
   if(review.reviewHash!==body.reviewHash)throw new RecordError(409,'Meeting or provider details changed. Review the exact invitation again.');
   const actor=c.get('operator'),authority=await db.prepare(`SELECT ${version('o')} AS version FROM operators o WHERE id=?`).bind(actor.operatorId).first<{version:number}>();if(!authority)throw new RecordError(403,'Operator access ended.');
   const now=new Date().toISOString(),target=review.row?.id??body.operationKey;
   if(await db.prepare('SELECT 1 FROM calendar_writeback_attempts WHERE id=?').bind(body.operationKey).first())throw new RecordError(409,'This calendar command was already attempted. Check its outcome.');
   // The command receipt precedes the external attempt and is never retried.
   await db.batch([guard(db,actorFence({id:actor.sessionId,operator:{id:actor.operatorId,version:authority.version}},Date.now())),guard(db,{sql:"EXISTS(SELECT 1 FROM contacts WHERE id=? AND email=? AND updated_at=? AND contactability='contactable') AND EXISTS(SELECT 1 FROM capture_sources WHERE id=? AND connection_id=? AND state IN('connected','syncing')) AND EXISTS(SELECT 1 FROM capture_locks WHERE source_id=? AND lease=? AND expires_at>?)",args:[input.contactId,review.contact.email,review.contact.updated_at,input.sourceId,review.source.connection_id,input.sourceId,lease,Date.now()]}),...(review.row?[guard(db,{sql:'EXISTS(SELECT 1 FROM calendar_writebacks WHERE id=? AND updated_at=? AND state=? AND payload_json=?)',args:[review.row.id,review.row.updated_at,review.row.state,review.row.payload_json]})]:[]),db.prepare('INSERT INTO calendar_writeback_attempts VALUES(?,?,?)').bind(body.operationKey,target,now),...(review.row?[db.prepare("UPDATE calendar_writebacks SET state='attempted',updated_at=? WHERE id=?").bind(now,target)]:[db.prepare("INSERT INTO calendar_writebacks VALUES(?,?,?,?,NULL,?,?,?,NULL,'attempted',?,NULL,NULL,?)").bind(target,input.sourceId,review.source.connection_id,input.calendarId,input.recordType,input.recordId,input.contactId,JSON.stringify(input.meeting),now)]),audit(db,actor.operatorId,'calendar.write-attempted',input.recordType,input.recordId,{operation:input.operation,writebackId:target}),clearGuards(db)]);
   const m=input.meeting,google=review.source.adapter==='google',payload=google?{summary:m.title,description:m.message,start:{dateTime:m.start},end:{dateTime:m.end},attendees:m.attendees.map(email=>({email}))}:{subject:m.title,body:{contentType:'text',content:m.message},start:{dateTime:m.start,timeZone:'UTC'},end:{dateTime:m.end,timeZone:'UTC'},attendees:m.attendees.map(address=>({emailAddress:{address},type:'required'}))};
   const cancel=input.operation==='cancel',url=eventUrl(review.source.adapter,input.calendarId,review.row?.provider_event_id??undefined)+(google?'?sendUpdates=all':cancel?'/cancel':''),method=cancel?(google?'DELETE':'POST'):review.row?'PATCH':'POST';
   let response:Response;
   try{response=await fetcher(url,{method,redirect:'error',headers:{Authorization:`Bearer ${review.token.accessToken}`,'Content-Type':'application/json',...(review.current?{'If-Match':review.current.etag}:{})},...(!cancel||!google?{body:JSON.stringify(cancel?{comment:m.message}:payload)}:{}),signal:AbortSignal.timeout(20000)});}catch{await uncertain(target,'Provider outcome is unknown. Check the calendar before any new attempt.');throw new RecordError(409,'Calendar outcome is unknown. Check the provider; Orbit will not retry.');}
   if(response.status===412){await db.prepare("UPDATE calendar_writebacks SET state='conflict',error='Provider changed after review',updated_at=? WHERE id=?").bind(new Date().toISOString(),target).run();throw new RecordError(409,'The provider event changed. Review its edits before trying again.');}
   if(!response.ok){await uncertain(target,`Provider HTTP ${response.status}; reconcile before any new attempt.`);throw new RecordError(409,'The provider did not confirm the calendar change. Check its outcome.');}
   const result=cancel?{}:await response.json() as any,eventId=review.row?.provider_event_id??result.id,etag=response.headers.get('etag')??result.etag??result['@odata.etag']??null;
   if(!cancel&&(typeof eventId!=='string'||!eventId||!etag)){await uncertain(target,'Provider returned no event identity or revision.');throw new RecordError(409,'The provider returned an incomplete receipt. Check the calendar.');}
   await activeLease(db,review.source,lease);
   const entry=review.row?.entry_id??createId(),previous=review.row?.entry_id?await db.prepare('SELECT payload_json FROM timeline_entries WHERE id=?').bind(entry).first<string>('payload_json'):null;
   const entryPayload=JSON.stringify(meetingActivity(m,input.contactId,target,{adapter:review.source.adapter,sourceId:input.sourceId,calendarId:input.calendarId,eventId:eventId??'',revision:etag,observedAt:now,observedBy:'operator'},previous?JSON.parse(previous):undefined,cancel));
   await db.batch([db.prepare("INSERT INTO timeline_entries VALUES(?,'manual.meeting',?,?,'operator',?,'calendar-writeback',?) ON CONFLICT(id) DO UPDATE SET occurred_at=excluded.occurred_at,payload_json=excluded.payload_json").bind(entry,m.start,now,actor.operatorId,entryPayload),db.prepare('INSERT OR IGNORE INTO timeline_entry_records VALUES(?,?,?)').bind(entry,input.recordType,input.recordId),db.prepare('UPDATE calendar_writebacks SET provider_event_id=?,entry_id=?,state=?,payload_json=?,etag=?,error=NULL,updated_at=? WHERE id=?').bind(eventId??null,entry,cancel?'cancelled':'written',JSON.stringify(m),etag,new Date().toISOString(),target)]);
   return c.json({id:target,state:cancel?'cancelled':'written'},201);
  }finally{await db.prepare('DELETE FROM capture_locks WHERE source_id=? AND lease=?').bind(input.sourceId,lease).run();}
 });
 async function uncertain(id:string,message:string){await db.prepare("UPDATE calendar_writebacks SET state='uncertain',error=?,updated_at=? WHERE id=?").bind(message,new Date().toISOString(),id).run();}
 return app;
}
