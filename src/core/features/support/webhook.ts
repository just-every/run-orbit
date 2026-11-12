import {Hono} from 'hono';
import {z} from 'zod';
import {payloadHash} from '../../platform/source-security';
import {boundedRequestBody,RequestBodyTooLarge} from '../../platform/bounded-request-body';
import {guard,refused} from '../identity/store';
import {createId} from '../../shared/ids';
import {connectionGuard,openConnection,providerCall} from './connection';
import {mapping,mappingGuard} from './mapping';
import {verifyWebhook,ZendeskFailure} from './provider';
import {ticketSummary} from './tickets';
import {SupportError,now,type SupportConfig,type Ticket} from './contracts';
/** Configure a Zendesk ticket trigger to POST {"ticket_id":"{{ticket.id}}"}.
 * The callback is a wake-up signal; only the live API supplies an outcome. */
export function zendeskWebhookRoutes(db:D1Database,config:SupportConfig){const app=new Hono();
 app.onError((error,c)=>error instanceof SupportError?c.json({error:error.message},error.status):c.json({error:'Zendesk outcome could not be verified.'},503));
 app.post('/',async c=>{
  let raw:string;try{raw=new TextDecoder().decode(await boundedRequestBody(c.req.raw,16384));}catch(error){return c.json({error:'Webhook body unreadable or too large.'},error instanceof RequestBodyTooLarge?413:400);}
  const connection=await openConnection(db,config),timestamp=c.req.header('X-Zendesk-Webhook-Signature-Timestamp')??'',signature=c.req.header('X-Zendesk-Webhook-Signature')??'';
  if(!await verifyWebhook(connection.credentials.signingSecret,timestamp,raw,signature,now(config)))return c.json({error:'Invalid or stale Zendesk signature.'},401);
  const digest=await payloadHash(timestamp+raw);
  if(await db.prepare('SELECT 1 FROM support_webhooks WHERE digest=?').bind(digest).first())return c.json({error:'Zendesk delivery already received.'},409);
  let input;try{input=z.object({ticket_id:z.union([z.string().regex(/^[1-9]\d{0,15}$/),z.number().int().positive().safe()])}).strict().safeParse(JSON.parse(raw));}catch{return c.json({error:'Invalid Zendesk callback.'},400);}
  if(!input.success)return c.json({error:'Invalid Zendesk callback.'},400);
  const handoff=await db.prepare("SELECT * FROM support_handoffs WHERE ticket_id=? AND subdomain=? AND state='created' AND generation=? AND company_id IS NOT NULL").bind(String(input.data.ticket_id),connection.installation.subdomain,connection.installation.generation).first<{id:string;company_id:string;organization_id:string;outcome_at:string|null}>();
  if(!handoff)return c.json({error:'No current reviewed handoff is available.'},404);
  const mapped=await mapping(db,handoff.company_id,connection);
  let ticket:Ticket;try{({ticket}=await providerCall<{ticket:Ticket}>(db,config,connection,`/api/v2/tickets/${input.data.ticket_id}.json`));}catch(error){if(error instanceof ZendeskFailure)return c.json({error:'Zendesk ticket is unavailable.'},409);throw error;}
  const summary=ticketSummary(ticket,connection.installation.subdomain,String(input.data.ticket_id),handoff.organization_id);
  if(!['solved','closed'].includes(summary.status)){
   try{await db.batch([connectionGuard(db,connection),mappingGuard(db,mapped),db.prepare('INSERT INTO support_webhooks VALUES(?,?)').bind(digest,now(config).toISOString()),db.prepare('DELETE FROM identity_guards')]);}catch(error){if(refused(error))return c.json({error:'Zendesk delivery already received or authority changed.'},409);throw error;}
   return c.json({outcome:false});
  }
  const timelineId=createId(),at=now(config).toISOString();
  try{await db.batch([connectionGuard(db,connection),mappingGuard(db,mapped),guard(db,{sql:"EXISTS(SELECT 1 FROM support_handoffs h JOIN companies c ON c.id=h.company_id WHERE h.id=? AND h.state='created' AND h.outcome_at IS NULL AND h.generation=?)",args:[handoff.id,connection.installation.generation]}),db.prepare('INSERT INTO support_webhooks VALUES(?,?)').bind(digest,at),db.prepare("INSERT INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json) VALUES(?,'support.outcome',?,?,'system',NULL,'zendesk',?)").bind(timelineId,summary.lastUpdate,at,JSON.stringify({ticketId:summary.id,status:summary.status,severity:summary.severity,link:summary.link})),db.prepare("INSERT INTO timeline_entry_records VALUES(?,'company',?)").bind(timelineId,handoff.company_id),db.prepare('UPDATE support_handoffs SET outcome_at=?,timeline_id=? WHERE id=?').bind(at,timelineId,handoff.id),db.prepare('DELETE FROM identity_guards')]);}catch(error){if(refused(error))return c.json({error:'This outcome was already returned or its authority changed.'},409);throw error;}
  return c.json({outcome:true},201);
 });return app;
}
