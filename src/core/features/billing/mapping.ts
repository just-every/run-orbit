import {z} from 'zod';
import {audit} from '../records/shared';
import {payloadHash} from '../../platform/source-security';
import {billingSecrets} from './connection';
import {billingAuthorityFence} from './authority';
import {BillingError,identityId,type BillingConfig,type ReviewedIdentity} from './contracts';
import {stripeCustomer} from './provider';

export const mappingTarget=z.object({customerId:z.string().regex(identityId),companyId:z.string().regex(identityId),opportunityId:z.string().regex(identityId)}).strict();
export const mappingConfirmation=mappingTarget.extend({name:z.string().min(1).max(200),email:z.email().max(320),domain:z.string().min(1).max(253),reviewToken:z.string().min(1).max(8192)}).strict();
type Target=z.infer<typeof mappingTarget>;
interface Review {identity:ReviewedIdentity;contactId:string;targetHash:string;actor:string;generation:string;expires:number}
const normalized=(value:string)=>value.trim().toLowerCase().replace(/\s+/g,' ');

async function checkedIdentity(db:D1Database,config:BillingConfig,target:Target){
 const credentials=await billingSecrets(db,config),customerHash=await payloadHash(target.customerId);
 if(await db.prepare('SELECT 1 FROM billing_erased_customers WHERE customer_hash=?').bind(customerHash).first())throw new BillingError(409,'This customer mapping was erased and cannot be restored by a billing event.');
 const existing=await db.prepare('SELECT company_id,opportunity_id FROM billing_mappings WHERE customer_id=? OR company_id=? OR opportunity_id=?').bind(target.customerId,target.companyId,target.opportunityId).all<{company_id:string;opportunity_id:string}>();
 if(existing.results.some(row=>row.company_id!==target.companyId||row.opportunity_id!==target.opportunityId))throw new BillingError(409,'This Stripe customer, company or deal is already linked elsewhere.');
 const company=await db.prepare('SELECT id,name,primary_domain_key,updated_at FROM companies WHERE id=?').bind(target.companyId).first<{id:string;name:string;primary_domain_key:string|null;updated_at:string}>();
 const deal=await db.prepare('SELECT id,company_id,updated_at FROM opportunities WHERE id=?').bind(target.opportunityId).first<{id:string;company_id:string|null;updated_at:string}>();
 const workspace=await db.prepare("SELECT currency FROM workspace_settings WHERE id='workspace'").first<{currency:string}>();
 if(!company||!deal||deal.company_id!==company.id||workspace?.currency!=='USD')throw new BillingError(409,'Choose this company and one of its USD deals.');
 const identity=await stripeCustomer(config,credentials.secrets.apiKey,target.customerId);
 const contacts=(await db.prepare('SELECT c.id,c.name,c.email_key,c.company_id,c.updated_at FROM contacts c JOIN opportunity_contacts oc ON oc.contact_id=c.id WHERE oc.opportunity_id=?').bind(deal.id).all<{id:string;name:string|null;email_key:string|null;company_id:string|null;updated_at:string}>()).results;
 const contact=contacts.find(row=>row.email_key===identity.email&&row.company_id===company.id&&(normalized(identity.name)===normalized(row.name??'')||normalized(identity.name)===normalized(company.name)));
 if(!contact||company.primary_domain_key!==identity.domain)throw new BillingError(409,'The Stripe customer name, email and domain must match a contact on this deal and its company. Nothing was linked.');
 return{identity:{...identity,companyId:company.id,opportunityId:deal.id},contactId:contact.id,targetHash:await payloadHash(JSON.stringify({company,deal,contact})),customerHash,credentials};
}
export async function reviewMapping(db:D1Database,config:BillingConfig,target:Target,actor:string){
 const checked=await checkedIdentity(db,config,target),expires=Date.now()+600000;
 const token:Review={identity:checked.identity,contactId:checked.contactId,targetHash:checked.targetHash,actor,generation:checked.credentials.secrets.generation,expires};
 return{review:checked.identity,reviewToken:await config.security!.seal(JSON.stringify(token)),expiresAt:new Date(expires).toISOString()};
}
export async function linkMapping(db:D1Database,config:BillingConfig,input:z.infer<typeof mappingConfirmation>,actor:string){
 let review:Review;try{review=JSON.parse(await config.security!.open(input.reviewToken)) as Review;}catch{throw new BillingError(409,'Review the current Stripe customer identity before linking.');}
 const identity:ReviewedIdentity={customerId:input.customerId,name:input.name,email:input.email,domain:input.domain,companyId:input.companyId,opportunityId:input.opportunityId};
 if(review.actor!==actor||review.expires<Date.now()||JSON.stringify(review.identity)!==JSON.stringify(identity))throw new BillingError(409,'The reviewed identity changed or expired. Review it again; nothing was linked.');
 const checked=await checkedIdentity(db,config,{customerId:input.customerId,companyId:input.companyId,opportunityId:input.opportunityId});
 if(review.targetHash!==checked.targetHash||review.contactId!==checked.contactId||review.generation!==checked.credentials.secrets.generation||JSON.stringify(checked.identity)!==JSON.stringify(identity))throw new BillingError(409,'The customer, deal or connection changed after review. Review it again.');
 const existing=await db.prepare('SELECT 1 FROM billing_mappings WHERE customer_id=? AND company_id=? AND opportunity_id=?').bind(input.customerId,input.companyId,input.opportunityId).first();if(existing)return{linked:true};
 const now=new Date().toISOString();
 try{await db.batch([...billingAuthorityFence(db,actor),db.prepare("INSERT INTO billing_mappings(customer_id,customer_hash,company_id,opportunity_id,contact_id,name,email,domain,reviewed_at,reviewed_by) SELECT ?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM billing_credentials WHERE id='stripe' AND sealed=?) AND EXISTS(SELECT 1 FROM contacts WHERE id=? AND email_key=? AND company_id=?) AND EXISTS(SELECT 1 FROM opportunities WHERE id=? AND company_id=?) AND EXISTS(SELECT 1 FROM companies WHERE id=? AND primary_domain_key=?) AND NOT EXISTS(SELECT 1 FROM billing_erased_customers WHERE customer_hash=?)").bind(input.customerId,checked.customerHash,input.companyId,input.opportunityId,checked.contactId,input.name,input.email,input.domain,now,actor,checked.credentials.sealed,checked.contactId,input.email,input.companyId,input.opportunityId,input.companyId,input.companyId,input.domain,checked.customerHash),audit(db,actor,'stripe.customer-linked','billing',input.customerId,{companyId:input.companyId,opportunityId:input.opportunityId})]);}
 catch{throw new BillingError(409,'The customer or target is already linked or changed. Review again.');}
 if(!await db.prepare('SELECT 1 FROM billing_mappings WHERE customer_id=?').bind(input.customerId).first())throw new BillingError(409,'The target or connection changed. Review again.');
 return{linked:true};
}
