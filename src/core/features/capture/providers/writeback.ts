import {calendarInvitePrivacy} from './writeback-privacy';
import {CaptureError} from '../contracts';
import {Hono} from 'hono';
import {z} from 'zod';
import type {AuthenticatedOperator} from '../../identity';
import {actorFence,guard,clearGuards,version} from '../../identity/store';
import {createId} from '../../../shared/ids';
import {payloadHash,type SourceSecurity} from '../../../platform/source-security';
import {audit,RecordError,requireRecord} from '../../records/shared';
import {leaseSource,activeLease} from './session';
import {readProviderSource} from './service';
import {writeScopes,type Credential,type ProviderFetch} from './config';
import {providerNetworkFetch} from './config';
import {recurrenceSchema,calendarOccurrences,providerRecurrence,calendarOccurrence} from './writeback-recurrence';
import {taskLocalInput} from '../../tasks/time';
import {capturedMeetings} from './writeback-captured';
import {calendarEventUrl as eventUrl,requireCalendarOrganizer,calendarMeeting} from './writeback-event';
const id=z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
const meeting=z.object({title:z.string().trim().min(1).max(200),message:z.string().trim().min(1).max(10000),start:z.iso.datetime({offset:true}),end:z.iso.datetime({offset:true}),attendees:z.array(z.email()).min(1).max(50),recurrence:recurrenceSchema.optional()}).strict().refine(m=>Date.parse(m.end)>Date.parse(m.start),'End must follow start.');
const inputSchema=z.object({sourceId:z.string().min(1).max(100),calendarId:z.string().min(1).max(512),recordType:z.enum(['contact','opportunity']),recordId:id,contactId:id,writebackId:id.optional(),occurrenceStart:z.iso.datetime({offset:true}).optional(),operation:z.enum(['create','reschedule','cancel']),meeting}).strict();
type Input=z.infer<typeof inputSchema>;
type Row={captured?:boolean;updated_at:string;id:string;source_id:string;connection_id:string;calendar_id:string;provider_event_id:string|null;record_type:'contact'|'opportunity';record_id:string;contact_id:string;entry_id:string|null;state:string;payload_json:string;etag:string|null};
export function calendarWritebackRoutes(db:D1Database,config:{security?:SourceSecurity;fetcher?:ProviderFetch}){
 const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>(),fetcher=config.fetcher??providerNetworkFetch;
 app.onError((e,c)=>e instanceof z.ZodError?c.json({error:'Review a valid meeting, exact attendee addresses and bounded recurrence.'},400):c.json({error:e instanceof RecordError||e instanceof CaptureError?e.message:'Calendar writeback failed. No automatic retry is made.'},e instanceof RecordError||e instanceof CaptureError?e.status:503));
 const security=()=>{if(!config.security)throw new RecordError(409,'Calendar credentials are not configured.');return config.security;};
 async function credential(sourceId:string){const row=await db.prepare('SELECT ciphertext FROM capture_credentials WHERE source_id=?').bind(sourceId).first<{ciphertext:string}>();if(!row)throw new RecordError(409,'Reconnect this calendar.');return JSON.parse(await security().open(row.ciphertext)) as Credential;}
 async function inspect(input:Input){
  const privacyFence=await calendarInvitePrivacy(db,input.meeting.attendees);
  const source=await readProviderSource(db,input.sourceId),scope=JSON.parse(source.scope_json),token=await credential(source.id);
  if(!token.writebackConsent||!token.scope.split(/\s+/).some(value=>value===writeScopes[source.adapter]||source.adapter==='microsoft'&&value==='https://graph.microsoft.com/'+writeScopes.microsoft))throw new RecordError(409,'Calendar writeback needs separate consent. Reconnect and opt in.');
  if(token.expiresAt<Date.now()+60000)throw new RecordError(409,'Refresh this calendar connection in Capture before reviewing writeback.');
  if(!scope.calendars?.includes(input.calendarId))throw new RecordError(409,'Choose a calendar selected in Capture.');
  await requireRecord(db,input.recordType,input.recordId);const contact=await requireRecord(db,'contact',input.contactId);
  if(contact.contactability!=='contactable'||!contact.email||!input.meeting.attendees.includes(contact.email))throw new RecordError(409,'Review a contactable customer with their exact current email among the attendees.');
  if(input.recordType==='contact'?input.recordId!==input.contactId:!await db.prepare('SELECT 1 FROM opportunity_contacts WHERE opportunity_id=? AND contact_id=?').bind(input.recordId,input.contactId).first())throw new RecordError(409,'Choose a contact linked to this record.');
  const accessUrl=source.adapter==='google'?`https://www.googleapis.com/calendar/v3/users/me/calendarList/${encodeURIComponent(input.calendarId)}`:`https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(input.calendarId)}`;
  const access=await fetcher(accessUrl,{method:'GET',redirect:'error',headers:{Authorization:`Bearer ${token.accessToken}`},signal:AbortSignal.timeout(20000)});
  if(access.status===401||access.status===403){await db.prepare("UPDATE capture_sources SET state='error',last_error='Calendar access was revoked. Reconnect with separate write consent.' WHERE id=? AND connection_id=?").bind(source.id,source.connection_id).run();throw new RecordError(409,'Calendar access was revoked. Reconnect with separate write consent. No invitation was sent.');}
  if(!access.ok)throw new RecordError(409,'Calendar setup is unresolved. No invitation was sent.');
  const calendarAccess=await access.json() as any;
  if(source.adapter==='google'&&calendarAccess.accessRole!=='owner')throw new RecordError(409,'Only the connected calendar owner and organizer can send changes. No invitation was sent.');
  let row:Row|null=null,current:any=null;
  if(input.meeting.recurrence)calendarOccurrences(input.meeting);
  let series:any=null,occurrenceRow:Row|null=null;
  if(input.operation!=='create'){
   if(!input.writebackId)throw new RecordError(400,'Choose the meeting to change.');row=await db.prepare('SELECT * FROM calendar_writebacks WHERE id=?').bind(input.writebackId).first<Row>()??(await capturedMeetings(db,input.recordType,input.recordId)).find(r=>r.id===input.writebackId) as Row|undefined??null;
   const capturedLink=row&&JSON.parse(row.payload_json).capturedItemId&&await db.prepare('SELECT 1 FROM timeline_entry_records WHERE timeline_entry_id=? AND record_type=? AND record_id=?').bind(row.entry_id,input.recordType,input.recordId).first();
   if(!row||row.source_id!==source.id||row.calendar_id!==input.calendarId||(!capturedLink&&(row.record_type!==input.recordType||row.record_id!==input.recordId))||row.contact_id!==input.contactId||!row.provider_event_id||!['written','conflict'].includes(row.state))throw new RecordError(409,'This meeting cannot be changed. Review its connection and outcome.');
   const response=await fetcher(eventUrl(source.adapter,input.calendarId,row.provider_event_id),{method:'GET',redirect:'error',headers:{Authorization:`Bearer ${token.accessToken}`},signal:AbortSignal.timeout(20000)});
   if(response.status===401||response.status===403){await db.prepare("UPDATE capture_sources SET state='error',last_error='Calendar access was revoked. Reconnect with separate write consent.' WHERE id=? AND connection_id=?").bind(source.id,source.connection_id).run();throw new RecordError(409,'Calendar access was revoked. Reconnect with separate write consent. No invitation was sent.');}
   if(!response.ok)throw new RecordError(409,'The provider meeting is unavailable. Reconcile it before sending another invitation.');current=await response.json();requireCalendarOrganizer(source.adapter,current);
   if(input.occurrenceStart){
    series=current;const saved=JSON.parse(row.payload_json);
    if(!saved.recurrence||!calendarOccurrences(saved).some(o=>Date.parse(o.start)===Date.parse(input.occurrenceStart!)))throw new RecordError(409,'Choose an occurrence from the reviewed series.');
    current=await calendarOccurrence(source.adapter,fetcher,token.accessToken,input.calendarId,row.provider_event_id,input.occurrenceStart);requireCalendarOrganizer(source.adapter,current);
    occurrenceRow=await db.prepare('SELECT * FROM calendar_writebacks WHERE source_id=? AND calendar_id=? AND provider_event_id=?').bind(source.id,input.calendarId,current.id).first<Row>();
    if(occurrenceRow&&(occurrenceRow.record_type!==input.recordType||occurrenceRow.record_id!==input.recordId||occurrenceRow.contact_id!==input.contactId||!['written','conflict'].includes(occurrenceRow.state)))throw new RecordError(409,'This occurrence is cancelled, belongs to another record or has an unresolved attempt.');
   }else if(JSON.parse(row.payload_json).recurrence)throw new RecordError(409,'Choose one exact occurrence. Series-wide edits and cancellation are not allowed.');
   if(input.meeting.recurrence)throw new RecordError(400,'An occurrence change cannot replace the series recurrence.');
   const saved=JSON.parse(row.payload_json);
   const parentSeries=saved.seriesId??current.recurringEventId??current.seriesMasterId;
   if(!series&&parentSeries){const master=await fetcher(eventUrl(source.adapter,input.calendarId,parentSeries),{method:'GET',redirect:'error',headers:{Authorization:`Bearer ${token.accessToken}`},signal:AbortSignal.timeout(20000)});if(!master.ok)throw new RecordError(409,'The series is unavailable. Review the calendar before editing its exception.');series=await master.json();requireCalendarOrganizer(source.adapter,series);}
   const people=calendarMeeting(source.adapter,current).attendees;
   if(JSON.stringify([...people].sort())!==JSON.stringify([...input.meeting.attendees].sort()))throw new RecordError(409,'Provider attendees changed. Sync this calendar in Capture, then reload the meeting and review its exact attendees.');
   const etag=(input.occurrenceStart?null:response.headers.get('etag'))??current.etag??current['@odata.etag'];if(typeof etag!=='string'||!etag)throw new RecordError(409,'The provider supplied no revision. No calendar change is allowed.');
   current={etag,details:current,series};
  }else if(input.occurrenceStart)throw new RecordError(400,'A new series cannot name an existing occurrence.');else if(input.writebackId)throw new RecordError(400,'A new meeting must not name an existing writeback.');
  const reviewHash=await payloadHash(JSON.stringify({input,connection:source.connection_id,contact:[contact.email,contact.updated_at,contact.contactability],current,row:row?[row.updated_at,row.state,row.payload_json]:null,occurrenceRow:occurrenceRow?[occurrenceRow.updated_at,occurrenceRow.state,occurrenceRow.payload_json]:null}));
  return {source,token,row,current,reviewHash,contact,privacyFence,occurrenceRow,occurrences:calendarOccurrences(input.meeting)};
 }
 app.get('/',async c=>{const sources=(await db.prepare("SELECT id,name,adapter,state,last_error,scope_json FROM capture_sources WHERE adapter IN('google','microsoft')").all<any>()).results,options=[];for(const source of sources){const token=['connected','syncing'].includes(source.state)?await credential(source.id):null;options.push({id:source.id,name:source.name,provider:source.adapter,consented:token?.writebackConsent===true,state:source.state,error:source.last_error,calendars:JSON.parse(source.scope_json).calendars??[]});}return c.json({sources:options});});
 app.get('/records/:kind/:id',async c=>{
  const kind=z.enum(['contact','opportunity']).parse(c.req.param('kind')),record=id.parse(c.req.param('id'));
  const stored=(await db.prepare(`SELECT id,source_id,calendar_id,contact_id,state,payload_json,error FROM calendar_writebacks w WHERE (record_type=? AND record_id=?) OR (json_extract(payload_json,'$.capturedItemId') IS NOT NULL AND EXISTS(SELECT 1 FROM timeline_entry_records r WHERE r.timeline_entry_id=w.entry_id AND r.record_type=? AND r.record_id=?)) ORDER BY updated_at DESC`).bind(kind,record,kind,record).all()).results;
  return c.json({meetings:stored.concat(await capturedMeetings(db,kind,record)).map((row:any)=>({...row,occurrences:JSON.parse(row.payload_json).recurrence?calendarOccurrences(JSON.parse(row.payload_json)):[]}))});
 });
 app.post('/preview',async c=>{const input=inputSchema.parse(await c.req.json()),review=await inspect(input);return c.json({input,occurrences:review.occurrences,reviewHash:review.reviewHash,providerEvent:review.current?calendarMeeting(review.source.adapter,review.current.details):null,warning:review.row?.state==='conflict'?'Provider edits conflict with the last Orbit version. Review every attendee and message again.':null});});
 app.post('/confirm',async c=>{
  const body=z.object({input:inputSchema,reviewHash:z.string().regex(/^[a-f0-9]{64}$/),operationKey:id,confirmed:z.literal(true)}).strict().parse(await c.req.json()),input=body.input,lease=await leaseSource(db,input.sourceId);
  try{
   const review=await inspect(input);await activeLease(db,review.source,lease);
   if(review.reviewHash!==body.reviewHash)throw new RecordError(409,'Meeting or provider details changed. Review the exact invitation again.');
   const actor=c.get('operator'),authority=await db.prepare(`SELECT ${version('o')} AS version FROM operators o WHERE id=?`).bind(actor.operatorId).first<{version:number}>();if(!authority)throw new RecordError(403,'Operator access ended.');
   const now=new Date().toISOString(),exception=Boolean(input.occurrenceStart),target=exception?review.occurrenceRow?.id??body.operationKey:review.row?.id??body.operationKey,providerEventId=exception?review.current.details.id:review.row?.provider_event_id??null;
   const writingRow=exception?review.occurrenceRow:review.row,metadata=exception?{seriesId:review.row!.provider_event_id,occurrenceStart:input.occurrenceStart}:review.row?Object.fromEntries(Object.entries(JSON.parse(review.row.payload_json)).filter(([key])=>['seriesId','occurrenceStart','capturedItemId'].includes(key))):{};
   if(exception&&await db.prepare("SELECT 1 FROM calendar_writebacks WHERE source_id=? AND calendar_id=? AND provider_event_id=? AND state IN('attempted','uncertain','cancelled')").bind(input.sourceId,input.calendarId,providerEventId).first())throw new RecordError(409,'This occurrence is cancelled or has an unresolved attempt. Reconcile before a fresh review.');
   if(await db.prepare('SELECT 1 FROM calendar_writeback_attempts WHERE id=?').bind(body.operationKey).first())throw new RecordError(409,'This calendar command was already attempted. Check its outcome.');
   // The command receipt precedes the external attempt and is never retried.
   await db.batch([guard(db,review.privacyFence),guard(db,actorFence({id:actor.sessionId,operator:{id:actor.operatorId,version:authority.version}},Date.now())),guard(db,{sql:"EXISTS(SELECT 1 FROM contacts WHERE id=? AND email=? AND updated_at=? AND contactability='contactable') AND EXISTS(SELECT 1 FROM capture_sources WHERE id=? AND connection_id=? AND state IN('connected','syncing')) AND EXISTS(SELECT 1 FROM capture_locks WHERE source_id=? AND lease=? AND expires_at>?)",args:[input.contactId,review.contact.email,review.contact.updated_at,input.sourceId,review.source.connection_id,input.sourceId,lease,Date.now()]}),...(review.row?.captured?[guard(db,{sql:'EXISTS(SELECT 1 FROM capture_items i JOIN timeline_entry_records r ON r.timeline_entry_id=i.signal_id WHERE i.id=? AND i.signal_id=? AND r.record_type=? AND r.record_id=?)',args:[review.row.id,review.row.entry_id,input.recordType,input.recordId]})]:[]),...(review.row&&!review.row.captured?[guard(db,{sql:'EXISTS(SELECT 1 FROM calendar_writebacks WHERE id=? AND updated_at=? AND state=? AND payload_json=?)',args:[review.row.id,review.row.updated_at,review.row.state,review.row.payload_json]})]:[]),db.prepare('INSERT INTO calendar_writeback_attempts VALUES(?,?,?)').bind(body.operationKey,target,now),...(review.occurrenceRow?[guard(db,{sql:'EXISTS(SELECT 1 FROM calendar_writebacks WHERE id=? AND updated_at=? AND state=? AND payload_json=?)',args:[review.occurrenceRow.id,review.occurrenceRow.updated_at,review.occurrenceRow.state,review.occurrenceRow.payload_json]})]:[]),...(writingRow&&!writingRow.captured?[db.prepare("UPDATE calendar_writebacks SET state='attempted',connection_id=?,updated_at=? WHERE id=?").bind(review.source.connection_id,now,target)]:[db.prepare("INSERT INTO calendar_writebacks VALUES(?,?,?,?,?,?,?,?,?,'attempted',?,NULL,NULL,?)").bind(target,input.sourceId,review.source.connection_id,input.calendarId,providerEventId,input.recordType,input.recordId,input.contactId,writingRow?.entry_id??null,JSON.stringify({...input.meeting,...metadata}),now)]),audit(db,actor.operatorId,'calendar.write-attempted',input.recordType,input.recordId,{operation:input.operation,writebackId:target}),clearGuards(db)]);
   const m=input.meeting,google=review.source.adapter==='google',zone=m.recurrence?.timeZone??'UTC';
   const payload=google?{summary:m.title,description:m.message,start:{dateTime:m.start,...(m.recurrence?{timeZone:zone}:{})},end:{dateTime:m.end,...(m.recurrence?{timeZone:zone}:{})},attendees:m.attendees.map(email=>({email})),...providerRecurrence('google',m)}:{subject:m.title,body:{contentType:'text',content:m.message},start:{dateTime:taskLocalInput(m.start,zone),timeZone:zone},end:{dateTime:taskLocalInput(m.end,zone),timeZone:zone},attendees:m.attendees.map(address=>({emailAddress:{address},type:'required'})),...providerRecurrence('microsoft',m)};
   const cancel=input.operation==='cancel',url=eventUrl(review.source.adapter,input.calendarId,providerEventId??undefined)+(google?'?sendUpdates=all':cancel?'/cancel':''),method=cancel?(google?'DELETE':'POST'):review.row?'PATCH':'POST';
   let response:Response;
   try{response=await fetcher(url,{method,redirect:'error',headers:{Authorization:`Bearer ${review.token.accessToken}`,'Content-Type':'application/json',...(review.current?{'If-Match':review.current.etag}:{})},...(!cancel||!google?{body:JSON.stringify(cancel?{comment:m.message}:payload)}:{}),signal:AbortSignal.timeout(20000)});}catch{await uncertain(target,'Provider outcome is unknown. Check the calendar before any new attempt.');throw new RecordError(409,'Calendar outcome is unknown. Check the provider; Orbit will not retry.');}
   if(response.status===412){await db.prepare("UPDATE calendar_writebacks SET state='conflict',error='Provider changed after review',updated_at=? WHERE id=?").bind(new Date().toISOString(),target).run();throw new RecordError(409,'The provider event changed. Review its edits before trying again.');}
   if(response.status===401||response.status===403)await db.prepare("UPDATE capture_sources SET state='error',last_error='Calendar access was revoked. Reconnect with separate write consent.' WHERE id=? AND connection_id=?").bind(review.source.id,review.source.connection_id).run();
   if(!response.ok){await uncertain(target,`Provider HTTP ${response.status}; reconcile before any new attempt.`);throw new RecordError(409,'The provider did not confirm the calendar change. Check its outcome.');}
   let result:any={};try{if(!cancel)result=await response.json();}catch{await uncertain(target,'Provider returned an unreadable receipt. Reconcile before any new attempt.');throw new RecordError(409,'The provider receipt is unreadable. Orbit will not retry.');}
   const eventId=providerEventId??result.id,etag=response.headers.get('etag')??result.etag??result['@odata.etag']??null;
   if(!cancel&&(typeof eventId!=='string'||!eventId||!etag)){await uncertain(target,'Provider returned no event identity or revision.');throw new RecordError(409,'The provider returned an incomplete receipt. Check the calendar.');}
   await activeLease(db,review.source,lease);
   const entry=writingRow?.entry_id??createId(),text=cancel?`Meeting cancelled: ${m.title}`:`Meeting: ${m.title}\n${m.message}`,entryPayload=JSON.stringify({text,subject:m.title,durationMinutes:(Date.parse(m.end)-Date.parse(m.start))/60000,contactIds:[input.contactId],calendarWritebackId:target,attendees:m.attendees,start:m.start,end:m.end,cancelled:cancel});
   await db.batch([db.prepare("INSERT INTO timeline_entries VALUES(?,'manual.meeting',?,?,'operator',?,'calendar-writeback',?) ON CONFLICT(id) DO UPDATE SET occurred_at=excluded.occurred_at,payload_json=json_patch(timeline_entries.payload_json,excluded.payload_json)").bind(entry,m.start,now,actor.operatorId,entryPayload),db.prepare('INSERT OR IGNORE INTO timeline_entry_records VALUES(?,?,?)').bind(entry,input.recordType,input.recordId),db.prepare('UPDATE calendar_writebacks SET provider_event_id=?,entry_id=?,state=?,payload_json=?,etag=?,error=NULL,updated_at=? WHERE id=?').bind(eventId??null,entry,cancel?'cancelled':'written',JSON.stringify({...m,...metadata}),etag,new Date().toISOString(),target)]);
   return c.json({id:target,state:cancel?'cancelled':'written'},201);
  }finally{await db.prepare('DELETE FROM capture_locks WHERE source_id=? AND lease=?').bind(input.sourceId,lease).run();}
 });
 async function uncertain(id:string,message:string){await db.prepare("UPDATE calendar_writebacks SET state='uncertain',error=?,updated_at=? WHERE id=?").bind(message,new Date().toISOString(),id).run();}
 return app;
}
