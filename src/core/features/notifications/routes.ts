import { Hono } from 'hono';
import type { AuthenticatedOperator } from '../identity';
export function createNotificationRoutes(db:D1Database) {
 const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>();
 app.get('/',async c=>{
  const actor=c.get('operator').operatorId;
  const [items,count]=await Promise.all([
   db.prepare('SELECT n.id,COALESCE((SELECT l.href FROM record_owner_notification_links l WHERE l.notification_id=n.id ORDER BY l.kind,l.record_id LIMIT 1),(SELECT l.href FROM sales_task_notification_links l WHERE l.notification_id=n.id LIMIT 1)) AS href,(SELECT json_group_array(json_object(\'kind\',l.kind,\'id\',l.record_id,\'name\',l.name,\'previousOwnerName\',l.previous_owner_name,\'href\',l.href)) FROM record_owner_notification_links l WHERE l.notification_id=n.id) AS records_json,n.opportunity_id AS opportunityId,o.title AS opportunityTitle,n.kind,n.message,n.created_at AS createdAt,n.read_at AS readAt FROM notifications n LEFT JOIN opportunities o ON o.id=n.opportunity_id WHERE n.operator_id=? ORDER BY n.created_at DESC,n.id DESC LIMIT 100').bind(actor).all(),
   db.prepare('SELECT count(*) AS count FROM notifications WHERE operator_id=? AND read_at IS NULL').bind(actor).first<{count:number}>()
  ]);
  return c.json({notifications:items.results.map(({records_json,...item})=>({...item,records:typeof records_json==='string'?JSON.parse(records_json):[]})),unread:count?.count??0});
 });
 app.post('/:id/read',async c=>{
  const id=c.req.param('id');if(!/^[a-zA-Z0-9-]{1,64}$/.test(id))return c.json({error:'Invalid notification ID.'},400);
  const result=await db.prepare('UPDATE notifications SET read_at=COALESCE(read_at,?) WHERE id=? AND operator_id=?').bind(new Date().toISOString(),id,c.get('operator').operatorId).run();
  return result.meta.changes?c.json({read:true}):c.json({error:'Notification not found.'},404);
 });
 return app;
}
