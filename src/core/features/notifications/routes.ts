import { mentionHrefSql } from '../records/mentions';
import { Hono } from 'hono';
import type { AuthenticatedOperator } from '../identity';
import {replyNotificationMatchSql} from './reply-events';
const recordMailContact="SELECT m.contact_id FROM record_mail_outbound_messages m WHERE n.event_key GLOB 'record-mail:'||m.id||':*'";
const replyContact=`SELECT l.record_id FROM signal_links l LEFT JOIN timeline_entries t ON t.id=l.signal_id WHERE l.record_type='contact' AND ${replyNotificationMatchSql} ORDER BY l.record_id LIMIT 1`;
const formContact="SELECT s.contact_id FROM marketing_form_submissions s WHERE n.kind='form.submitted' AND n.event_key='form:'||s.id";
const contactId=`COALESCE((${recordMailContact}),(${replyContact}),(${formContact}))`;
const assignmentTitle="SELECT CASE b.record_type WHEN 'contact' THEN (SELECT COALESCE(NULLIF(c.name,''),c.email) FROM contacts c WHERE c.id=i.record_id) WHEN 'company' THEN (SELECT c.name FROM companies c WHERE c.id=i.record_id) WHEN 'opportunity' THEN (SELECT o.title FROM opportunities o WHERE o.id=i.record_id) END FROM ownership_batches b JOIN ownership_batch_items i ON i.batch_id=b.id WHERE n.kind='record.assigned' AND n.event_key='ownership:'||b.id AND b.item_count=1 LIMIT 1";
export function createNotificationRoutes(db:D1Database) {
 const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>();
 app.get('/',async c=>{
  const actor=c.get('operator').operatorId;
  const [items,count]=await Promise.all([
   db.prepare(`SELECT n.id,COALESCE(CASE WHEN n.event_key LIKE 'import-ownership:%' THEN '/app/contacts' END,(SELECT '/app/contacts/'||c.id FROM contacts c WHERE c.id=${contactId}),(SELECT CASE b.record_type WHEN 'company' THEN '/app/companies' ELSE '/app/contacts' END||CASE WHEN b.item_count=1 THEN '/'||(SELECT record_id FROM ownership_batch_items WHERE batch_id=b.id LIMIT 1) ELSE '' END FROM ownership_batches b WHERE n.kind='record.assigned' AND n.event_key='ownership:'||b.id),(SELECT l.href FROM sales_task_notification_links l WHERE l.notification_id=n.id LIMIT 1),${mentionHrefSql}) AS href,n.opportunity_id AS opportunityId,o.title AS opportunityTitle,COALESCE(o.title,(SELECT COALESCE(NULLIF(c.name,''),c.email) FROM contacts c WHERE c.id=${contactId}),(${assignmentTitle})) AS recordTitle,n.kind,n.message,n.created_at AS createdAt,n.read_at AS readAt FROM notifications n LEFT JOIN opportunities o ON o.id=n.opportunity_id WHERE n.operator_id=? ORDER BY n.created_at DESC,n.id DESC LIMIT 100`).bind(actor).all(),
   db.prepare('SELECT count(*) AS count FROM notifications WHERE operator_id=? AND read_at IS NULL').bind(actor).first<{count:number}>()
  ]);
  return c.json({notifications:items.results,unread:count?.count??0});
 });
 app.post('/:id/read',async c=>{
  const id=c.req.param('id');if(!/^[a-zA-Z0-9-]{1,64}$/.test(id))return c.json({error:'Invalid notification ID.'},400);
  const result=await db.prepare('UPDATE notifications SET read_at=COALESCE(read_at,?) WHERE id=? AND operator_id=?').bind(new Date().toISOString(),id,c.get('operator').operatorId).run();
  return result.meta.changes?c.json({read:true}):c.json({error:'Notification not found.'},404);
 });
 return app;
}
