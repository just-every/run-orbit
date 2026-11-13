import {entryHref,planHref} from '../today/links';
import type {RecordRef} from '../today/types';
import {contactEmailKey} from '../records/identity';
import {meetingRow,participantMatches} from './repository';
/** This is a recap of recorded facts, not a transcript summary or invented conversation. */
export async function zoomPlan(db:D1Database,signalId:string,note:{href:string}|null,allowed?:(ref:RecordRef)=>boolean){
 const row=await meetingRow(db,signalId);if(!row)return null;
 const recorded=JSON.parse(row.attendance_json) as {email:string;joinedAt:string|null;leftAt:string|null}[];
 const matches=await participantMatches(db,recorded.map(person=>person.email));
 // Unknown and ambiguous addresses confer no selected-contact authority, including in nested match fields.
 const attendance=recorded.map(person=>({...person,match:matches.find(match=>match.email===contactEmailKey(person.email))??{email:'',contactId:null,state:'not-supplied' as const}}))
  .filter(person=>!allowed||Boolean(person.match.contactId&&allowed({type:'contact',id:person.match.contactId})));
 const recording=row.recording==='disabled'?'Recording disabled in Zoom.':row.recording==='permission-not-granted'?'Recording permission not granted.':'Recording permission held, unused by Orbit.';
 const opportunity={type:'opportunity' as const,id:row.opportunity_id},href=!allowed||allowed(opportunity)?entryHref(opportunity,row.completion_entry_id):planHref(signalId);
 // A Zoom host id has no verified contact mapping, so it cannot be disclosed under a selected-record grant.
 return {meetingId:row.meeting_id,hostId:allowed?null:row.host_id,joinUrl:row.join_url,duration:row.duration,state:row.state,recording,transcript:'Transcript permission not requested. Transcript missing: Orbit has fetched no recording or transcript content.',
  attendanceState:row.attendance_state,attendance,
  completionDigest:row.completion_digest,completionTimestamp:row.completion_timestamp,completedAt:row.completed_at,cancelledAt:row.cancelled_at,
  recap:row.state==='completed'&&row.completed_at?{summary:`Zoom reports this meeting ended at ${row.completed_at}. ${row.attendance_state==='available'?`${attendance.length} attendance records were read from Zoom.`:'Attendance is unresolved; no attendance is inferred.'} No discussion, decisions or transcript are inferred.`,citations:[{kind:'plan',label:note?'Saved meeting plan':'Meeting preparation',href:note?.href??planHref(signalId)},{kind:'attendance',label:'Recorded Zoom attendance',href:planHref(signalId)+'#zoom-attendance'},{kind:'completion',label:'Signed Zoom completion',href}],evidenceId:signalId}:null};
}

/** Titles are evidence, not authority: compare the full attendance and identity set before narrowing it.
 * The returned projector can also guard embedded title echoes without changing the owner's source. */
export async function meetingTitleProjection(db:D1Database,signalId:string,allowed?:(ref:RecordRef)=>boolean){
 if(!allowed)return (title:string)=>title;
 const signal=await db.prepare("SELECT type,payload_json AS payload,occurred_at AS occurredAt FROM signals WHERE id=?").bind(signalId).first<{type:string;payload:string|null;occurredAt:string}>();
 if(!signal||!['meeting.booked','meeting.completed','meeting.cancelled'].includes(signal.type))return (title:string)=>title;
 const payload=JSON.parse(signal.payload??'{}') as {data?:{participants?:string[]}},row=await meetingRow(db,signalId);
 const recorded=row?JSON.parse(row.attendance_json) as {email:string;name?:string}[]:[];
 const people=[...(payload.data?.participants??[]).map(email=>({email,name:''})),...recorded],keys=[...new Set(people.map(person=>contactEmailKey(person.email)).filter((key):key is string=>Boolean(key)))];
 // Keep every candidate, including ambiguous matches and retained aliases, rather than only resolved attendees.
 const contacts=(await db.prepare(`SELECT c.id,c.name,c.email FROM contacts c WHERE c.email_key IN (SELECT value FROM json_each(?1))
  OR c.id IN (SELECT survivor_id FROM record_aliases WHERE record_type='contact' AND identity_key IN (SELECT value FROM json_each(?1)))
  OR c.id IN (SELECT record_id FROM signal_links WHERE signal_id=?2 AND record_type='contact')`).bind(JSON.stringify(keys),signalId).all<{id:string;name:string|null;email:string|null}>()).results;
 const matches=await participantMatches(db,keys),blocked:string[]=[];
 const identity=(value:string|null|undefined)=>{if(value?.trim())blocked.push(value.trim().toLowerCase());};
 const email=(value:string|null|undefined)=>{identity(value);identity(value?.split('@')[0]);};
 for(const person of contacts)if(!allowed({type:'contact',id:person.id})){identity(person.id);identity(person.name);email(person.email);}
 for(const person of people){
  const match=matches.find(match=>match.email===contactEmailKey(person.email));
  if(!match?.contactId||!allowed({type:'contact',id:match.contactId})){email(person.email);identity(person.name);}
 }
 const operators=(await db.prepare('SELECT id,email,display_name AS name FROM operators WHERE lower(trim(email)) IN (SELECT value FROM json_each(?))').bind(JSON.stringify(keys)).all<{id:string;email:string;name:string}>()).results;
 for(const person of operators){identity(person.id);identity(person.name);email(person.email);}
 const neutral=`${row?'Zoom meeting':'Meeting'} · ${signal.occurredAt}`;
 return (title:string)=>blocked.some(value=>title.toLowerCase().includes(value))?neutral:title;
}
