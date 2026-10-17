/**
 * Whether this installation learns what happened to each accepted message:
 * a SendGrid signed Event Webhook (SENDGRID_WEBHOOK_PUBLIC_KEY) or the Base
 * event relay (RER_MAIL_RELAY_SECRET). The last verified delivery event is kept
 * per installation in runtime_controls, which archives never carry.
 */
export interface DeliveryOutcomeKeys {eventKey?:string;relaySecret?:string}
const lastEvent='mail_events_verified_at';

export function deliveryOutcomesTracked(keys:DeliveryOutcomeKeys){return Boolean(keys.eventKey?.trim()||keys.relaySecret?.trim());}

export function recordVerifiedDeliveryEvent(db:D1Database,at=new Date().toISOString()){
 return db.prepare('INSERT INTO runtime_controls(name,value) VALUES(?,?) ON CONFLICT(name) DO UPDATE SET value=excluded.value').bind(lastEvent,at).run();
}

export async function deliveryOutcomesStatus(db:D1Database,keys:DeliveryOutcomeKeys,hosted:boolean,origin=''){
 const row=await db.prepare('SELECT value FROM runtime_controls WHERE name=?').bind(lastEvent).first<{value:string}>();
 return {
  hosted,
  connected:deliveryOutcomesTracked(keys),
  method:keys.eventKey?.trim()?'sendgrid':keys.relaySecret?.trim()?'relay':null,
  lastEventAt:row?.value??null,
  endpoint:`${origin}/api/v1/mail/events/sendgrid`,
 };
}
