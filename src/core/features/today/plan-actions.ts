import {meetingRow} from '../zoom/repository';
import {ManualRepository} from '../records/manual';
import {writeHandoff} from '../delegation/effects';
import {snapshot} from '../delegation/evidence';
import {random} from '../delegation/protocol';
import {TodayError} from './errors';
import {buildMeetingPlan,meetingContext,planNote} from './meeting-plan';

/** Saves the agenda and prep notes as one RECORD-010 note on the meeting's record; nothing is sent. */
export async function savePlan(db:D1Database,signalId:string,input:{agenda:string;prep:string},actor:string){
 if((await meetingRow(db,signalId))?.state==='cancelled')throw new TodayError(409,'This Zoom meeting was cancelled. Its preparation is stopped.');
 const context=await meetingContext(db,signalId),existing=await planNote(db,signalId,context.noteTarget);
 const text=[`Meeting plan: ${context.signal.subject??'Meeting'}`,'',`Agenda`,input.agenda.trim()||'None','',`Prep notes`,input.prep.trim()||'None'].join('\n');
 const saved=await new ManualRepository(db).save(context.noteTarget.type,context.noteTarget.id,{kind:'note',text,occurredAt:new Date().toISOString()},actor,existing?.entryId,{meetingSignalId:signalId,agenda:input.agenda,prep:input.prep});
 return {entryId:saved.id};
}

/** Turns one cited plan line into an internal next action (a handoff task) on the meeting's opportunity. */
export async function planAction(db:D1Database,signalId:string,input:{title:string;dueAt:string|null;evidenceId:string},actor:string){
 const plan=await buildMeetingPlan(db,signalId,{operatorId:actor});
 if(plan.meeting.status==='cancelled')throw new TodayError(409,'This meeting was cancelled. Its follow-up is stopped.');
 if(!plan.primaryOpportunityId)throw new TodayError(409,'Link this meeting to an opportunity before adding a next action.');
 const cited=new Set([plan.meeting.signalId,...plan.interactions.map(line=>line.evidence.id),...plan.promises.map(line=>line.evidence.id)]);
 if(!cited.has(input.evidenceId))throw new TodayError(400,'A next action must cite a line of this plan.');
 const target=`opportunities/${plan.primaryOpportunityId}/handoffs/${random().slice(0,32)}`,before=await snapshot(db,target,true);
 const written=await writeHandoff(db,{operationKey:random().slice(0,64),operation:'orbit.handoff.upsert',target,expectedRevision:before.revision,expectedAudienceRevision:before.audience.audienceRevision,
  content:{title:input.title,description:`From the meeting plan for ${plan.meeting.subject}`,assigneeId:actor,dueAt:input.dueAt,status:'open',evidence:[input.evidenceId]}},{actor});
 if(plan.zoom)await db.prepare('INSERT INTO zoom_plan_actions(signal_id,handoff_id) VALUES(?,?)').bind(signalId,target.split('/')[3]).run();
 return written;
}
