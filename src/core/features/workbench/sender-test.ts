import {Hono} from 'hono';
import {z} from 'zod';
import type {AuthenticatedOperator} from '../identity';
import type {OutboundMail} from '../../platform/outbound-mail';

export const senderTestSubject='Orbit sender check';
export const senderTestBody='Your Orbit customer mail sender is working. This is the test email you approved in Settings. No customer was contacted.';
/** A test belongs to the installation that sent it. Archives carry audit entries, never this identity, so a restored test is not this installation's. */
const installationId="(SELECT id FROM delegation_installation)";
export const senderTestedHere=`json_extract(details_json,'$.state')='received' AND (json_extract(details_json,'$.installation')=${installationId} OR (json_extract(details_json,'$.installation') IS NULL AND NOT EXISTS(SELECT 1 FROM audit_entries restored WHERE restored.action='data.restored')))`;

/** Explicitly approved mail to the operator only; every attempt is claimed before contacting the provider. */
export function senderTestRoutes(db:D1Database,mail?:OutboundMail){
 const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>();
 app.get('/',c=>c.json({recipient:c.get('operator').email,subject:senderTestSubject,body:senderTestBody}));
 app.post('/',async c=>{
  if(!mail)return c.json({error:'Save the mail settings and restart or redeploy Orbit, then check the configuration again.'},503);
  const input=z.object({attemptId:z.uuid(),confirmed:z.literal(true)}).strict().safeParse(await c.req.json());
  if(!input.success)return c.json({error:'Review the test email and approve this attempt.'},400);
  const actor=c.get('operator'),id=`sender-test:${input.data.attemptId}`,at=new Date().toISOString();
  const recent=await db.prepare("SELECT COUNT(*) AS n FROM audit_entries WHERE actor_id=? AND action='mail.sender_test' AND occurred_at>?").bind(actor.operatorId,new Date(Date.now()-60000).toISOString()).first<{n:number}>();
  if((recent?.n??0)>=1)return c.json({error:'A test was attempted in the last minute. Check your mailbox before sending another.'},429);
  const claim=await db.prepare(`INSERT INTO audit_entries(id,actor_id,action,entity_type,entity_id,details_json,occurred_at) VALUES(?,?,'mail.sender_test','operator',?,json_object('state','attempted','installation',${installationId}),?) ON CONFLICT(id) DO NOTHING`).bind(id,actor.operatorId,actor.operatorId,at).run();
  if(!claim.meta.changes)return c.json({error:'This test was already attempted. Check your mailbox; Orbit has not sent it again.'},409);
  try{
   await mail.send({id,recipient_email:actor.email,subject:senderTestSubject,body:senderTestBody,idempotency_key:id});
   await db.prepare("UPDATE audit_entries SET details_json=json_set(details_json,'$.state','accepted') WHERE id=?").bind(id).run();
   return c.json({accepted:true,recipient:actor.email});
  }catch{
   return c.json({error:'SendGrid did not confirm acceptance. Check your mailbox and SendGrid Activity before trying again; this attempt will not be repeated automatically.'},502);
  }
 });
 // Only the operator can say the test arrived: SendGrid's acceptance is not delivery.
 app.post('/received',async c=>{
  const input=z.object({attemptId:z.uuid()}).strict().safeParse(await c.req.json());
  if(!input.success)return c.json({error:'Choose the test you received.'},400);
  const marked=await db.prepare(`UPDATE audit_entries SET details_json=json_set(details_json,'$.state','received') WHERE id=? AND actor_id=? AND action='mail.sender_test' AND json_extract(details_json,'$.state') IN('accepted','received') AND json_extract(details_json,'$.installation')=${installationId}`).bind(`sender-test:${input.data.attemptId}`,c.get('operator').operatorId).run();
  if(!marked.meta.changes)return c.json({error:'SendGrid has not accepted this test, so it cannot have arrived. Send a test first.'},409);
  return c.json({received:true});
 });
 return app;
}
