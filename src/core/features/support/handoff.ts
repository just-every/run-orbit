import {payloadHash} from '../../platform/source-security';
import {guard,refused} from '../identity/store';
import {audit} from '../records/shared';
import {company,authorityGuard,endGuard} from './authority';
import {connectionGuard,openConnection,providerCall,stillConnected} from './connection';
import {mapping,mappingGuard} from './mapping';
import {SupportError,now,ticketLink,type Actor,type SupportConfig,type Ticket} from './contracts';
import {ZendeskFailure} from './provider';
import {ticketSummary} from './tickets';
import {contextFields,type HandoffInput} from './contracts';
export async function handoffPlan(db:D1Database,config:SupportConfig,actor:Actor,companyId:string,input:HandoffInput){
 const record=await company(db,actor,companyId),connection=await openConnection(db,config),mapped=await mapping(db,companyId,connection);
 // Zendesk permits an organization only when the requester belongs to it.
 const {user}=await providerCall<{user:{id:number;active:boolean;suspended?:boolean}}>(db,config,connection,`/api/v2/users/${input.requesterId}.json`);
 const {organization_memberships}=await providerCall<{organization_memberships:{user_id:number;organization_id:number}[]}>(db,config,connection,`/api/v2/users/${input.requesterId}/organization_memberships.json`);
 if(!user?.active||user.suspended||String(user.id)!==input.requesterId||!Array.isArray(organization_memberships)||!organization_memberships.some(member=>String(member.user_id)===input.requesterId&&String(member.organization_id)===mapped.organization_id))throw new SupportError(409,'Choose an active Zendesk requester who belongs to this mapped organization. Nothing was handed off.');
 const fields=contextFields.filter(field=>input.fields.includes(field));
 let contact:{id:string;name:string|null;company_id:string|null}|null=null;
 if(fields.includes('contactName')){
  if(!input.contactId)throw new SupportError(400,'Choose the company contact whose name to include.');
  contact=await db.prepare('SELECT id,name,company_id FROM contacts WHERE id=? AND company_id=?').bind(input.contactId,companyId).first();
  if(!contact?.name)throw new SupportError(409,'The chosen contact is unavailable or no longer belongs to this company.');
 }else if(input.contactId)throw new SupportError(400,'A contact can be included only when its name is selected.');
 const context=fields.flatMap(field=>field==='companyName'?[`Company: ${record.name}`]:field==='companyDomain'&&record.primary_domain?[`Domain: ${record.primary_domain}`]:field==='contactName'?[`Contact: ${contact!.name}`]:[]).join('\n');
 if(!context)throw new SupportError(400,'Choose at least one available context field.');
 const ticket={requester_id:Number(input.requesterId),organization_id:Number(mapped.organization_id),subject:input.title,comment:{body:context,public:false}};
 const reviewed={companyId,contactId:contact?.id??null,fields,ticket,generation:connection.installation.generation,organizationId:mapped.organization_id,subdomain:mapped.subdomain};
 await company(db,actor,companyId);
 return{...reviewed,digest:await payloadHash(JSON.stringify(reviewed)),connection,mapped,record,contact};
}
export async function handoff(db:D1Database,config:SupportConfig,actor:Actor,companyId:string,input:HandoffInput&{digest:string;operationId:string}){
 await company(db,actor,companyId);const currentConnection=await openConnection(db,config);await mapping(db,companyId,currentConnection);
 const previous=await db.prepare('SELECT * FROM support_handoffs WHERE id=?').bind(input.operationId).first<{company_id:string|null;actor_id:string;review_hash:string;state:string;ticket_id:string|null;subdomain:string}>();
 if(previous){if(previous.company_id!==companyId||previous.actor_id!==actor.operatorId||previous.review_hash!==input.digest||previous.state==='redacted')throw new SupportError(409,'This operation was already used for a different review or is no longer available.');return{state:previous.state,ticketId:previous.ticket_id,link:previous.ticket_id?ticketLink(previous.subdomain,previous.ticket_id):null,replayed:true};}
 const plan=await handoffPlan(db,config,actor,companyId,input);
 if(plan.digest!==input.digest)throw new SupportError(409,'The chosen context or connection changed. Preview the handoff again.');
 try{await db.batch([authorityGuard(db,actor),connectionGuard(db,plan.connection),mappingGuard(db,plan.mapped),guard(db,{sql:'EXISTS(SELECT 1 FROM companies WHERE id=? AND name=? AND primary_domain IS ?)',args:[companyId,plan.record.name,plan.record.primary_domain??null]}),...(plan.contact?[guard(db,{sql:'EXISTS(SELECT 1 FROM contacts WHERE id=? AND name=? AND company_id=?)',args:[plan.contact.id,plan.contact.name,companyId]})]:[]),db.prepare("INSERT INTO support_handoffs(id,company_id,contact_id,subdomain,organization_id,generation,review_hash,state,ticket_id,actor_id,created_at,outcome_at,timeline_id) VALUES(?,?,?,?,?,?,?,'submitting',NULL,?,?,NULL,NULL)").bind(input.operationId,companyId,plan.contactId,plan.subdomain,plan.organizationId,plan.generation,plan.digest,actor.operatorId,now(config).toISOString()),audit(db,actor.operatorId,'zendesk.handoff-reviewed','company',companyId,{operationId:input.operationId,fields:plan.fields}),endGuard(db)]);}catch(error){if(refused(error))throw new SupportError(409,'Handoff or access changed. No second ticket was attempted.');throw error;}
 try{
  // Reservation precedes the single external attempt. No automatic resend after uncertainty.
  const {ticket}=await providerCall<{ticket:Ticket}>(db,config,plan.connection,'/api/v2/tickets.json',{ticket:plan.ticket});
  if(!Number.isSafeInteger(ticket?.id)||ticket.id<1)throw new ZendeskFailure(0);
  ticketSummary(ticket,plan.subdomain,String(ticket.id),plan.organizationId);
  // Retain a provider receipt even if erasure raced the external request, without restoring context.
  await db.prepare("UPDATE support_handoffs SET ticket_id=?,state=CASE WHEN state='redacted' THEN state ELSE 'created' END WHERE id=? AND state IN('submitting','redacted')").bind(String(ticket.id),input.operationId).run();
  await company(db,actor,companyId);await stillConnected(db,plan.connection);
  return{state:'created',ticketId:String(ticket.id),link:ticketLink(plan.subdomain,String(ticket.id)),replayed:false};
 }catch(error){await db.prepare("UPDATE support_handoffs SET state=? WHERE id=? AND state='submitting'").bind(error instanceof ZendeskFailure&&error.status>=400&&error.status<500?'failed':'uncertain',input.operationId).run();if(error instanceof SupportError)throw error;throw new SupportError(502,'Zendesk did not confirm the handoff. Inspect Zendesk before creating a new operation; Orbit will not resend this one.');}
}
