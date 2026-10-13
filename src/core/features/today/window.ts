import {audit} from '../records/shared';

export interface BriefPolicy {timezone:string;staleIntervalDays:number;awaitingResponseWorkingDays:number}

export async function briefPolicy(db:D1Database):Promise<BriefPolicy>{
 const row=await db.prepare("SELECT timezone,stale_interval_days,awaiting_response_working_days FROM workspace_settings WHERE id='workspace'").first<{timezone:string;stale_interval_days:number;awaiting_response_working_days:number}>();
 if(!row)throw new Error('Workspace is not configured. Run rer setup.');
 return {timezone:row.timezone,staleIntervalDays:row.stale_interval_days,awaitingResponseWorkingDays:row.awaiting_response_working_days};
}

/** "Since you last looked": the latest brief an operator marked seen or, when they never have, the stale interval counted from the start of today (UTC), so the window holds still during the day. */
export async function briefWindow(db:D1Database,operatorId:string,now:Date,policy:BriefPolicy){
 const seen=await db.prepare("SELECT max(json_extract(details_json,'$.through')) AS through FROM audit_entries WHERE entity_type='operator' AND entity_id=? AND action='brief.seen'").bind(operatorId).first<{through:string|null}>();
 return seen?.through?{since:seen.through,basis:'seen' as const}:{since:new Date(Math.floor(now.getTime()/86400000)*86400000-policy.staleIntervalDays*86400000).toISOString(),basis:'stale-interval' as const};
}

/** Records that the operator has seen the brief generated at `through`; later arrivals stay new. */
export async function markSeen(db:D1Database,operatorId:string,through:string){
 await audit(db,operatorId,'brief.seen','operator',operatorId,{through}).run();
}
