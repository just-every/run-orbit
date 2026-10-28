import {createId} from '../../shared/ids';
import type {WorkflowContext,WorkflowRecordPlan} from './record-types';
export function workflowOwnerNotice(context:WorkflowContext,plan:WorkflowRecordPlan,at:string){
 if(plan.recordType!=='opportunity'||plan.field!=='owner_id'||plan.before===plan.after||!plan.after||plan.after===context.actorId)return [];
 return [context.db.prepare(`INSERT OR IGNORE INTO notifications(id,operator_id,opportunity_id,event_key,kind,message,created_at)
 SELECT ?,p.id,?,?,'record.assigned',?||COALESCE((SELECT display_name FROM operators WHERE id=?),'Unassigned'),? FROM operators p WHERE p.id=? AND p.status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=p.id)`)
 .bind(createId(),plan.recordId,`workflow-owner:${plan.id}`,`Assigned by workflow ${context.workflowName}, version ${context.version}; previous owner: `,plan.before??null,at,plan.after)];
}
