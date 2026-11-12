import {billingConnection} from './connection';
import {BillingError} from './contracts';

export async function billingTimeline(db:D1Database,kind:'company'|'opportunity',id:string){
 if(!await db.prepare(`SELECT 1 FROM ${kind==='company'?'companies':'opportunities'} WHERE id=?`).bind(id).first())throw new BillingError(404,'Billing record not found.');
 const mapping=await db.prepare(`SELECT customer_id AS customerId,name,email,domain,company_id AS companyId,opportunity_id AS opportunityId,reviewed_at AS reviewedAt FROM billing_mappings WHERE ${kind==='company'?'company_id':'opportunity_id'}=?`).bind(id).first<{customerId:string;name:string;email:string;domain:string;companyId:string;opportunityId:string;reviewedAt:string}>();
 const timeline=mapping?(await db.prepare('SELECT id,event_type AS eventType,state,currency,amount_cents AS amountCents,occurred_at AS occurredAt,received_at AS receivedAt FROM billing_events WHERE customer_id=? ORDER BY source_created DESC,received_at DESC,id DESC').bind(mapping.customerId).all<{id:string;eventType:string;state:string;currency:string;amountCents:number;occurredAt:string;receivedAt:string}>()).results:[];
 return{...await billingConnection(db),mapping,timeline,currentState:timeline[0]?.state??null};
}
export async function unlinkedBilling(db:D1Database){return{events:(await db.prepare('SELECT e.id,e.customer_id AS customerId,e.event_type AS eventType,e.state,e.currency,e.amount_cents AS amountCents,e.occurred_at AS occurredAt,e.received_at AS receivedAt FROM billing_events e WHERE NOT EXISTS(SELECT 1 FROM billing_mappings m WHERE m.customer_id=e.customer_id) ORDER BY source_created DESC,id DESC LIMIT 100').all()).results};}
