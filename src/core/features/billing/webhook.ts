import {Hono} from 'hono';
import {z} from 'zod';
import {boundedRequestBody,RequestBodyTooLarge} from '../../platform/bounded-request-body';
import {payloadHash} from '../../platform/source-security';
import {billingSecrets} from './connection';
import {BillingError,identityId,type BillingConfig} from './contracts';

const reference=z.union([z.string().regex(identityId),z.object({id:z.string().regex(identityId)})]).transform(value=>typeof value==='string'?value:value.id);
const eventSchema=z.object({id:z.string().regex(identityId),type:z.enum(['invoice.paid','invoice.payment_failed','invoice.overdue','invoice.voided','charge.refunded']),livemode:z.literal(false),created:z.number().int().nonnegative().max(8640000000000),data:z.object({object:z.object({id:z.string().regex(identityId),customer:reference,currency:z.string(),status:z.string().optional(),amount_paid:z.number().int().nonnegative().safe().optional(),amount_due:z.number().int().nonnegative().safe().optional(),amount_refunded:z.number().int().nonnegative().safe().optional()})})});
const rank=(state:string)=>({ 'past-due':1,paid:2,refunded:3,voided:4 }[state]??0);

export function stripeWebhookRoutes(db:D1Database,config:BillingConfig){
 const app=new Hono();
 app.onError((error,c)=>c.json({error:error instanceof BillingError?error.message:'Stripe billing persistence failed. Replay the same event.'},error instanceof BillingError?error.status:503));
 app.post('/',async c=>{
  const {secrets,sealed}=await billingSecrets(db,config);
  let raw:string;try{raw=new TextDecoder('utf-8',{fatal:true}).decode(await boundedRequestBody(c.req.raw,262144));}catch(error){throw new BillingError(error instanceof RequestBodyTooLarge?413:400,'Stripe events must be valid UTF-8 and at most 262144 bytes.');}
  const parts=(c.req.header('Stripe-Signature')??'').split(',').map(part=>part.trim().split('=')),timestamps=parts.filter(part=>part[0]==='t');
  if(timestamps.length!==1)throw new BillingError(401,'Stripe signature is missing, invalid or expired.');
  const timestamp=timestamps[0]![1]??'';let verified=false;
  for(const part of parts.filter(part=>part[0]==='v1'))if(await config.security!.verify(secrets.webhookSecret,raw,timestamp,part[1]??'')){verified=true;break;}
  if(!verified)throw new BillingError(401,'Stripe signature is missing, invalid or expired.');
  let input:unknown;try{input=JSON.parse(raw);}catch{throw new BillingError(400,'Stripe event is not valid JSON.');}
  const parsed=eventSchema.safeParse(input);if(!parsed.success)throw new BillingError(400,'Use a supported Stripe test invoice or refund event.');
  const event=parsed.data,object=event.data.object;
  if(object.currency.toUpperCase()!=='USD'||event.created>Math.floor(Date.now()/1000))throw new BillingError(400,'Billing evidence requires USD and a non-future event time.');
  const state=event.type==='charge.refunded'?'refunded':event.type==='invoice.voided'||object.status==='void'?'voided':event.type==='invoice.paid'?'paid':'past-due';
  const amount=state==='refunded'?object.amount_refunded:state==='paid'?object.amount_paid:object.amount_due;
  if(amount===undefined)throw new BillingError(400,'Stripe event is missing its billing amount.');
  const customerHash=await payloadHash(object.customer);
  if(await db.prepare('SELECT 1 FROM billing_erased_customers WHERE customer_hash=?').bind(customerHash).first())return c.json({ignored:true});
  const existing=await db.prepare('SELECT customer_id,object_id,event_type,state,currency,amount_cents,source_created FROM billing_events WHERE id=?').bind(event.id).first<{customer_id:string;object_id:string;event_type:string;state:string;currency:string;amount_cents:number;source_created:number}>();
  if(existing){if(existing.customer_id!==object.customer||existing.object_id!==object.id||existing.event_type!==event.type||existing.state!==state||existing.currency!=='USD'||existing.amount_cents!==amount||existing.source_created!==event.created)throw new BillingError(409,'This Stripe event identity already has different billing evidence.');return c.json({replayed:true});}
  const latest=await db.prepare('SELECT source_created,state FROM billing_events WHERE customer_id=? ORDER BY source_created DESC,received_at DESC,id DESC LIMIT 1').bind(object.customer).first<{source_created:number;state:string}>();
  if(latest&&(latest.source_created>event.created||latest.source_created===event.created&&rank(latest.state)>=rank(state)))return c.json({ignored:true});
  const received=new Date().toISOString(),occurred=new Date(event.created*1000).toISOString();
  const [saved]=await db.batch([db.prepare("INSERT OR IGNORE INTO billing_events SELECT ?,?,?,?,?,?,'USD',?,?,?,? WHERE EXISTS(SELECT 1 FROM billing_credentials WHERE id='stripe' AND sealed=?) AND NOT EXISTS(SELECT 1 FROM billing_erased_customers WHERE customer_hash=?) AND NOT EXISTS(SELECT 1 FROM billing_events WHERE customer_id=? AND source_created>?)").bind(event.id,object.customer,customerHash,object.id,event.type,state,amount,occurred,event.created,received,sealed,customerHash,object.customer,event.created),db.prepare("UPDATE billing_connection SET last_event_at=? WHERE id='stripe' AND EXISTS(SELECT 1 FROM billing_events WHERE id=? AND received_at=?)").bind(received,event.id,received)]);
  return c.json({accepted:true,unlinked:!await db.prepare('SELECT 1 FROM billing_mappings WHERE customer_id=?').bind(object.customer).first()},saved?.meta.changes?201:200);
 });return app;
}
