import type {AuthenticatedOperator} from '../identity';
import {salesCanRead,salesFieldAllowed} from './record-access';
import {salesProfile} from './policy';
import {AccessService} from '../access/service';
import {deny} from '../access/errors';
/** Customer operations keep their native reviews; this check supplies current sales authority. */
export async function salesWorkbenchAllowed(db:D1Database,operator:AuthenticatedOperator,request:Request){
 const path=new URL(request.url).pathname,profile=await salesProfile(db,operator.operatorId);if(!profile)return false;
 if(!path.startsWith('/api/v1/workbench/'))return false;
 const mutate=!['GET','HEAD'].includes(request.method);if(mutate&&profile.role==='read-only')deny('This sales role is read only.');
 const direct=/\/opportunities\/([0-9A-HJKMNP-TV-Z]{26})(?:\/|$)/.exec(path),draft=/\/drafts\/([0-9A-HJKMNP-TV-Z]{26})(?:\/|$)/.exec(path),message=/\/messages\/([0-9A-HJKMNP-TV-Z]{26})(?:\/|$)/.exec(path),recommendation=/\/recommendations\/([0-9A-HJKMNP-TV-Z]{26})(?:\/|$)/.exec(path),record=/\/records\/(contact|company|opportunity)\/([0-9A-HJKMNP-TV-Z]{26})(?:\/|$)/.exec(path);
 let deal=direct?.[1],contact:string|undefined;
 if(draft){const row=await db.prepare('SELECT opportunity_id,recipient_contact_id FROM drafts WHERE id=?').bind(draft[1]).first<{opportunity_id:string|null;recipient_contact_id:string|null}>();if(!row)deny('Draft is unavailable.');deal=row.opportunity_id??undefined;contact=row.recipient_contact_id??undefined;}
 if(message){const row=await db.prepare('SELECT opportunity_id,contact_id FROM outbound_messages WHERE id=?').bind(message[1]).first<{opportunity_id:string|null;contact_id:string|null}>();if(!row)deny('Message is unavailable.');deal=row.opportunity_id??undefined;contact=row.contact_id??undefined;}
 if(recommendation){const row=await db.prepare('SELECT opportunity_id FROM recommendations WHERE id=?').bind(recommendation[1]).first<{opportunity_id:string}>();if(!row)deny('Recommendation is unavailable.');deal=row.opportunity_id;}
 if(!deal&&!record)return false;
 if(mutate&&request.headers.get('content-type')?.includes('application/json')){const body=await request.clone().json() as Record<string,unknown>;for(const key of ['contactId','recipientContactId'])if(typeof body[key]==='string'&&!await salesCanRead(db,operator.operatorId,'contact',body[key] as string,['email']))deny('The selected contact is outside your sales access.');}
 const mail=Boolean(draft||message||path.endsWith('/messages')||path.includes('/mail')||path.endsWith('/drafts'));
 if(mail&&!salesFieldAllowed(profile,'mail'))deny('Mail field permission is required.');
 if(deal&&!await salesCanRead(db,operator.operatorId,'opportunity',deal,mail?['mail']:[]))deny('This deal is outside your sales access.');
 if(record&&!await salesCanRead(db,operator.operatorId,record[1],record[2],mail?['mail']:[]))deny('This record is outside your sales access.');
 if(contact&&!await salesCanRead(db,operator.operatorId,'contact',contact,['email']))deny('The recipient is outside your sales access.');
 if(deal){const related=await db.prepare('SELECT company_id FROM opportunities WHERE id=?').bind(deal).first<{company_id:string|null}>();if(related?.company_id&&!await salesCanRead(db,operator.operatorId,'company',related.company_id))deny('The account is outside your sales access.');const contacts=(await db.prepare('SELECT contact_id FROM opportunity_contacts WHERE opportunity_id=?').bind(deal).all<{contact_id:string}>()).results;for(const person of contacts)if(!await salesCanRead(db,operator.operatorId,'contact',person.contact_id,mail?['email']:[]))deny('A deal participant is outside your sales access.');}
 if(mutate){const access=new AccessService(db),scope=await access.originalWorkspace(),actor=await access.resolveOperatorContext(operator,scope.workspaceId,crypto.randomUUID());await access.authorize(actor,'graph.update',{...actor,type:record?.[1]??'opportunity',id:record?.[2]??deal!},mail?['mail']:[]);}
 return true;
}
