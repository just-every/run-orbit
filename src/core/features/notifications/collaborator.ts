import { Hono } from 'hono';
import type { AuthenticatedOperator } from '../identity';
import { entriesGrantSql, readsEntries } from '../access/grant-entries';
import { mentionsOf } from '../records/mentions';
/** RECORD-023 (ct, 19 October): a collaborator's notifications are only their own mentions about a record they read now
 * through a live grant that includes its notes, calls and meetings. Losing that grant hides them (nothing is deleted)
 * and a new grant shows them again; no other operator's notification or count is ever read here. */
const targets=`WITH mention_targets AS MATERIALIZED(
 SELECT n.id AS nid,r.record_type AS kind,r.record_id AS rid,'entry-'||r.timeline_entry_id AS anchor FROM notifications n JOIN timeline_entry_records r ON r.timeline_entry_id=substr(n.event_key,15) WHERE n.operator_id=?1 AND n.kind='record.mention' AND n.event_key LIKE 'mention:entry:%' AND NOT EXISTS(SELECT 1 FROM entry_privacy p WHERE p.source='entry' AND p.entry_id=r.timeline_entry_id)
 UNION ALL SELECT n.id,t.record_type,COALESCE(t.contact_id,t.company_id,t.opportunity_id),'task-'||t.id FROM notifications n JOIN sales_tasks t ON t.id=substr(n.event_key,14) WHERE n.operator_id=?1 AND n.kind='record.mention' AND n.event_key LIKE 'mention:task:%' AND NOT EXISTS(SELECT 1 FROM entry_privacy p WHERE p.source='task' AND p.entry_id=t.id)
 UNION ALL SELECT n.id,'opportunity',h.opportunity_id,'handoff-'||h.id FROM notifications n JOIN handoff_tasks h ON h.id=substr(n.event_key,17) WHERE n.operator_id=?1 AND n.kind='record.mention' AND n.event_key LIKE 'mention:handoff:%' AND NOT EXISTS(SELECT 1 FROM entry_privacy p WHERE p.source='handoff' AND p.entry_id=h.id)),
visible AS(SELECT nid,min('/app/shared-records?kind='||kind||'&id='||rid||'#'||anchor) AS href FROM mention_targets WHERE ${entriesGrantSql('?1','mention_targets.kind','mention_targets.rid')} GROUP BY nid)`;
export function createCollaboratorNotificationRoutes(db:D1Database){
 const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>();
 app.get('/',async c=>{
  const actor=c.get('operator').operatorId;
  const [items,count]=await Promise.all([
   db.prepare(`${targets} SELECT n.id,v.href,NULL AS opportunityId,NULL AS opportunityTitle,n.kind,n.message,n.created_at AS createdAt,n.read_at AS readAt FROM notifications n JOIN visible v ON v.nid=n.id ORDER BY n.created_at DESC,n.id DESC LIMIT 100`).bind(actor).all(),
   db.prepare(`${targets} SELECT count(*) AS count FROM notifications n JOIN visible v ON v.nid=n.id WHERE n.read_at IS NULL`).bind(actor).first<{count:number}>()
  ]);
  return c.json({notifications:items.results,unread:count?.count??0});
 });
 app.post('/:id/read',async c=>{
  const id=c.req.param('id');if(!/^[a-zA-Z0-9-]{1,64}$/.test(id))return c.json({error:'Invalid notification ID.'},400);
  const result=await db.prepare(`${targets} UPDATE notifications SET read_at=COALESCE(read_at,?2) WHERE id=?3 AND operator_id=?1 AND id IN(SELECT nid FROM visible)`).bind(c.get('operator').operatorId,new Date().toISOString(),id).run();
  return result.meta.changes?c.json({read:true}):c.json({error:'Notification not found.'},404);
 });
 return app;
}
/** Notifications → Mentions for a collaborator: the mentions on records shared with them with entries, opening there. */
export async function collaboratorMentions(db:D1Database,operatorId:string){
 const mentions=await mentionsOf(db,operatorId),open=new Map<string,boolean>();
 for(const m of mentions){const key=`${m.recordType}:${m.recordId}`;if(!open.has(key))open.set(key,await readsEntries(db,operatorId,m.recordType,m.recordId));}
 return mentions.filter(m=>open.get(`${m.recordType}:${m.recordId}`)).map(m=>({...m,href:`/app/shared-records?kind=${m.recordType}&id=${m.recordId}#${m.source}-${m.id}`}));
}
