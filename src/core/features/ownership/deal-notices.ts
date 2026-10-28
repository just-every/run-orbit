import {createId} from '../../shared/ids';
/** An unchanged owner is no assignment; the notice shares the native save batch. */
export function dealAssignmentNotice(db:D1Database,id:string,owner:string,previous:string|null,actor:string,at:string){
 return db.prepare(`INSERT INTO notifications(id,operator_id,opportunity_id,event_key,kind,message,created_at)
  SELECT ?,receiver.id,o.id,?,'record.assigned','Assigned by '||a.display_name||': '||o.title||' (previous owner: '||COALESCE(p.display_name,'Unassigned')||')',?
  FROM opportunities o JOIN operators receiver ON receiver.id=o.owner_id JOIN operators a ON a.id=? LEFT JOIN operators p ON p.id=?
  WHERE o.id=? AND o.owner_id=? AND receiver.id<>? AND receiver.status='active'
  AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=receiver.id)`).bind(createId(),`deal-owner:${createId()}:${actor}:${previous??'unassigned'}`,at,actor,previous,id,owner,actor);
}
