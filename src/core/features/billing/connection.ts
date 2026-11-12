import {audit} from '../records/shared';
import {BillingError,type BillingConfig,type BillingSecrets} from './contracts';
import {stripeRead} from './provider';
import {billingAuthorityFence} from './authority';

export async function billingConnection(db:D1Database){
 const row=await db.prepare("SELECT c.checked_at,c.connected_at,c.last_event_at,c.disconnected_at,EXISTS(SELECT 1 FROM billing_credentials WHERE id='stripe') AS held FROM billing_connection c WHERE c.id='stripe'").first<{checked_at:string;connected_at:string;last_event_at:string|null;disconnected_at:string|null;held:number}>();
 return{state:row?.held?'connected' as const:row&&!row.disconnected_at?'paused' as const:'disconnected' as const,checkedAt:row?.checked_at??null,lastEventAt:row?.last_event_at??null,reason:row?.held?null:row&&!row.disconnected_at?'Stripe is paused. The installation owner must reconnect with fresh test credentials.':'Connect Stripe test mode in Settings to receive billing evidence.'};
}
export async function billingSecrets(db:D1Database,config:BillingConfig){
 if(!config.security)throw new BillingError(503,'Stripe needs the installation encryption key.');
 const row=await db.prepare("SELECT sealed FROM billing_credentials WHERE id='stripe'").first<{sealed:string}>();
 if(!row)throw new BillingError(409,'Stripe is paused or disconnected. Ask the installation owner to reconnect in Settings.');
 try{return {secrets:JSON.parse(await config.security.open(row.sealed)) as BillingSecrets,sealed:row.sealed};}
 catch{throw new BillingError(409,'Stripe credentials cannot be opened here. Reconnect in Settings.');}
}
export async function connectStripe(db:D1Database,config:BillingConfig,apiKey:string,webhookSecret:string,actor:string){
 if(!config.security)throw new BillingError(503,'Stripe needs the installation encryption key.');
 if(!apiKey.startsWith('rk_test_'))throw new BillingError(400,'Use a restricted Stripe test key with Customers read permission.');
 const result=await stripeRead(config,apiKey,'customers?limit=1') as {object?:unknown;data?:{livemode?:unknown}[]};
 if(result?.object!=='list'||!Array.isArray(result.data)||result.data.some(customer=>customer.livemode!==false))throw new BillingError(409,'Stripe did not confirm test customer access.');
 const now=new Date().toISOString(),sealed=await config.security.seal(JSON.stringify({apiKey,webhookSecret,generation:crypto.randomUUID()} satisfies BillingSecrets));
 await db.batch([...billingAuthorityFence(db,actor,true),db.prepare("INSERT INTO billing_connection(id,connected_at,checked_at) VALUES('stripe',?,?) ON CONFLICT(id) DO UPDATE SET checked_at=excluded.checked_at,connected_at=excluded.connected_at,disconnected_at=NULL").bind(now,now),db.prepare("INSERT INTO billing_credentials VALUES('stripe',?) ON CONFLICT(id) DO UPDATE SET sealed=excluded.sealed").bind(sealed),audit(db,actor,'stripe.connected','billing','stripe')]);
}
export async function disconnectStripe(db:D1Database,actor:string){await db.batch([...billingAuthorityFence(db,actor,true),db.prepare("DELETE FROM billing_credentials WHERE id='stripe'"),db.prepare("UPDATE billing_connection SET disconnected_at=? WHERE id='stripe'").bind(new Date().toISOString()),audit(db,actor,'stripe.disconnected','billing','stripe')]);}
