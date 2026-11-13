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
