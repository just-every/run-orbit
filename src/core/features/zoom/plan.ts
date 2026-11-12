import {entryHref,planHref} from '../today/links';
import {meetingRow,participantMatches} from './repository';
/** This is a recap of recorded facts, not a transcript summary or invented conversation. */
export async function zoomPlan(db:D1Database,signalId:string,note:{href:string}|null){
 const row=await meetingRow(db,signalId);if(!row)return null;
 const attendance=JSON.parse(row.attendance_json) as {email:string;joinedAt:string|null;leftAt:string|null}[];
 const matches=await participantMatches(db,attendance.map(person=>person.email));
 const recording=row.recording==='disabled'?'Recording disabled in Zoom.':row.recording==='permission-not-granted'?'Recording permission not granted.':'Recording permission held, unused by Orbit.';
 const href=entryHref({type:'opportunity',id:row.opportunity_id},row.completion_entry_id);
 return {meetingId:row.meeting_id,hostId:row.host_id,joinUrl:row.join_url,duration:row.duration,state:row.state,recording,transcript:'Transcript missing: Orbit has fetched no recording or transcript content.',
  attendanceState:row.attendance_state,attendance:attendance.map(person=>({...person,match:matches.find(match=>match.email===person.email)??{email:'',contactId:null,state:'not-supplied' as const}})),
  completedAt:row.completed_at,cancelledAt:row.cancelled_at,
  recap:row.state==='completed'&&row.completed_at?{summary:`Zoom reports this meeting ended at ${row.completed_at}. ${row.attendance_state==='available'?`${attendance.length} attendance records were read from Zoom.`:'Attendance is unresolved; no attendance is inferred.'} No discussion, decisions or transcript are inferred.`,citations:[{kind:'plan',label:note?'Saved meeting plan':'Meeting preparation',href:note?.href??planHref(signalId)},{kind:'attendance',label:'Recorded Zoom attendance',href:planHref(signalId)+'#zoom-attendance'},{kind:'completion',label:'Signed Zoom completion',href}],evidenceId:signalId}:null};
}
